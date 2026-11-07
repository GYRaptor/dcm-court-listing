// Complexity calculation service for DCFM Case Flow Management
// Base points per substantive case type defined by procedural overhead

export const CASE_TYPE_BASE_POINTS = {
  BAIL: 1,
  CHEQUE_BOUNCE: 2,
  RENT_DISPUTE: 3,
  CIVIL_SUIT: 5,
  COMMERCIAL_DISPUTE: 6,
  PROPERTY_DISPUTE: 7,
};

/**
 * Computes objective case complexity score.
 * Rule: Base points by caseType + 1 if total parties > 2 + 2 if hasExpertEvidence.
 *
 * @param {string} caseType - Enum: BAIL, CHEQUE_BOUNCE, RENT_DISPUTE, CIVIL_SUIT, COMMERCIAL_DISPUTE, PROPERTY_DISPUTE
 * @param {number} partyCount - Total parties attached (petitioners, respondents, advocates)
 * @param {boolean} hasExpertEvidence - Whether expert forensic/financial reports are involved
 * @returns {number} Calculated complexity score
 */
export function calculateComplexity(caseType, partyCount = 0, hasExpertEvidence = false) {
  const base = CASE_TYPE_BASE_POINTS[caseType] ?? 1;
  const partyPenalty = partyCount > 2 ? 1 : 0;
  const evidencePenalty = hasExpertEvidence ? 2 : 0;

  return base + partyPenalty + evidencePenalty;
}

