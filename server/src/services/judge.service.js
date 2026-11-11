import defaultPrisma from "../utils/prisma.js";

export async function assignJudgeGreedy(tx = defaultPrisma) {
  const judges = await tx.judge.findMany({
    select: {
      id: true,
      courtroom: true,
      cases: {
        where: {
          status: { in: ["PENDING", "LISTED"] },
        },
        select: { complexity: true },
      },
    },
  });

  if (!judges || judges.length === 0) {
    return null;
  }

  // balance judicial load by total active complexity points rather than raw case count
  const judgeWorkloads = judges.map((judge) => {
    const totalComplexity = judge.cases.reduce((sum, c) => sum + (c.complexity || 0), 0);
    return {
      id: judge.id,
      courtroom: judge.courtroom,
      totalComplexity,
      activeCaseCount: judge.cases.length,
    };
  });

  judgeWorkloads.sort((a, b) => {
    if (a.totalComplexity !== b.totalComplexity) {
      return a.totalComplexity - b.totalComplexity;
    }
    return a.activeCaseCount - b.activeCaseCount;
  });

  return judgeWorkloads[0].id;
}

