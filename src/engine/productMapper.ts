// src/engine/productMapper.ts
// Product recommendation mapper for declined loan applications

import {
  ApplicantInputs,
  Decision,
  EngineResult,
  ProductRecommendation,
  ProductRecommendationResult,
  ReasonCode,
  RetentionProductType,
} from './types';
import { computeEstimatedPayment } from './amortization';

/**
 * Computes product recommendations for declined loan applications.
 * Maps decline reason codes to appropriate retention products.
 * 
 * @param engineResult - Result from underwriting engine
 * @param inputs - Original applicant inputs
 * @returns ProductRecommendationResult with recommendations or empty message
 * 
 * Requirements: 11.1, 11.2
 */
export function computeProductRecommendations(
  engineResult: EngineResult,
  inputs: ApplicantInputs,
): ProductRecommendationResult {
  // Return empty result for non-declined decisions
  if (engineResult.decision !== Decision.DECLINED) {
    return {
      recommendations: [],
      emptyMessage: null,
    };
  }

  // Return empty result if no reason code present
  if (!engineResult.reasonCode) {
    return {
      recommendations: [],
      emptyMessage: 'No decline reason available for product mapping.',
    };
  }

  const recommendations: ProductRecommendation[] = [];
  const benchmarkRate = engineResult.benchmarkRate;

  // Map reason codes to product recommendations via switch statement
  switch (engineResult.reasonCode) {
    case ReasonCode.HIGH_RISK_SCORE:
      // Credit score < 600 - recommend secured credit builder
      recommendations.push(
        createSecuredCreditBuilderOffer(inputs, engineResult)
      );
      break;

    case ReasonCode.INSUFFICIENT_INCOME:
      // Monthly income < $1,800 - recommend high-yield savings with direct deposit
      recommendations.push(
        createHighYieldSavingsOffer(inputs, engineResult)
      );
      break;

    case ReasonCode.EXCESSIVE_DEBT:
      // monthlyDebt >= monthlyIncome - recommend debt consolidation
      recommendations.push(
        createDebtConsolidationOffer(inputs, engineResult)
      );
      break;

    case ReasonCode.HIGH_DTI:
      // postLoanDTI > 0.45 - recommend debt consolidation
      recommendations.push(
        createDebtConsolidationOffer(inputs, engineResult)
      );
      
      // Additionally recommend micro-loan if requested amount was high
      if (inputs.loanAmount > 10000) {
        recommendations.push(
          createMicroLoanOffer(inputs, engineResult, benchmarkRate)
        );
      }
      break;

    default:
      // For other reason codes (LOAN_CAP_EXCEEDED, INVALID_INPUT, INVALID_TERM),
      // no product recommendations available
      return {
        recommendations: [],
        emptyMessage: 'We could not find a product match for these details. Try editing your details.',
      };
  }

  // Sort recommendations by timeline (ascending) and product priority
  // Product priority (tie-breaker): MICRO_LOAN > DEBT_CONSOLIDATION > HIGH_YIELD_SAVINGS > SECURED_CREDIT_BUILDER
  const productPriority: Record<RetentionProductType, number> = {
    [RetentionProductType.MICRO_LOAN]: 1,
    [RetentionProductType.DEBT_CONSOLIDATION]: 2,
    [RetentionProductType.HIGH_YIELD_SAVINGS]: 3,
    [RetentionProductType.SECURED_CREDIT_BUILDER]: 4,
  };

  const sortedRecommendations = recommendations.sort((a, b) => {
    // Primary sort: timelineMonths ascending (shortest first)
    if (a.timelineMonths !== b.timelineMonths) {
      return a.timelineMonths - b.timelineMonths;
    }
    // Secondary sort (tie-breaker): product priority (lower number = higher priority)
    return productPriority[a.productType] - productPriority[b.productType];
  });

  // Limit to top 3 recommendations
  const topRecommendations = sortedRecommendations.slice(0, 3);

  return {
    recommendations: topRecommendations,
    emptyMessage: null,
  };
}

/**
 * Creates a Secured Credit Builder Card offer for applicants with credit scores below 640.
 * Calculates score gap to target, estimates timeline based on typical credit building progress,
 * and returns a structured recommendation with product details and qualification metrics.
 * 
 * Requirements: 11.2, 11.3, 11.4
 * 
 * @param inputs - Current applicant financial inputs
 * @param engineResult - Current underwriting decision result
 * @param benchmarkRate - FRED benchmark rate
 * @returns ProductRecommendation for Secured Credit Builder Card
 */
export function createSecuredCreditBuilderOffer(
  inputs: ApplicantInputs,
  _engineResult: EngineResult,
): ProductRecommendation {
  const targetScore = 640;
  const scoreGap = targetScore - inputs.creditScore;
  
  // Estimate timeline: ~10 points per month with consistent on-time payments
  // Rounded up to ensure conservative estimate
  const timelineMonths = Math.ceil(scoreGap / 10);

  return {
    productType: RetentionProductType.SECURED_CREDIT_BUILDER,
    productName: 'Secured Credit Builder Card',
    productIcon: 'shield-check',
    qualificationGap: `Build credit history from ${inputs.creditScore} to ${targetScore} with on-time payments`,
    timelineMonths,
    timelineLabel: `${timelineMonths}-${timelineMonths + 3} months to re-qualify`,
    keyTerms: [
      'Minimum $200 refundable security deposit',
      '0% APR on purchases',
      'Reports to all 3 credit bureaus',
      'Graduation to unsecured card after 6 months',
    ],
    gapMetrics: {
      current: inputs.creditScore,
      target: targetScore,
      label: 'Credit Score',
    },
  };
}

/**
 * Creates a High-Yield Savings product recommendation.
 * Targets applicants with insufficient income (<$1,800/month).
 * Encourages establishing direct deposit history and building toward minimum income threshold.
 * 
 * @param inputs - Applicant inputs
 * @param engineResult - Engine result
 * @param benchmarkRate - FRED benchmark rate
 * @returns ProductRecommendation for high-yield savings with direct deposit
 * 
 * Requirements: 11.2, 11.3, 11.4
 */
function createHighYieldSavingsOffer(
  inputs: ApplicantInputs,
  _engineResult: EngineResult,
): ProductRecommendation {
  const targetIncome = 1800;
  const incomeGap = targetIncome - inputs.monthlyIncome;
  
  // Fixed 3-month timeline for direct deposit history
  const timelineMonths = 3;
  
  // Determine qualification gap message based on income gap size
  let qualificationGap: string;
  if (incomeGap > 0) {
    if (incomeGap > 500) {
      qualificationGap = `Establish supplemental income source to reach $${targetIncome.toLocaleString()}/mo minimum`;
    } else {
      qualificationGap = `Establish direct deposit history to reach $${targetIncome.toLocaleString()}/mo minimum`;
    }
  } else {
    qualificationGap = 'Establish 3-month direct deposit history to demonstrate income stability';
  }
  
  return {
    productType: RetentionProductType.HIGH_YIELD_SAVINGS,
    productName: 'High-Yield Savings with Direct Deposit',
    productIcon: 'piggy-bank',
    qualificationGap,
    timelineMonths,
    timelineLabel: '3 months of direct deposit history',
    keyTerms: [
      'No minimum balance requirement',
      '4.50% APY on all balances',
      'Set up direct deposit for bonus consideration',
      'Mobile app with budgeting tools',
    ],
    gapMetrics: {
      current: inputs.monthlyIncome,
      target: targetIncome,
      label: 'Monthly Income',
    },
  };
}

/**
 * Creates a debt consolidation product recommendation for applicants
 * with excessive debt or high DTI. Estimates 20% reduction in monthly
 * debt payments through consolidation, provides immediate pathway to approval.
 * 
 * Requirements: 11.2, 11.3, 11.4
 * 
 * @param inputs - Applicant's current financial inputs
 * @param engineResult - Result from underwriting engine containing DTI
 * @param _benchmarkRate - FRED benchmark rate (unused, kept for signature consistency)
 * @returns ProductRecommendation with DEBT_CONSOLIDATION product type
 */
function createDebtConsolidationOffer(
  inputs: ApplicantInputs,
  engineResult: EngineResult,
): ProductRecommendation {
  // Estimate consolidated debt: 80% of current monthlyDebt (20% reduction)
  const consolidatedDebt = inputs.monthlyDebt * 0.8;
  const targetDTI = 0.36;
  
  return {
    productType: RetentionProductType.DEBT_CONSOLIDATION,
    productName: 'Debt Consolidation Loan',
    productIcon: 'scale',
    qualificationGap: `Reduce monthly debt obligations from $${inputs.monthlyDebt.toLocaleString()} to ~$${Math.ceil(consolidatedDebt).toLocaleString()} to lower DTI`,
    timelineMonths: 0,
    timelineLabel: 'Available immediately',
    keyTerms: [
      `Consolidate up to $${(inputs.monthlyDebt * 12).toLocaleString()} of existing debt`,
      'Fixed APR, no prepayment penalty',
      `Estimated new monthly payment: ~$${Math.ceil(consolidatedDebt).toLocaleString()}`,
      'Close consolidated accounts to prevent new balances',
    ],
    gapMetrics: {
      current: engineResult.postLoanDTI,
      target: targetDTI,
      label: 'Debt-to-Income Ratio',
    },
  };
}

/**
 * Creates a Micro-Loan product recommendation for applicants with high DTI
 * who may qualify for a smaller loan amount. Solves for maximum loan amount
 * within $2,000-$5,000 range that keeps DTI at or below 0.36. Uses Tier-2
 * pricing with +2% APR premium over standard tier rate.
 * 
 * Requirements: 11.2, 11.3, 11.4
 * 
 * @param inputs - Applicant's current financial inputs
 * @param engineResult - Result from underwriting engine
 * @param benchmarkRate - Current FRED benchmark rate for APR calculation
 * @returns ProductRecommendation with MICRO_LOAN product type
 */
function createMicroLoanOffer(
  inputs: ApplicantInputs,
  engineResult: EngineResult,
  _benchmarkRate: number
): ProductRecommendation {
  const requestedAmount = inputs.loanAmount;
  
  // Calculate APR with Tier-2 pricing (+2% premium)
  const microLoanAPR = engineResult.apr + 2.0;
  
  // Solve for maximum loan amount that keeps DTI <= 0.36
  // Target: (monthlyDebt + payment) / monthlyIncome <= 0.36
  // Rearranged: payment <= 0.36 * monthlyIncome - monthlyDebt
  const maxAllowedPayment = 0.36 * inputs.monthlyIncome - inputs.monthlyDebt;
  
  // If maxAllowedPayment <= 0, even a micro-loan won't work
  // Return minimum micro-loan amount as fallback
  if (maxAllowedPayment <= 0) {
    return {
      productType: RetentionProductType.MICRO_LOAN,
      productName: 'Micro-Loan',
      productIcon: 'coins',
      qualificationGap: `Reduced loan amount of $2,000 (minimum micro-loan)`,
      timelineMonths: 0,
      timelineLabel: 'Available immediately',
      keyTerms: [
        'Loan amount: $2,000 (minimum)',
        `Term: ${inputs.termMonths} months`,
        `APR: ${microLoanAPR.toFixed(2)}% (Tier-2 pricing)`,
        'Build credit history for future larger loans',
      ],
      gapMetrics: {
        current: requestedAmount,
        target: 2000,
        label: 'Requested Loan Amount',
      },
    };
  }
  
  // Binary search for maximum loan amount that produces payment <= maxAllowedPayment
  // Search range: $2,000 to $5,000 (capped micro-loan range)
  let low = 2000;
  let high = 5000;
  let maxLoanAmount = 2000; // Start with minimum
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    // Round to nearest $100 for clean amounts
    const testAmount = Math.floor(mid / 100) * 100;
    
    const payment = computeEstimatedPayment(testAmount, microLoanAPR, inputs.termMonths);
    
    if (payment <= maxAllowedPayment) {
      maxLoanAmount = testAmount;
      low = testAmount + 100;
    } else {
      high = testAmount - 100;
    }
  }
  
  // Cap at $5,000 maximum and ensure minimum of $2,000
  const cappedAmount = Math.max(2000, Math.min(5000, maxLoanAmount));
  
  return {
    productType: RetentionProductType.MICRO_LOAN,
    productName: 'Micro-Loan',
    productIcon: 'coins',
    qualificationGap: `Approve smaller loan amount ($${cappedAmount.toLocaleString()}) that fits within your budget`,
    timelineMonths: 0,
    timelineLabel: 'Available immediately',
    keyTerms: [
      `Loan amount: $${cappedAmount.toLocaleString()}`,
      `Term: ${inputs.termMonths} months`,
      `APR: ${microLoanAPR.toFixed(2)}% (Tier-2 pricing)`,
      'Build credit history for future larger loans',
    ],
    gapMetrics: {
      current: requestedAmount,
      target: cappedAmount,
      label: 'Requested Loan Amount',
    },
  };
}
