import express from "express";
import prisma from "../utils/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { todayIST, toDateOnly, formatDateString, daysBetween } from "../utils/dates.js";

const router = express.Router();

// GET /dashboard
// Comprehensive analytics endpoint powering Recharts visualizations and summary cards
router.get("/", requireAuth, requireRole("CLERK", "JUDGE"), async (req, res, next) => {
  try {
    const todayStr = todayIST();
    const todayDate = toDateOnly(todayStr);

    // Parallel aggregate queries
    const [
      totalCases,
      totalPending,
      totalListed,
      totalDisposed,
      overdueCount,
      activeCases,
      tracks,
      casesByTrack,
      casesByType,
      judges,
      recentLogs,
    ] = await Promise.all([
      prisma.case.count(),
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
        select: { filingDate: true, trackId: true },
      }),
      prisma.track.findMany({
        orderBy: { targetDays: "asc" },
      }),
      prisma.case.groupBy({
        by: ["trackId"],
        _count: { id: true },
      }),
      prisma.case.groupBy({
        by: ["caseType"],
        _count: { id: true },
      }),
      prisma.judge.findMany({
        include: {
          user: { select: { name: true } },
          cases: {
            where: { status: { in: ["PENDING", "LISTED"] } },
            select: { complexity: true },
          },
        },
      }),
      prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, role: true } },
          case: { select: { caseNumber: true, title: true } },
        },
      }),
    ]);

    // Compute average age and aging count (> 5 years = 1825 days)
    let averageAge = 0;
    let agingCount = 0;
    if (activeCases.length > 0) {
      let totalDays = 0;
      for (const c of activeCases) {
        const filingStr = formatDateString(c.filingDate);
        const age = Math.max(0, daysBetween(filingStr, todayStr));
        totalDays += age;
        if (age > 1825) {
          agingCount += 1;
        }
      }
      averageAge = Math.round(totalDays / activeCases.length);
    }

    // Map track distribution with names, case count, and average age
    const trackDistribution = tracks.map((t) => {
      const match = casesByTrack.find((c) => c.trackId === t.id);
      const trackActiveCases = activeCases.filter((c) => c.trackId === t.id);
      let trackAvgAge = 0;
      if (trackActiveCases.length > 0) {
        const sumDays = trackActiveCases.reduce((sum, c) => {
          return sum + Math.max(0, daysBetween(formatDateString(c.filingDate), todayStr));
        }, 0);
        trackAvgAge = Math.round(sumDays / trackActiveCases.length);
      }

      return {
        id: t.id,
        name: t.name,
        targetDays: t.targetDays,
        gapDays: t.gapDays,
        caseCount: match ? match._count.id : 0,
        averageAge: trackAvgAge,
      };
    });

    // Map status breakdown for Donut / Pie / Bar
    const statusBreakdown = [
      { name: "Pending", count: totalPending, color: "#3B82F6" },
      { name: "Listed", count: totalListed, color: "#8B5CF6" },
      { name: "Disposed", count: totalDisposed, color: "#10B981" },
    ];

    // Map case type distribution
    const caseTypeDistribution = casesByType.map((ct) => ({
      type: ct.caseType.replace(/_/g, " "),
      count: ct._count.id,
    })).sort((a, b) => b.count - a.count);

    // Map judge courtroom workload and active complexity
    const judgeWorkloads = judges.map((j) => {
      const activeCaseCount = j.cases.length;
      const totalComplexity = j.cases.reduce((sum, c) => sum + (c.complexity || 0), 0);
      return {
        judgeId: j.id,
        courtroom: j.courtroom,
        judgeName: j.user?.name || "Judicial Officer",
        activeCases: activeCaseCount,
        totalComplexity,
        dailyCapacity: j.dailyCapacity,
      };
    });

    // Format recent activity
    const formattedRecentActivity = recentLogs.map((log) => {
      let parsed = null;
      try {
        parsed = JSON.parse(log.details);
      } catch {
        parsed = log.details;
      }
      return {
        id: log.id,
        action: log.action,
        createdAt: log.createdAt,
        user: log.user,
        case: log.case,
        details: parsed,
      };
    });

    res.json({
      summary: {
        totalCases,
        totalPending,
        totalListed,
        totalDisposed,
        overdueCases: overdueCount,
        agingCases: agingCount,
        averageAge,
        asOfDate: todayStr,
      },
      trackDistribution,
      statusBreakdown,
      caseTypeDistribution,
      judgeWorkloads,
      recentActivity: formattedRecentActivity,
    });
  } catch (err) {
    next(err);
  }
});

// GET /dashboard/stats
// Retains backward-compatibility for DashboardMetrics card component
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
