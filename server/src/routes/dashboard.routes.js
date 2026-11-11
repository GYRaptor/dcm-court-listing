import express from "express";
import prisma from "../utils/prisma.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { todayIST, toDateOnly, formatDateString, daysBetween } from "../utils/dates.js";

const router = express.Router();

// GET /dashboard/stats
// Returns high-level judicial caseload metrics for dashboard cards
router.get("/stats", requireAuth, async (req, res, next) => {
  try {
    const todayStr = todayIST();
    const todayDate = toDateOnly(todayStr);

    const [totalPending, totalListed, totalDisposed, overdueCount, activeCases] =
      await Promise.all([
        prisma.case.count({ where: { status: "PENDING" } }),
        prisma.case.count({ where: { status: "LISTED" } }),
        prisma.case.count({ where: { status: "DISPOSED" } }),
        prisma.case.count({
          where: {
            status: { in: ["PENDING", "LISTED"] },
            targetDisposalDate: { lt: todayDate },
          },
        }),
        prisma.case.findMany({
          where: { status: { in: ["PENDING", "LISTED"] } },
          select: { filingDate: true },
        }),
      ]);

    let averageAge = 0;
    if (activeCases.length > 0) {
      const totalDays = activeCases.reduce((sum, c) => {
        const filingStr = formatDateString(c.filingDate);
        return sum + Math.max(0, daysBetween(filingStr, todayStr));
      }, 0);
      averageAge = Math.round(totalDays / activeCases.length);
    }

    res.json({
      totalPending,
      totalListed,
      totalDisposed,
      overdueCases: overdueCount,
      averageAge,
      asOfDate: todayStr,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

