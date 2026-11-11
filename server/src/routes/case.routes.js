import express from "express";
import prisma from "../utils/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { createCaseSchema, trackActionSchema } from "../schemas/case.schema.js";
import { calculateComplexity } from "../services/complexity.service.js";
import { suggestTrack } from "../services/track.service.js";
import { generateCaseNumber } from "../services/caseNumber.service.js";
import { assignJudgeGreedy } from "../services/judge.service.js";
import {
  calculatePriorityScore,
  isCaseOverdue,
  isCaseAging,
} from "../services/priority.service.js";
import { todayIST, toDateOnly, addDays, formatDateString } from "../utils/dates.js";

const router = express.Router();

function formatCaseDates(c) {
  if (!c) return null;
  const filingStr = formatDateString(c.filingDate);
  const targetStr = formatDateString(c.targetDisposalDate);
  const earliestStr = formatDateString(c.earliestNextDate);
  const disposedStr = formatDateString(c.disposedDate);

  return {
    ...c,
    filingDate: filingStr,
    targetDisposalDate: targetStr,
    earliestNextDate: earliestStr,
    disposedDate: disposedStr,
    isOverdue: isCaseOverdue(targetStr, c.status),
    isAging: isCaseAging(filingStr, c.status),
    hearings: c.hearings?.map((h) => ({
      ...h,
      hearingDate: formatDateString(h.hearingDate),
    })),
  };
}

// POST /cases
// CLERK only: registers a new case, auto-assigns judge by workload, computes priority, logs audit entry
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

      // greedy load-balancing assignment across active judges
      const assignedJudgeId = await assignJudgeGreedy(tx);

      const priorityScore = calculatePriorityScore({
        filingDate: filingDateStr,
        targetDays: track.targetDays,
        isUrgent: data.isUrgent,
        adjournmentCount: 0,
        asOfDate: todayIST(),
      });

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
          priorityScore,
          judgeId: assignedJudgeId,
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
          judge: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          parties: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: "CASE_REGISTERED",
          caseId: created.id,
          details: JSON.stringify({
            caseNumber: created.caseNumber,
            complexity,
            suggestedTrack: track.name,
            priorityScore,
            assignedJudgeId,
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

// GET /cases/tracks
// Returns configured DCFM tracks for dropdowns and filters
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

// GET /cases/lookup/*
// Public & Advocate read-only search by case number (e.g. DCM/2026/0001)
// Wildcard pattern handles forward slashes in case identifiers seamlessly
router.get("/lookup/:caseNumber(*)", async (req, res, next) => {
  try {
    const rawParam = req.params.caseNumber || req.params[0] || "";
    const rawNumber = decodeURIComponent(rawParam).trim().toUpperCase();

    const caseRecord = await prisma.case.findFirst({
      where: {
        caseNumber: { equals: rawNumber, mode: "insensitive" },
      },
      include: {
        track: {
          select: { name: true, targetDays: true, gapDays: true },
        },
        parties: {
          select: { name: true, role: true },
        },
        hearings: {
          orderBy: { hearingDate: "asc" },
          select: { hearingDate: true, outcome: true },
        },
      },
    });

    if (!caseRecord) {
      return res.status(404).json({
        error: `No court matter found with case number '${rawNumber}'`,
      });
    }

    const filingStr = formatDateString(caseRecord.filingDate);
    const targetStr = formatDateString(caseRecord.targetDisposalDate);
    const earliestStr = formatDateString(caseRecord.earliestNextDate);

    // sanitized public docket without sensitive internal judicial remarks
    const publicDocket = {
      caseNumber: caseRecord.caseNumber,
      title: caseRecord.title,
      caseType: caseRecord.caseType,
      status: caseRecord.status,
      filingDate: filingStr,
      targetDisposalDate: targetStr,
      earliestNextDate: earliestStr,
      track: caseRecord.track,
      trackApproved: caseRecord.trackApproved,
      isOverdue: isCaseOverdue(targetStr, caseRecord.status),
      isAging: isCaseAging(filingStr, caseRecord.status),
      parties: caseRecord.parties,
      hearings: caseRecord.hearings.map((h) => ({
        hearingDate: formatDateString(h.hearingDate),
        outcome: h.outcome,
      })),
    };

    return res.status(200).json({ case: publicDocket });
  } catch (err) {
    next(err);
  }
});

// GET /cases
// CLERK and JUDGE: filtered case list sorted by priorityScore descending
router.get("/", requireAuth, requireRole("CLERK", "JUDGE"), async (req, res, next) => {
  try {
    const { track, status, approved, judgeId } = req.query;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (approved !== undefined && approved !== "") {
      where.trackApproved = approved === "true";
    }

    if (judgeId) {
      where.judgeId = judgeId;
    }

    if (track) {
      where.track = {
        OR: [{ name: track.toUpperCase() }, { id: track }],
      };
    }

    // prioritize urgent and aging matters at the top of the cause list
    const cases = await prisma.case.findMany({
      where,
      orderBy: { priorityScore: "desc" },
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
          include: {
            judge: {
              include: { user: { select: { id: true, name: true } } },
            },
          },
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

      const filingDateStr = formatDateString(caseRecord.filingDate);
      const newTargetDisposalDateStr = addDays(filingDateStr, newTrack.targetDays);

      // recompute priority score matching the new track's timeline
      const updatedPriorityScore = calculatePriorityScore({
        filingDate: filingDateStr,
        targetDays: newTrack.targetDays,
        isUrgent: caseRecord.isUrgent,
        adjournmentCount: caseRecord.adjournmentCount,
        asOfDate: todayIST(),
      });

      const overridden = await tx.case.update({
        where: { id },
        data: {
          trackId: newTrack.id,
          trackApproved: true,
          trackApprovedById: req.user.id,
          trackOverrideReason: reason,
          targetDisposalDate: toDateOnly(newTargetDisposalDateStr),
          priorityScore: updatedPriorityScore,
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
