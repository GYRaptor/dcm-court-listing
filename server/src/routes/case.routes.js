import express from "express";
import prisma from "../utils/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { createCaseSchema, trackActionSchema } from "../schemas/case.schema.js";
import { calculateComplexity } from "../services/complexity.service.js";
import { suggestTrack } from "../services/track.service.js";
import { generateCaseNumber } from "../services/caseNumber.service.js";
import { todayIST, toDateOnly, addDays, formatDateString } from "../utils/dates.js";

const router = express.Router();

// Helper to format case date attributes to YYYY-MM-DD strings for clean JSON responses
function formatCaseDates(c) {
  if (!c) return null;
  return {
    ...c,
    filingDate: formatDateString(c.filingDate),
    targetDisposalDate: formatDateString(c.targetDisposalDate),
    earliestNextDate: formatDateString(c.earliestNextDate),
    disposedDate: formatDateString(c.disposedDate),
  };
}

// POST /cases
// CLERK only: registers a new case, creates parties, suggests track, and logs audit entry
router.post("/", requireAuth, requireRole("CLERK"), async (req, res, next) => {
  try {
    const parseResult = createCaseSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.errors[0].message,
      });
    }

    const data = parseResult.data;
    const filingDateStr = data.filingDate || todayIST();

    // Execute in a single atomic transaction:
    // 1. Calculate complexity & determine track from DB
    // 2. Generate sequential case number
    // 3. Insert Case + Parties
    // 4. Create AuditLog entry
    const newCase = await prisma.$transaction(async (tx) => {
      const complexity = calculateComplexity(
        data.caseType,
        data.parties.length,
        data.hasExpertEvidence
      );

      const track = await suggestTrack(complexity, tx);
      const filingYear = parseInt(filingDateStr.slice(0, 4), 10) || new Date().getUTCFullYear();
      const caseNumber = await generateCaseNumber(tx, filingYear);
      const targetDisposalDateStr = addDays(filingDateStr, track.targetDays);
      const earliestNextDateStr = todayIST();

      const created = await tx.case.create({
        data: {
          caseNumber,
          title: data.title,
          caseType: data.caseType,
          filingDate: toDateOnly(filingDateStr),
          hasExpertEvidence: data.hasExpertEvidence,
          isUrgent: data.isUrgent,
          complexity,
          suggestedTrackId: track.id,
          trackId: track.id,
          trackApproved: false,
          status: "PENDING",
          priorityScore: 0,
          targetDisposalDate: toDateOnly(targetDisposalDateStr),
          earliestNextDate: toDateOnly(earliestNextDateStr),
          parties: {
            create: data.parties.map((p) => ({
              name: p.name,
              role: p.role,
            })),
          },
        },
        include: {
          track: true,
          suggestedTrack: true,
          parties: true,
        },
      });

      // Write immutable audit trail entry
      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: "CASE_REGISTERED",
          caseId: created.id,
          details: JSON.stringify({
            caseNumber: created.caseNumber,
            complexity,
            suggestedTrack: track.name,
            targetDays: track.targetDays,
          }),
        },
      });

      return created;
    });

    return res.status(201).json({
      message: "Case registered successfully",
      case: formatCaseDates(newCase),
    });
  } catch (err) {
    next(err);
  }
});

// GET /cases
// CLERK and JUDGE: retrieves filtered case list sorted newest first
router.get("/", requireAuth, requireRole("CLERK", "JUDGE"), async (req, res, next) => {
  try {
    const { track, status, approved } = req.query;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (approved !== undefined && approved !== "") {
      where.trackApproved = approved === "true";
    }

    if (track) {
      // Allow filtering by track name (FAST, STANDARD, COMPLEX) or direct trackId
      where.track = {
        OR: [{ name: track.toUpperCase() }, { id: track }],
      };
    }

    const cases = await prisma.case.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        track: true,
        suggestedTrack: true,
        judge: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        parties: true,
      },
    });

    return res.status(200).json({
      cases: cases.map(formatCaseDates),
    });
  } catch (err) {
    next(err);
  }
});

// GET /cases/tracks
// Returns configured DCFM tracks for filter and override dropdowns
router.get("/tracks", requireAuth, async (req, res, next) => {
  try {
    const tracks = await prisma.track.findMany({
      orderBy: { targetDays: "asc" },
    });
    return res.status(200).json({ tracks });
  } catch (err) {
    next(err);
  }
});

// GET /cases/:id
// CLERK and JUDGE: full case dossier with parties, tracks, approval status, and hearings
router.get("/:id", requireAuth, requireRole("CLERK", "JUDGE"), async (req, res, next) => {
  try {
    const { id } = req.params;

    const caseRecord = await prisma.case.findUnique({
      where: { id },
      include: {
        track: true,
        suggestedTrack: true,
        trackApprovedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        judge: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        parties: true,
        hearings: {
          orderBy: { hearingDate: "asc" },
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });

    if (!caseRecord) {
      return res.status(404).json({ error: "Case not found" });
    }

    return res.status(200).json({
      case: formatCaseDates(caseRecord),
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /cases/:id/track
// JUDGE only: judicial review to approve or override recommended track with mandatory reason
router.patch("/:id/track", requireAuth, requireRole("JUDGE"), async (req, res, next) => {
  try {
    const { id } = req.params;

    const parseResult = trackActionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.errors[0].message,
      });
    }

    const { action, trackId, reason } = parseResult.data;

    const updatedCase = await prisma.$transaction(async (tx) => {
      const caseRecord = await tx.case.findUnique({
        where: { id },
        include: { track: true, suggestedTrack: true },
      });

      if (!caseRecord) {
        throw Object.assign(new Error("Case not found"), { status: 404 });
      }

      if (caseRecord.status === "DISPOSED") {
        throw Object.assign(new Error("Cannot modify track for a DISPOSED case"), {
          status: 400,
        });
      }

      if (action === "APPROVE") {
        const approved = await tx.case.update({
          where: { id },
          data: {
            trackApproved: true,
            trackApprovedById: req.user.id,
          },
          include: {
            track: true,
            suggestedTrack: true,
            trackApprovedBy: { select: { id: true, name: true } },
            parties: true,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            action: "TRACK_APPROVED",
            caseId: id,
            details: JSON.stringify({
              approvedTrack: caseRecord.track.name,
              judgeName: req.user.name,
            }),
          },
        });

        return approved;
      }

      // action === "OVERRIDE"
      if (trackId === caseRecord.trackId) {
        throw Object.assign(
          new Error("Cannot override to the same track that is already assigned"),
          { status: 400 }
        );
      }

      const newTrack = await tx.track.findUnique({
        where: { id: trackId },
      });

      if (!newTrack) {
        throw Object.assign(new Error("Target track not found in registry"), {
          status: 400,
        });
      }

      // Recalculate targetDisposalDate using filingDate and new track's targetDays
      const filingDateStr = formatDateString(caseRecord.filingDate);
      const newTargetDisposalDateStr = addDays(filingDateStr, newTrack.targetDays);

      const overridden = await tx.case.update({
        where: { id },
        data: {
          trackId: newTrack.id,
          trackApproved: true,
          trackApprovedById: req.user.id,
          trackOverrideReason: reason,
          targetDisposalDate: toDateOnly(newTargetDisposalDateStr),
        },
        include: {
          track: true,
          suggestedTrack: true,
          trackApprovedBy: { select: { id: true, name: true } },
          parties: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: "TRACK_OVERRIDDEN",
          caseId: id,
          details: JSON.stringify({
            oldTrack: caseRecord.track.name,
            newTrack: newTrack.name,
            reason,
            judgeName: req.user.name,
          }),
        },
      });

      return overridden;
    });

    return res.status(200).json({
      message: `Track successfully ${action === "APPROVE" ? "approved" : "overridden"}`,
      case: formatCaseDates(updatedCase),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
