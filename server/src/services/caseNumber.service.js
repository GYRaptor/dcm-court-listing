import defaultPrisma from "../utils/prisma.js";

/**
 * Generates the next sequential case number: DCM/<year>/<sequence>
 * (e.g., DCM/2026/0001). Executed inside the registration transaction
 * to guarantee unique sequential assignment without collision.
 *
 * @param {object} [tx=defaultPrisma] - Active Prisma transaction client
 * @param {number} [year] - Calendar year (defaults to current year)
 * @returns {Promise<string>} Unique case number
 */
export async function generateCaseNumber(tx = defaultPrisma, year = new Date().getUTCFullYear()) {
  const prefix = `DCM/${year}/`;

  // Find the highest existing sequence for this prefix
  const latestCase = await tx.case.findFirst({
    where: {
      caseNumber: { startsWith: prefix },
    },
    orderBy: { caseNumber: "desc" },
    select: { caseNumber: true },
  });

  if (!latestCase) {
    return `${prefix}0001`;
  }

  const parts = latestCase.caseNumber.split("/");
  const currentSeq = parseInt(parts[2], 10) || 0;
  const nextSeq = String(currentSeq + 1).padStart(4, "0");

  return `${prefix}${nextSeq}`;
}

