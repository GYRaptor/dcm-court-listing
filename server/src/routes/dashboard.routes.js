import express from "express";
import prisma from "../utils/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { todayIST, toDateOnly, formatDateString, daysBetween, addDays } from "../utils/dates.js";

const router = express.Router();

// GET /dashboard
// Comprehensive analytics endpoint powering Recharts visualizations, operational dockets, and KPI summaries
router.get("/", requireAuth, requireRole("CLERK", "JUDGE"), async (req, res, next) => {
  try {
    const todayStr = todayIST();
    const todayDate = toDateOnly(todayStr);
    const sevenDaysLaterDate = toDateOnly(addDays(todayStr, 7));

    // Parallel aggregate and operational queries
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
      todayHearingsCount,
      upcomingDeadlinesCount,
      todayHearingsRaw,
      attentionCasesRaw,
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
      prisma.hearing.count({
        where: { hearingDate: todayDate },
      }),
      prisma.case.count({
        where: {
          status: { in: ["PENDING", "LISTED"] },
          targetDisposalDate: {
            gte: todayDate,
            lte: sevenDaysLaterDate,
          },
        },
      }),
      prisma.hearing.findMany({
        where: { hearingDate: todayDate },
        include: {
          judge: {
            include: {
              user: { select: { name: true } },
            },
          },
          case: {
            include: {
              track: { select: { name: true } },
            },
          },
        },
        orderBy: [
          { outcome: "asc" },
          { case: { priorityScore: "desc" } },
        ],
        take: 12,
      }),
      prisma.case.findMany({
        where: {
          status: { in: ["PENDING", "LISTED"] },
          OR: [
            { targetDisposalDate: { lt: todayDate } },
            { targetDisposalDate: { gte: todayDate, lte: sevenDaysLaterDate } },
            { adjournmentCount: { gte: 2 } },
            { priorityScore: { gte: 70 } },
            { trackApproved: false },
          ],
        },
        include: {
          track: { select: { name: true, targetDays: true } },
          judge: {
            select: {
              courtroom: true,
              user: { select: { name: true } },
            },
          },
        },
        orderBy: [
          { priorityScore: "desc" },
        ],
        take: 10,
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

    // Map status breakdown for Donut / Bar
    const statusBreakdown = [
      { name: "Pending", count: totalPending, color: "#1F3A5F" },
      { name: "Listed", count: totalListed, color: "#3E6088" },
      { name: "Disposed", count: totalDisposed, color: "#6B88AB" },
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

    // Format today's hearings
    const formattedTodayHearings = todayHearingsRaw.map((h) => ({
      id: h.id,
      hearingDate: formatDateString(h.hearingDate),
      outcome: h.outcome,
      remarks: h.remarks,
      courtroom: h.judge?.courtroom || "Unassigned",
      judgeName: h.judge?.user?.name || "Judicial Officer",
      case: {
        id: h.case.id,
        caseNumber: h.case.caseNumber,
        title: h.case.title,
        caseType: h.case.caseType,
        status: h.case.status,
        priorityScore: h.case.priorityScore,
        track: h.case.track?.name,
      },
    }));

    // Format attention cases
    const formattedAttentionCases = attentionCasesRaw.map((c) => {
      const filingStr = formatDateString(c.filingDate);
      const targetStr = formatDateString(c.targetDisposalDate);
      const ageDays = Math.max(0, daysBetween(filingStr, todayStr));
      const isOverdue = c.targetDisposalDate < todayDate;
      const isDueSoon = c.targetDisposalDate >= todayDate && c.targetDisposalDate <= sevenDaysLaterDate;

      const reasons = [];
      if (isOverdue) {
        const overdueDays = Math.max(1, daysBetween(targetStr, todayStr));
        reasons.push({ type: "OVERDUE", label: `Overdue (${overdueDays}d past target)` });
      } else if (isDueSoon) {
        const daysLeft = Math.max(0, daysBetween(todayStr, targetStr));
        reasons.push({ type: "DUE_SOON", label: `Due in ${daysLeft}d` });
      }

      if (c.adjournmentCount >= 2) {
        reasons.push({ type: "ADJOURNED", label: `${c.adjournmentCount} adjournments` });
      }

      if (!c.trackApproved) {
        reasons.push({ type: "UNAPPROVED", label: "Awaiting judicial review" });
      }

      if (c.priorityScore >= 70) {
        reasons.push({ type: "HIGH_PRIORITY", label: `High priority (${Number(c.priorityScore).toFixed(1)})` });
      }

      return {
        id: c.id,
        caseNumber: c.caseNumber,
        title: c.title,
        caseType: c.caseType,
        status: c.status,
        priorityScore: c.priorityScore,
        filingDate: filingStr,
        targetDisposalDate: targetStr,
        ageDays,
        track: c.track?.name,
        courtroom: c.judge?.courtroom || "Unassigned",
        judgeName: c.judge?.user?.name || "Unassigned",
        adjournmentCount: c.adjournmentCount,
        trackApproved: c.trackApproved,
        reasons,
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
        hearingsToday: todayHearingsCount,
        upcomingDeadlines: upcomingDeadlinesCount,
        asOfDate: todayStr,
      },
      trackDistribution,
      statusBreakdown,
      caseTypeDistribution,
      judgeWorkloads,
      recentActivity: formattedRecentActivity,
      todayHearings: formattedTodayHearings,
      attentionCases: formattedAttentionCases,
    });
  } catch (err) {
    next(err);
  }
});

// GET /dashboard/stats
// Retains backward-compatibility for DashboardMetrics card component with extended operational counters
router.get("/stats", requireAuth, async (req, res, next) => {
  try {
    const todayStr = todayIST();
    const todayDate = toDateOnly(todayStr);
    const sevenDaysLaterDate = toDateOnly(addDays(todayStr, 7));

    const [
      totalPending,
      totalListed,
      totalDisposed,
      overdueCount,
      activeCases,
      todayHearingsCount,
      upcomingDeadlinesCount,
    ] = await Promise.all([
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
      prisma.hearing.count({
        where: { hearingDate: todayDate },
      }),
      prisma.case.count({
        where: {
          status: { in: ["PENDING", "LISTED"] },
          targetDisposalDate: {
            gte: todayDate,
            lte: sevenDaysLaterDate,
          },
        },
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
      hearingsToday: todayHearingsCount,
      upcomingDeadlines: upcomingDeadlinesCount,
      asOfDate: todayStr,
    });
  } catch (err) {
    next(err);
  }
});

export default router;