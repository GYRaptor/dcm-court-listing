import prisma from "../utils/prisma.js";
import { todayIST, toDateOnly, formatDateString, daysBetween } from "../utils/dates.js";
import { calculatePriorityScore } from "./priority.service.js";

export async function generateCauseList({ judgeId, date, userId = null }) {
  if (!judgeId) {
    throw new Error("judgeId is required");
  }

  const targetDateStr = date || todayIST();
  const calendarDate = toDateOnly(targetDateStr);

  const judge = await prisma.judge.findUnique({
    where: { id: judgeId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!judge) {
    const error = new Error("Judge not found");
    error.statusCode = 404;
    throw error;
  }

  // Idempotency: return existing hearings for this judge and calendar day
  const existingHearings = await prisma.hearing.findMany({
    where: {
      judgeId,
      hearingDate: calendarDate,
    },
    include: {
      case: {
        include: {
          track: true,
          parties: true,
        },
      },
      judge: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
    orderBy: {
      case: {
        priorityScore: "desc",
      },
    },
  });

  if (existingHearings.length > 0) {
    return {
      judge,
      date: targetDateStr,
      dailyCapacity: judge.dailyCapacity,
      hearings: existingHearings,
      alreadyGenerated: true,
      count: existingHearings.length,
    };
  }

  // Eligible cases: assigned to this judge, status PENDING, cooling gap elapsed
  const eligibleCases = await prisma.case.findMany({
    where: {
      judgeId,
      status: "PENDING",
      earliestNextDate: {
        lte: calendarDate,
      },
    },
    include: {
      track: true,
      parties: true,
    },
  });

  if (eligibleCases.length === 0) {
    return {
      judge,
      date: targetDateStr,
      dailyCapacity: judge.dailyCapacity,
      hearings: [],
      alreadyGenerated: false,
      count: 0,
    };
  }

  // Recalculate priority scores as of the requested listing date
  const scoredCases = eligibleCases.map((c) => {
    const filingStr = formatDateString(c.filingDate);
    const freshPriority = calculatePriorityScore({
      filingDate: filingStr,
      targetDays: c.track.targetDays,
      isUrgent: c.isUrgent,
      adjournmentCount: c.adjournmentCount,
      asOfDate: targetDateStr,
    });

    return {
      ...c,
      recalculatedPriority: freshPriority,
    };
  });

  // Sort descending by recalculated priority and enforce daily courtroom capacity
  scoredCases.sort((a, b) => b.recalculatedPriority - a.recalculatedPriority);
  const selectedCases = scoredCases.slice(0, judge.dailyCapacity);

  // Atomic listing: create scheduled hearings and mark cases as LISTED together
  const createdHearings = await prisma.$transaction(async (tx) => {
    const hearingRecords = [];

    for (const c of selectedCases) {
      await tx.case.update({
        where: { id: c.id },
        data: {
          status: "LISTED",
          priorityScore: c.recalculatedPriority,
        },
      });

      const hearing = await tx.hearing.create({
        data: {
          caseId: c.id,
          judgeId: judge.id,
          hearingDate: calendarDate,
          outcome: "SCHEDULED",
        },
        include: {
          case: {
            include: {
              track: true,
              parties: true,
            },
          },
          judge: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });

      hearingRecords.push(hearing);
    }

    if (userId) {
      await tx.auditLog.create({
        data: {
          userId,
          action: "CAUSE_LIST_GENERATED",
          details: JSON.stringify({
            judgeId: judge.id,
            courtroom: judge.courtroom,
            date: targetDateStr,
            casesListed: hearingRecords.length,
            caseNumbers: selectedCases.map((sc) => sc.caseNumber),
          }),
        },
      });
    }

    return hearingRecords;
  });

  return {
    judge,
    date: targetDateStr,
    dailyCapacity: judge.dailyCapacity,
    hearings: createdHearings,
    alreadyGenerated: false,
    count: createdHearings.length,
  };
}

export async function getCauseList({ judgeId, date }) {
  if (!judgeId) {
    throw new Error("judgeId is required");
  }

  const targetDateStr = date || todayIST();
  const calendarDate = toDateOnly(targetDateStr);

  const judge = await prisma.judge.findUnique({
    where: { id: judgeId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!judge) {
    const error = new Error("Judge not found");
    error.statusCode = 404;
    throw error;
  }

  const hearings = await prisma.hearing.findMany({
    where: {
      judgeId,
      hearingDate: calendarDate,
    },
    include: {
      case: {
        include: {
          track: true,
          parties: true,
        },
      },
      judge: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
    orderBy: {
      case: {
        priorityScore: "desc",
      },
    },
  });

  return {
    judge,
    date: targetDateStr,
    dailyCapacity: judge.dailyCapacity,
    hearings,
    count: hearings.length,
  };
}
