import defaultPrisma from "../utils/prisma.js";

/**
 * Determines and returns the suggested DCFM Track record from the database.
 * Thresholds:
 *   - Complexity 1 to 3: FAST Track
 *   - Complexity 4 to 6: STANDARD Track
 *   - Complexity 7 and above: COMPLEX Track
 *
 * NOTE: These tracks, score thresholds, and timelines (90, 365, 730 days) are our
 * own project assumptions modeled on the Law Commission and Court Management guidelines.
 * They are stored dynamically in the Track database table rather than hardcoded,
 * ensuring court administrative committees can configure timelines without code modifications.
 *
 * @param {number} complexity - Calculated complexity score
 * @param {object} [tx=defaultPrisma] - Prisma client or active transaction
 * @returns {Promise<object>} Track row from database ({ id, name, targetDays, gapDays })
 */
export async function suggestTrack(complexity, tx = defaultPrisma) {
  let targetTrackName = "FAST";

  if (complexity >= 7) {
    targetTrackName = "COMPLEX";
  } else if (complexity >= 4) {
    targetTrackName = "STANDARD";
  }

  // Fetch track record dynamically from database to respect administrative configurations
  const track = await tx.track.findUnique({
    where: { name: targetTrackName },
  });

  if (!track) {
    throw new Error(`Track '${targetTrackName}' not found in database`);
  }

  return track;
}
