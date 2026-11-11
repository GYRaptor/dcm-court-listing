import express from "express";
import { z } from "zod";
import prisma from "../utils/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { todayIST, toDateOnly, addDays, formatDateString } from "../utils/dates.js";
import { calculatePriorityScore } from "../services/priority.service.js";

const router = express.Router();

const outcomeSchema = z.object({
  outcome: z.enum(["HEARD", "ADJOURNED", "DISPOSED"]),
  remarks: z.string().max(500).optional(),
});

// GET /hearings/mine
// Judge's own SCHEDULED hearings for today, with case and track details
router.get("/mine", requireAuth, requireRole("JUDGE"), async (req, res, next) => {
  try {
    const judgeProfile = await prisma.judge.findUnique({
      where: { userId: req.user.id },
    });

    if (!judgeProfile) {
      return res.status(404).json({ error: "Judge profile not found for this account" });
    }

    const todayDate = toDateOnly(todayIST());

    const hearings = await prisma.hearing.findMany({
      where: {
        judgeId: judgeProfile.id,
        hearingDate: todayDate,
      },
      include: {
        case: {
          include: {
            track: true,
            parties: true,
          },
        },
      },
      orderBy: {
        case: { priorityScore: "desc" },
      },
    });

    const formatted = hearings.map((h) => ({
      ...h,
      hearingDate: formatDateString(h.hearingDate),
      case: {
        ...h.case,
        filingDate: formatDateString(h.case.filingDate),
        targetDisposalDate: formatDateString(h.case.targetDisposalDate),
        earliestNextDate: formatDateString(h.case.earliestNextDate),
        disposedDate: formatDateString(h.case.disposedDate),
      },
    }));

    return res.json({ hearings: formatted, date: todayIST(), judge: judgeProfile });
  } catch (err) {
    next(err);
  }
});

// PATCH /hearings/:id/outcome
// Judge records the result of a hearing in one atomic transaction
router.patch("/:id/outcome", requireAuth, requireRole("JUDGE"), async (req, res, next) => {
  try {
    const { id } = req.params;
    const parseResult = outcomeSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.errors[0].message });
    }

    const { outcome, remarks } = parseResult.data;

    const hearing = await prisma.hearing.findUnique({
      where: { id },
      include: {
        case: { include: { track: true } },
        judge: true,
      },
    });

    if (!hearing) {
      return res.status(404).json({ error: "Hearing not found" });
    }

    // Ownership: a judge may only record outcomes for their own hearings
    if (hearing.judge.userId !== req.user.id) {
      return res.status(403).json({ error: "You can only record outcomes for your own hearings" });
    }

    if (hearing.outcome !== "SCHEDULED") {
      return res.status(409).json({
        error: `Outcome already recorded as ${hearing.outcome}. Cannot update a completed hearing.`,
      });
    }

    const hearingDateStr = formatDateString(hearing.hearingDate);
    const { case: caseRecord } = hearing;

    const updatedHearing = await prisma.$transaction(async (tx) => {
      // Update hearing outcome and optional judge remarks
      const recorded = await tx.hearing.update({
        where: { id },
        data: { outcome, remarks: remarks || null },
        include: {
          case: { include: { track: true } },
        },
      });

      let caseUpdate = {};

      if (outcome === "DISPOSED") {
        caseUpdate = {
          status: "DISPOSED",
          disposedDate: toDateOnly(hearingDateStr),
        };
      } else {
        // Both HEARD and ADJOURNED return the case to PENDING
        // earliestNextDate = hearingDate + track.gapDays (the statutory cooling gap)
        const nextEligibleDate = addDays(hearingDateStr, caseRecord.track.gapDays);
        const updatedAdjournmentCount =
          outcome === "ADJOURNED"
            ? caseRecord.adjournmentCount + 1
            : caseRecord.adjournmentCount;

        const freshPriority = calculatePriorityScore({
          filingDate: formatDateString(caseRecord.filingDate),
          targetDays: caseRecord.track.targetDays,
          isUrgent: caseRecord.isUrgent,
          adjournmentCount: updatedAdjournmentCount,
        });

        caseUpdate = {
          status: "PENDING",
          earliestNextDate: toDateOnly(nextEligibleDate),
          adjournmentCount: updatedAdjournmentCount,
          priorityScore: freshPriority,
        };
      }

      await tx.case.update({
        where: { id: caseRecord.id },
        data: caseUpdate,
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: "OUTCOME_RECORDED",
          caseId: caseRecord.id,
          details: JSON.stringify({
            hearingId: id,
            outcome,
            hearingDate: hearingDateStr,
            remarks: remarks || null,
            nextEligibleDate:
              outcome !== "DISPOSED"
                ? addDays(hearingDateStr, caseRecord.track.gapDays)
                : null,
          }),
        },
      });

      return recorded;
    });

    const nextEligibleDate =
      outcome !== "DISPOSED"
        ? addDays(hearingDateStr, caseRecord.track.gapDays)
        : null;

    return res.json({
      message: `Outcome recorded: ${outcome}`,
      hearing: {
        ...updatedHearing,
        hearingDate: formatDateString(updatedHearing.hearingDate),
        case: {
          ...updatedHearing.case,
          filingDate: formatDateString(updatedHearing.case.filingDate),
          targetDisposalDate: formatDateString(updatedHearing.case.targetDisposalDate),
          earliestNextDate: formatDateString(updatedHearing.case.earliestNextDate),
          disposedDate: formatDateString(updatedHearing.case.disposedDate),
        },
      },
      nextEligibleDate,
    });
  } catch (err) {
    next(err);
  }
});

// GET /hearings/case/:caseId
// Full hearing history for a case (Clerk + Judge can view)
router.get("/case/:caseId", requireAuth, requireRole("CLERK", "JUDGE"), async (req, res, next) => {
  try {
    const hearings = await prisma.hearing.findMany({
      where: { caseId: req.params.caseId },
      include: {
        judge: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
      orderBy: { hearingDate: "desc" },
    });

    const formatted = hearings.map((h) => ({
      ...h,
      hearingDate: formatDateString(h.hearingDate),
    }));

    return res.json({ hearings: formatted });
  } catch (err) {
    next(err);
  }
});

export default router;

