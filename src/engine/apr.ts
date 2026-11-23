// src/engine/apr.ts
/**
 * Compute the APR for a given credit score and benchmark rate.
 * Returns null (ineligible) for scores below 600.
 * Rounds result to 2 decimal places; applies floor of 6.99%.
 */

const APR_FLOOR = 6.99;

/**
 * Compute APR based on credit score tiers and benchmark rate.
 * @param creditScore - Applicant's credit score (500-850)
 * @param benchmarkRate - Current benchmark rate from FRED
 * @returns APR as a number rounded to 2 decimal places, or null if ineligible
 */
export function computeAPR(creditScore: number, benchmarkRate: number): number | null {
  if (creditScore >= 720) {
    // Prime tier: benchmark - 1.5%
    const rawApr = benchmarkRate - 1.5;
    return Math.max(Math.round(rawApr * 100) / 100, APR_FLOOR);
  }

  if (creditScore >= 660) {
    // Near-prime tier: benchmark + 1.5%
    const rawApr = benchmarkRate + 1.5;
    return Math.max(Math.round(rawApr * 100) / 100, APR_FLOOR);
  }

  if (creditScore >= 600) {
    // Sub-prime tier: benchmark + 5.0%
    const rawApr = benchmarkRate + 5.0;
    return Math.max(Math.round(rawApr * 100) / 100, APR_FLOOR);
  }

  // Ineligible: credit score below 600
  return null;
}
