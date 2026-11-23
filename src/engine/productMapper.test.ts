// src/engine/productMapper.test.ts
import { describe, it, expect } from 'vitest';
import { computeProductRecommendations, createSecuredCreditBuilderOffer } from './productMapper';
import { Decision, ReasonCode, RetentionProductType } from './types';
import type { ApplicantInputs, EngineResult } from './types';

describe('createSecuredCreditBuilderOffer', () => {
  const mockEngineResult: EngineResult = {
    decision: Decision.DECLINED,
    reasonCode: ReasonCode.HIGH_RISK_SCORE,
    apr: 0,
    estimatedPayment: 0,
    postLoanDTI: 0,
    benchmarkRate: 11.50,
  };

  it('should calculate correct score gap and timeline for credit score 570', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 2800,
      monthlyDebt: 200,
      creditScore: 570,
      loanAmount: 7000,
      termMonths: 36,
    };

    const result = createSecuredCreditBuilderOffer(inputs, mockEngineResult);

    expect(result.productType).toBe(RetentionProductType.SECURED_CREDIT_BUILDER);
    expect(result.productName).toBe('Secured Credit Builder Card');
    expect(result.productIcon).toBe('shield-check');
    
    // Score gap: 640 - 570 = 70 points
    // Timeline: ceil(70 / 10) = 7 months
    expect(result.timelineMonths).toBe(7);
    expect(result.timelineLabel).toBe('7-10 months to re-qualify');
    expect(result.qualificationGap).toBe('Build credit history from 570 to 640 with on-time payments');
    
    expect(result.gapMetrics.current).toBe(570);
    expect(result.gapMetrics.target).toBe(640);
    expect(result.gapMetrics.label).toBe('Credit Score');
  });

  it('should calculate correct timeline for credit score 590', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 3000,
      monthlyDebt: 300,
      creditScore: 590,
      loanAmount: 8000,
      termMonths: 24,
    };

    const result = createSecuredCreditBuilderOffer(inputs, mockEngineResult);

    // Score gap: 640 - 590 = 50 points
    // Timeline: ceil(50 / 10) = 5 months
    expect(result.timelineMonths).toBe(5);
    expect(result.timelineLabel).toBe('5-8 months to re-qualify');
  });

  it('should calculate correct timeline for credit score 600 (edge case)', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 2500,
      monthlyDebt: 150,
      creditScore: 600,
      loanAmount: 5000,
      termMonths: 36,
    };

    const result = createSecuredCreditBuilderOffer(inputs, mockEngineResult);

    // Score gap: 640 - 600 = 40 points
    // Timeline: ceil(40 / 10) = 4 months
    expect(result.timelineMonths).toBe(4);
    expect(result.timelineLabel).toBe('4-7 months to re-qualify');
  });

  it('should handle credit score 500 (maximum gap)', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 2000,
      monthlyDebt: 100,
      creditScore: 500,
      loanAmount: 3000,
      termMonths: 24,
    };

    const result = createSecuredCreditBuilderOffer(inputs, mockEngineResult);

    // Score gap: 640 - 500 = 140 points
    // Timeline: ceil(140 / 10) = 14 months
    expect(result.timelineMonths).toBe(14);
    expect(result.timelineLabel).toBe('14-17 months to re-qualify');
  });

  it('should handle credit score 639 (minimal gap)', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 3500,
      monthlyDebt: 400,
      creditScore: 639,
      loanAmount: 10000,
      termMonths: 36,
    };

    const result = createSecuredCreditBuilderOffer(inputs, mockEngineResult);

    // Score gap: 640 - 639 = 1 point
    // Timeline: ceil(1 / 10) = 1 month
    expect(result.timelineMonths).toBe(1);
    expect(result.timelineLabel).toBe('1-4 months to re-qualify');
  });

  it('should include all required key terms', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 2800,
      monthlyDebt: 200,
      creditScore: 570,
      loanAmount: 7000,
      termMonths: 36,
    };

    const result = createSecuredCreditBuilderOffer(inputs, mockEngineResult);

    expect(result.keyTerms).toHaveLength(4);
    expect(result.keyTerms).toContain('Minimum $200 refundable security deposit');
    expect(result.keyTerms).toContain('0% APR on purchases');
    expect(result.keyTerms).toContain('Reports to all 3 credit bureaus');
    expect(result.keyTerms).toContain('Graduation to unsecured card after 6 months');
  });

  it('should use correct metric label', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 2800,
      monthlyDebt: 200,
      creditScore: 580,
      loanAmount: 6000,
      termMonths: 24,
    };

    const result = createSecuredCreditBuilderOffer(inputs, mockEngineResult);

    expect(result.gapMetrics.label).toBe('Credit Score');
  });

  it('should be called via computeProductRecommendations for HIGH_RISK_SCORE', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 2800,
      monthlyDebt: 200,
      creditScore: 570,
      loanAmount: 7000,
      termMonths: 36,
    };

    const engineResult: EngineResult = {
      decision: Decision.DECLINED,
      reasonCode: ReasonCode.HIGH_RISK_SCORE,
      apr: 0,
      estimatedPayment: 0,
      postLoanDTI: 0,
      benchmarkRate: 11.50,
    };

    const result = computeProductRecommendations(engineResult, inputs);

    expect(result.recommendations).toHaveLength(1);
    expect(result.emptyMessage).toBeNull();
    expect(result.recommendations[0].productType).toBe(RetentionProductType.SECURED_CREDIT_BUILDER);
  });
});

describe('Recommendation Ranking Logic', () => {
  it('should sort by timelineMonths ascending (shortest first)', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 3500,
      monthlyDebt: 2000,
      creditScore: 650,
      loanAmount: 15000,
      termMonths: 36,
    };

    // HIGH_DTI with loanAmount > 10000 produces both debt consolidation (0 months) and micro-loan (0 months)
    const engineResult: EngineResult = {
      decision: Decision.DECLINED,
      reasonCode: ReasonCode.HIGH_DTI,
      apr: 13.0,
      estimatedPayment: 500,
      postLoanDTI: 0.71, // (2000 + 500) / 3500 = 0.714
      benchmarkRate: 11.50,
    };

    const result = computeProductRecommendations(engineResult, inputs);

    expect(result.recommendations.length).toBeGreaterThan(0);
    
    // All recommendations should be sorted by timeline ascending
    for (let i = 0; i < result.recommendations.length - 1; i++) {
      expect(result.recommendations[i].timelineMonths).toBeLessThanOrEqual(
        result.recommendations[i + 1].timelineMonths
      );
    }
  });

  it('should use product priority as tie-breaker when timelines are equal', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 3500,
      monthlyDebt: 2000,
      creditScore: 650,
      loanAmount: 15000,
      termMonths: 36,
    };

    // HIGH_DTI with loanAmount > 10000 produces:
    // - Debt Consolidation (timelineMonths: 0)
    // - Micro-Loan (timelineMonths: 0)
    const engineResult: EngineResult = {
      decision: Decision.DECLINED,
      reasonCode: ReasonCode.HIGH_DTI,
      apr: 13.0,
      estimatedPayment: 500,
      postLoanDTI: 0.71,
      benchmarkRate: 11.50,
    };

    const result = computeProductRecommendations(engineResult, inputs);

    expect(result.recommendations).toHaveLength(2);
    
    // Both have timeline 0, so should be ordered by priority: MICRO_LOAN (1) > DEBT_CONSOLIDATION (2)
    expect(result.recommendations[0].productType).toBe(RetentionProductType.MICRO_LOAN);
    expect(result.recommendations[1].productType).toBe(RetentionProductType.DEBT_CONSOLIDATION);
    
    // Verify both have same timeline
    expect(result.recommendations[0].timelineMonths).toBe(0);
    expect(result.recommendations[1].timelineMonths).toBe(0);
  });

  it('should limit to top 3 recommendations', () => {
    // This test verifies the slice(0, 3) logic
    // Note: Current implementation generates at most 2 recommendations per reason code,
    // so we're testing that the limit is applied even if it doesn't cut anything off
    const inputs: ApplicantInputs = {
      monthlyIncome: 3500,
      monthlyDebt: 2000,
      creditScore: 650,
      loanAmount: 15000,
      termMonths: 36,
    };

    const engineResult: EngineResult = {
      decision: Decision.DECLINED,
      reasonCode: ReasonCode.HIGH_DTI,
      apr: 13.0,
      estimatedPayment: 500,
      postLoanDTI: 0.71,
      benchmarkRate: 11.50,
    };

    const result = computeProductRecommendations(engineResult, inputs);

    // Should never exceed 3 recommendations
    expect(result.recommendations.length).toBeLessThanOrEqual(3);
  });

  it('should maintain sort order across different reason codes', () => {
    // Test EXCESSIVE_DEBT which produces only debt consolidation (0 months)
    const inputs: ApplicantInputs = {
      monthlyIncome: 2500,
      monthlyDebt: 2500,
      creditScore: 650,
      loanAmount: 8000,
      termMonths: 24,
    };

    const engineResult: EngineResult = {
      decision: Decision.DECLINED,
      reasonCode: ReasonCode.EXCESSIVE_DEBT,
      apr: 13.0,
      estimatedPayment: 350,
      postLoanDTI: 1.14, // (2500 + 350) / 2500
      benchmarkRate: 11.50,
    };

    const result = computeProductRecommendations(engineResult, inputs);

    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].productType).toBe(RetentionProductType.DEBT_CONSOLIDATION);
    expect(result.recommendations[0].timelineMonths).toBe(0);
  });
});
