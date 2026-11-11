import defaultPrisma from "../utils/prisma.js";
import { daysBetween, todayIST } from "../utils/dates.js";

export function calculatePriorityScore({
  filingDate,
  targetDays,
  isUrgent = false,
  adjournmentCount = 0,
  asOfDate = todayIST(),
}) {
  if (!targetDays || targetDays <= 0) {
    throw new Error("targetDays must be a positive non-zero integer");
  }

  const ageInDays = Math.max(0, daysBetween(filingDate, asOfDate));
  const timeShare = (ageInDays / targetDays) * 100;
  const urgencyBonus = isUrgent ? 30 : 0;

  // cap adjournment penalty at 25 points so old cases don't break the scale
  const adjournmentPenalty = Math.min(5 * (adjournmentCount || 0), 25);

  const rawScore = timeShare + urgencyBonus + adjournmentPenalty;
  return Math.round(rawScore * 10) / 10;
}

export async function updateCasePriority(caseId, asOfDate = todayIST(), tx = defaultPrisma) {
  const targetCase = await tx.case.findUnique({
    where: { id: caseId },
    include: { track: true },
  });

  if (!targetCase) {
    throw new Error(`Case with ID ${caseId} not found`);
  }

  const priorityScore = calculatePriorityScore({
    filingDate: targetCase.filingDate,
    targetDays: targetCase.track.targetDays,
    isUrgent: targetCase.isUrgent,
    adjournmentCount: targetCase.adjournmentCount,
    asOfDate,
  });

  return tx.case.update({
    where: { id: caseId },
    data: { priorityScore },
    include: { track: true },
  });
}

export function isCaseOverdue(targetDisposalDate, status = "PENDING", asOfDate = todayIST()) {
  if (status === "DISPOSED") return false;
  return daysBetween(targetDisposalDate, asOfDate) > 0;
}

export function isCaseAging(filingDate, status = "PENDING", asOfDate = todayIST()) {
  if (status === "DISPOSED") return false;
  return daysBetween(filingDate, asOfDate) > 5 * 365;
}
