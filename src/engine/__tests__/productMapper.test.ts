// src/engine/__tests__/productMapper.test.ts
// Comprehensive unit tests for productMapper module (Task 20.7)
// Validates Requirements: 11.1, 11.2, 11.5

import { describe, it, expect } from 'vitest';
import { computeProductRecommendations } from '../productMapper';
import {
  ApplicantInputs,
  Decision,
  EngineResult,
  ReasonCode,
  RetentionProductType,
} from '../types';

describe('computeProductRecommendations - Reason Code Mapping', () => {
  describe('HIGH_RISK_SCORE (score < 600)', () => {
    it('should map HIGH_RISK_SCORE to SECURED_CREDIT_BUILDER', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 2500,
        monthlyDebt: 300,
        creditScore: 580,
        loanAmount: 5000,
        termMonths: 24,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_RISK_SCORE,
        apr: 16.5,
        estimatedPayment: 250,
        postLoanDTI: 0.22,
        benchmarkRate: 11.5,
      };

      const result = computeProductRecommendations(engineResult, inputs);

      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].productType).toBe(
        RetentionProductType.SECURED_CREDIT_BUILDER
      );
      expect(result.recommendations[0].productName).toBe(
        'Secured Credit Builder Card'
      );
      expect(result.recommendations[0].productIcon).toBe('shield-check');
      expect(result.emptyMessage).toBeNull();
    });

    it('should calculate correct score gap and timeline for HIGH_RISK_SCORE', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 3000,
        monthlyDebt: 500,
        creditScore: 550, // 90 points below target 640
        loanAmount: 10000,
        termMonths: 36,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_RISK_SCORE,
        apr: 17.0,
        estimatedPayment: 350,
        postLoanDTI: 0.283,
        benchmarkRate: 11.5,
      };

      const result = computeProductRecommendations(engineResult, inputs);
      const offer = result.recommendations[0];

      // 90 point gap at 10 points/month = 9 months
      expect(offer.timelineMonths).toBe(9);
      expect(offer.gapMetrics.current).toBe(550);
      expect(offer.gapMetrics.target).toBe(640);
      expect(offer.gapMetrics.label).toBe('Credit Score');
    });
  });

  describe('INSUFFICIENT_INCOME (income < 1800)', () => {
    it('should map INSUFFICIENT_INCOME to HIGH_YIELD_SAVINGS', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 1500,
        monthlyDebt: 200,
        creditScore: 680,
        loanAmount: 5000,
        termMonths: 24,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.INSUFFICIENT_INCOME,
        apr: 13.0,
        estimatedPayment: 240,
        postLoanDTI: 0.293,
        benchmarkRate: 11.5,
      };

      const result = computeProductRecommendations(engineResult, inputs);

      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].productType).toBe(
        RetentionProductType.HIGH_YIELD_SAVINGS
      );
      expect(result.recommendations[0].productName).toBe(
        'High-Yield Savings with Direct Deposit'
      );
      expect(result.recommendations[0].productIcon).toBe('piggy-bank');
      expect(result.emptyMessage).toBeNull();
    });

    it('should always use 3-month timeline for INSUFFICIENT_INCOME', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 1000,
        monthlyDebt: 100,
        creditScore: 700,
        loanAmount: 3000,
        termMonths: 12,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.INSUFFICIENT_INCOME,
        apr: 10.0,
        estimatedPayment: 265,
        postLoanDTI: 0.365,
        benchmarkRate: 11.5,
      };

      const result = computeProductRecommendations(engineResult, inputs);

      expect(result.recommendations[0].timelineMonths).toBe(3);
      expect(result.recommendations[0].timelineLabel).toBe(
        '3 months of direct deposit history'
      );
    });
  });

  describe('EXCESSIVE_DEBT (monthlyDebt >= monthlyIncome)', () => {
    it('should map EXCESSIVE_DEBT to DEBT_CONSOLIDATION', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 2000,
        monthlyDebt: 2000, // Equal to income
        creditScore: 670,
        loanAmount: 10000,
        termMonths: 36,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.EXCESSIVE_DEBT,
        apr: 14.5,
        estimatedPayment: 350,
        postLoanDTI: 1.175, // (2000 + 350) / 2000
        benchmarkRate: 11.5,
      };

      const result = computeProductRecommendations(engineResult, inputs);

      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].productType).toBe(
        RetentionProductType.DEBT_CONSOLIDATION
      );
      expect(result.recommendations[0].productName).toBe(
        'Debt Consolidation Loan'
      );
      expect(result.recommendations[0].productIcon).toBe('scale');
      expect(result.emptyMessage).toBeNull();
    });

    it('should have immediate timeline for EXCESSIVE_DEBT', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 3000,
        monthlyDebt: 3500,
        creditScore: 650,
        loanAmount: 8000,
        termMonths: 24,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.EXCESSIVE_DEBT,
        apr: 16.5,
        estimatedPayment: 390,
        postLoanDTI: 1.297,
        benchmarkRate: 11.5,
      };

      const result = computeProductRecommendations(engineResult, inputs);

      expect(result.recommendations[0].timelineMonths).toBe(0);
      expect(result.recommendations[0].timelineLabel).toBe(
        'Available immediately'
      );
    });
  });

  describe('HIGH_DTI (postLoanDTI > 0.45)', () => {
    it('should map HIGH_DTI to DEBT_CONSOLIDATION when loanAmount <= 10k', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 2500,
        monthlyDebt: 800,
        creditScore: 680,
        loanAmount: 8000,
        termMonths: 24,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_DTI,
        apr: 13.0,
        estimatedPayment: 380,
        postLoanDTI: 0.472, // (800 + 380) / 2500
        benchmarkRate: 11.5,
      };

      const result = computeProductRecommendations(engineResult, inputs);

      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].productType).toBe(
        RetentionProductType.DEBT_CONSOLIDATION
      );
      expect(result.emptyMessage).toBeNull();
    });

    it('should include MICRO_LOAN when HIGH_DTI and loanAmount > 10k', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 4000,
        monthlyDebt: 1200,
        creditScore: 700,
        loanAmount: 15000,
        termMonths: 36,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_DTI,
        apr: 10.0,
        estimatedPayment: 485,
        postLoanDTI: 0.421, // (1200 + 485) / 4000
        benchmarkRate: 11.5,
      };

      const result = computeProductRecommendations(engineResult, inputs);

      expect(result.recommendations).toHaveLength(2);
      
      // Both have timeline 0, so MICRO_LOAN (priority 1) comes before DEBT_CONSOLIDATION (priority 2)
      expect(result.recommendations[0].productType).toBe(
        RetentionProductType.MICRO_LOAN
      );
      expect(result.recommendations[1].productType).toBe(
        RetentionProductType.DEBT_CONSOLIDATION
      );
      expect(result.emptyMessage).toBeNull();
    });

    it('should NOT include MICRO_LOAN when loanAmount exactly equals 10k', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 3000,
        monthlyDebt: 900,
        creditScore: 680,
        loanAmount: 10000,
        termMonths: 24,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_DTI,
        apr: 13.0,
        estimatedPayment: 475,
        postLoanDTI: 0.458,
        benchmarkRate: 11.5,
      };

      const result = computeProductRecommendations(engineResult, inputs);

      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].productType).toBe(
        RetentionProductType.DEBT_CONSOLIDATION
      );
    });
  });
});

describe('computeProductRecommendations - Non-Declined Decisions', () => {
  it('should return empty recommendations for APPROVED decision', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 5000,
      monthlyDebt: 500,
      creditScore: 750,
      loanAmount: 10000,
      termMonths: 36,
    };

    const engineResult: EngineResult = {
      decision: Decision.APPROVED,
      reasonCode: undefined,
      apr: 10.0,
      estimatedPayment: 322,
      postLoanDTI: 0.164,
      benchmarkRate: 11.5,
    };

    const result = computeProductRecommendations(engineResult, inputs);

    expect(result.recommendations).toHaveLength(0);
    expect(result.emptyMessage).toBeNull();
  });

  it('should return empty recommendations for COUNTER_OFFER decision', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 3500,
      monthlyDebt: 600,
      creditScore: 650,
      loanAmount: 15000,
      termMonths: 24,
    };

    const engineResult: EngineResult = {
      decision: Decision.COUNTER_OFFER,
      reasonCode: undefined,
      apr: 16.5,
      estimatedPayment: 737,
      postLoanDTI: 0.382,
      benchmarkRate: 11.5,
    };

    const result = computeProductRecommendations(engineResult, inputs);

    expect(result.recommendations).toHaveLength(0);
    expect(result.emptyMessage).toBeNull();
  });
});

describe('computeProductRecommendations - Edge Cases', () => {
  it('should return empty message when DECLINED with no reasonCode', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 2000,
      monthlyDebt: 500,
      creditScore: 620,
      loanAmount: 5000,
      termMonths: 24,
    };

    const engineResult: EngineResult = {
      decision: Decision.DECLINED,
      reasonCode: undefined,
      apr: 15.5,
      estimatedPayment: 240,
      postLoanDTI: 0.37,
      benchmarkRate: 11.5,
    };

    const result = computeProductRecommendations(engineResult, inputs);

    expect(result.recommendations).toHaveLength(0);
    expect(result.emptyMessage).toBe(
      'No decline reason available for product mapping.'
    );
  });

  it('should return empty message for LOAN_CAP_EXCEEDED reason code', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 2500,
      monthlyDebt: 400,
      creditScore: 620,
      loanAmount: 20000,
      termMonths: 24,
    };

    const engineResult: EngineResult = {
      decision: Decision.DECLINED,
      reasonCode: ReasonCode.LOAN_CAP_EXCEEDED,
      apr: 16.0,
      estimatedPayment: 975,
      postLoanDTI: 0.55,
      benchmarkRate: 11.5,
    };

    const result = computeProductRecommendations(engineResult, inputs);

    expect(result.recommendations).toHaveLength(0);
    expect(result.emptyMessage).toBe(
      'We could not find a product match for these details. Try editing your details.'
    );
  });

  it('should return empty message for INVALID_TERM reason code', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 3000,
      monthlyDebt: 500,
      creditScore: 680,
      loanAmount: 10000,
      termMonths: 18, // Invalid term
    };

    const engineResult: EngineResult = {
      decision: Decision.DECLINED,
      reasonCode: ReasonCode.INVALID_TERM,
      apr: 13.0,
      estimatedPayment: 0,
      postLoanDTI: 0,
      benchmarkRate: 11.5,
    };

    const result = computeProductRecommendations(engineResult, inputs);

    expect(result.recommendations).toHaveLength(0);
    expect(result.emptyMessage).toBe(
      'We could not find a product match for these details. Try editing your details.'
    );
  });

  it('should return empty message for INVALID_INPUT reason code', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 0, // Invalid
      monthlyDebt: 500,
      creditScore: 680,
      loanAmount: 10000,
      termMonths: 24,
    };

    const engineResult: EngineResult = {
      decision: Decision.DECLINED,
      reasonCode: ReasonCode.INVALID_INPUT,
      apr: 0,
      estimatedPayment: 0,
      postLoanDTI: 0,
      benchmarkRate: 11.5,
    };

    const result = computeProductRecommendations(engineResult, inputs);

    expect(result.recommendations).toHaveLength(0);
    expect(result.emptyMessage).toBe(
      'We could not find a product match for these details. Try editing your details.'
    );
  });
});

describe('computeProductRecommendations - Ranking and Limiting', () => {
  it('should sort recommendations by timelineMonths ascending', () => {
    // Create a scenario that generates multiple products with different timelines
    // HIGH_DTI with loanAmount > 10k gives: DEBT_CONSOLIDATION (0 months) + MICRO_LOAN (0 months)
    // We need to verify the tie-breaker logic works
    const inputs: ApplicantInputs = {
      monthlyIncome: 4000,
      monthlyDebt: 1300,
      creditScore: 700,
      loanAmount: 12000,
      termMonths: 24,
    };

    const engineResult: EngineResult = {
      decision: Decision.DECLINED,
      reasonCode: ReasonCode.HIGH_DTI,
      apr: 10.0,
      estimatedPayment: 554,
      postLoanDTI: 0.464,
      benchmarkRate: 11.5,
    };

    const result = computeProductRecommendations(engineResult, inputs);

    expect(result.recommendations).toHaveLength(2);
    
    // Both have timelineMonths = 0, so verify they're sorted
    expect(result.recommendations[0].timelineMonths).toBe(0);
    expect(result.recommendations[1].timelineMonths).toBe(0);
  });

  it('should use product priority as tie-breaker when timelines are equal', () => {
    // HIGH_DTI with loanAmount > 10k: DEBT_CONSOLIDATION (priority 2) + MICRO_LOAN (priority 1)
    // Both have timeline 0, so MICRO_LOAN should come first due to higher priority
    const inputs: ApplicantInputs = {
      monthlyIncome: 5000,
      monthlyDebt: 1500,
      creditScore: 720,
      loanAmount: 20000,
      termMonths: 36,
    };

    const engineResult: EngineResult = {
      decision: Decision.DECLINED,
      reasonCode: ReasonCode.HIGH_DTI,
      apr: 9.0,
      estimatedPayment: 636,
      postLoanDTI: 0.427,
      benchmarkRate: 11.5,
    };

    const result = computeProductRecommendations(engineResult, inputs);

    expect(result.recommendations).toHaveLength(2);
    
    // MICRO_LOAN (priority 1) should come before DEBT_CONSOLIDATION (priority 2)
    expect(result.recommendations[0].productType).toBe(
      RetentionProductType.MICRO_LOAN
    );
    expect(result.recommendations[1].productType).toBe(
      RetentionProductType.DEBT_CONSOLIDATION
    );
  });

  it('should limit recommendations to maximum of 3', () => {
    // This test verifies the slice(0, 3) logic
    // However, with current reason codes, we can only get max 2 products
    // (DEBT_CONSOLIDATION + MICRO_LOAN from HIGH_DTI)
    // This test documents current behavior
    const inputs: ApplicantInputs = {
      monthlyIncome: 6000,
      monthlyDebt: 2000,
      creditScore: 740,
      loanAmount: 25000,
      termMonths: 48,
    };

    const engineResult: EngineResult = {
      decision: Decision.DECLINED,
      reasonCode: ReasonCode.HIGH_DTI,
      apr: 8.5,
      estimatedPayment: 619,
      postLoanDTI: 0.437,
      benchmarkRate: 11.5,
    };

    const result = computeProductRecommendations(engineResult, inputs);

    // With current implementation, max is 2 products
    expect(result.recommendations.length).toBeLessThanOrEqual(3);
    expect(result.recommendations).toHaveLength(2);
  });
});

describe('computeProductRecommendations - Product-Specific Details', () => {
  describe('SECURED_CREDIT_BUILDER details', () => {
    it('should include shield-check icon', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 2500,
        monthlyDebt: 300,
        creditScore: 590,
        loanAmount: 5000,
        termMonths: 24,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_RISK_SCORE,
        apr: 17.0,
        estimatedPayment: 250,
        postLoanDTI: 0.22,
        benchmarkRate: 11.5,
      };

      const result = computeProductRecommendations(engineResult, inputs);

      expect(result.recommendations[0].productIcon).toBe('shield-check');
    });

    it('should include all required key terms', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 2500,
        monthlyDebt: 300,
        creditScore: 580,
        loanAmount: 5000,
        termMonths: 24,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_RISK_SCORE,
        apr: 17.0,
        estimatedPayment: 250,
        postLoanDTI: 0.22,
        benchmarkRate: 11.5,
      };

      const result = computeProductRecommendations(engineResult, inputs);
      const offer = result.recommendations[0];

      expect(offer.keyTerms).toContain('Minimum $200 refundable security deposit');
      expect(offer.keyTerms).toContain('0% APR on purchases');
      expect(offer.keyTerms).toContain('Reports to all 3 credit bureaus');
      expect(offer.keyTerms).toContain('Graduation to unsecured card after 6 months');
    });
  });

  describe('DEBT_CONSOLIDATION details', () => {
    it('should calculate 80% consolidated debt amount', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 3000,
        monthlyDebt: 1000,
        creditScore: 670,
        loanAmount: 10000,
        termMonths: 36,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.EXCESSIVE_DEBT,
        apr: 14.5,
        estimatedPayment: 350,
        postLoanDTI: 0.45,
        benchmarkRate: 11.5,
      };

      const result = computeProductRecommendations(engineResult, inputs);
      const offer = result.recommendations[0];

      // 1000 * 0.8 = 800
      expect(offer.qualificationGap).toContain('$1,000');
      expect(offer.qualificationGap).toContain('$800');
    });

    it('should include scale icon', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 2500,
        monthlyDebt: 1200,
        creditScore: 660,
        loanAmount: 8000,
        termMonths: 24,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.EXCESSIVE_DEBT,
        apr: 15.5,
        estimatedPayment: 390,
        postLoanDTI: 0.636,
        benchmarkRate: 11.5,
      };

      const result = computeProductRecommendations(engineResult, inputs);

      expect(result.recommendations[0].productIcon).toBe('scale');
    });

    it('should reference DTI target of 0.36', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 4000,
        monthlyDebt: 2000,
        creditScore: 680,
        loanAmount: 12000,
        termMonths: 36,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.EXCESSIVE_DEBT,
        apr: 13.0,
        estimatedPayment: 416,
        postLoanDTI: 0.604,
        benchmarkRate: 11.5,
      };

      const result = computeProductRecommendations(engineResult, inputs);
      const offer = result.recommendations[0];

      expect(offer.gapMetrics.target).toBe(0.36);
      expect(offer.gapMetrics.label).toBe('Debt-to-Income Ratio');
    });
  });

  describe('MICRO_LOAN details', () => {
    it('should include coins icon', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 4000,
        monthlyDebt: 1200,
        creditScore: 700,
        loanAmount: 15000,
        termMonths: 36,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_DTI,
        apr: 10.0,
        estimatedPayment: 485,
        postLoanDTI: 0.421,
        benchmarkRate: 11.5,
      };

      const result = computeProductRecommendations(engineResult, inputs);
      const microLoan = result.recommendations.find(
        r => r.productType === RetentionProductType.MICRO_LOAN
      );

      expect(microLoan).toBeDefined();
      expect(microLoan!.productIcon).toBe('coins');
    });

    it('should use Tier-2 pricing (APR + 2%)', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 5000,
        monthlyDebt: 1500,
        creditScore: 720,
        loanAmount: 18000,
        termMonths: 36,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_DTI,
        apr: 9.0,
        estimatedPayment: 573,
        postLoanDTI: 0.415,
        benchmarkRate: 11.5,
      };

      const result = computeProductRecommendations(engineResult, inputs);
      const microLoan = result.recommendations.find(
        r => r.productType === RetentionProductType.MICRO_LOAN
      );

      expect(microLoan).toBeDefined();
      // APR: 9.0 + 2.0 = 11.0%
      expect(microLoan!.keyTerms.some(term => term.includes('11.00%'))).toBe(true);
    });

    it('should recommend amount between $2,000 and $5,000', () => {
      const inputs: ApplicantInputs = {
        monthlyIncome: 4000,
        monthlyDebt: 1000,
        creditScore: 710,
        loanAmount: 15000,
        termMonths: 24,
      };

      const engineResult: EngineResult = {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_DTI,
        apr: 9.5,
        estimatedPayment: 696,
        postLoanDTI: 0.424,
        benchmarkRate: 11.5,
      };

      const result = computeProductRecommendations(engineResult, inputs);
      const microLoan = result.recommendations.find(
        r => r.productType === RetentionProductType.MICRO_LOAN
      );

      expect(microLoan).toBeDefined();
      expect(microLoan!.gapMetrics.target).toBeGreaterThanOrEqual(2000);
      expect(microLoan!.gapMetrics.target).toBeLessThanOrEqual(5000);
    });
  });
});

/**
 * Validates: Requirements 11.1, 11.2, 11.5
 * 
 * This test suite comprehensively validates the productMapper module:
 * - Requirement 11.1: Maps each decline reason to appropriate retention products
 * - Requirement 11.2: Generates structured product recommendations with all required fields
 * - Requirement 11.5: Implements ranking by timeline and product priority, limits to 3 recommendations
 */
