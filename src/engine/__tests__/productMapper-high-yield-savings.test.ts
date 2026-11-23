// src/engine/__tests__/productMapper-high-yield-savings.test.ts
// Unit tests for createHighYieldSavingsOffer function (Task 20.3)

import { describe, it, expect } from 'vitest';
import { computeProductRecommendations } from '../productMapper';
import {
  ApplicantInputs,
  Decision,
  EngineResult,
  ReasonCode,
  RetentionProductType,
} from '../types';

describe('createHighYieldSavingsOffer (Task 20.3)', () => {
  it('should create high-yield savings offer for insufficient income', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 1500,
      monthlyDebt: 200,
      creditScore: 650,
      loanAmount: 5000,
      termMonths: 24,
    };

    const engineResult: EngineResult = {
      decision: Decision.DECLINED,
      reasonCode: ReasonCode.INSUFFICIENT_INCOME,
      apr: 16.5,
      estimatedPayment: 250,
      postLoanDTI: 0.3,
      benchmarkRate: 11.5,
    };

    const result = computeProductRecommendations(engineResult, inputs);

    expect(result.recommendations).toHaveLength(1);
    expect(result.emptyMessage).toBeNull();

    const offer = result.recommendations[0];
    expect(offer.productType).toBe(RetentionProductType.HIGH_YIELD_SAVINGS);
    expect(offer.productName).toBe('High-Yield Savings with Direct Deposit');
    expect(offer.productIcon).toBe('piggy-bank');
    expect(offer.timelineMonths).toBe(3);
    expect(offer.timelineLabel).toBe('3 months of direct deposit history');
    expect(offer.keyTerms).toHaveLength(4);
    expect(offer.keyTerms).toContain('No minimum balance requirement');
    expect(offer.keyTerms).toContain('4.50% APY on all balances');
    expect(offer.gapMetrics.current).toBe(1500);
    expect(offer.gapMetrics.target).toBe(1800);
    expect(offer.gapMetrics.label).toBe('Monthly Income');
  });

  it('should use "supplemental income source" message when gap > 500', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 1200, // Gap of 600
      monthlyDebt: 100,
      creditScore: 680,
      loanAmount: 3000,
      termMonths: 12,
    };

    const engineResult: EngineResult = {
      decision: Decision.DECLINED,
      reasonCode: ReasonCode.INSUFFICIENT_INCOME,
      apr: 13.0,
      estimatedPayment: 270,
      postLoanDTI: 0.308,
      benchmarkRate: 11.5,
    };

    const result = computeProductRecommendations(engineResult, inputs);
    const offer = result.recommendations[0];

    expect(offer.qualificationGap).toContain('supplemental income source');
    expect(offer.qualificationGap).toContain('$1,800');
  });

  it('should use "direct deposit history" message when 0 < gap <= 500', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 1500, // Gap of 300
      monthlyDebt: 150,
      creditScore: 670,
      loanAmount: 4000,
      termMonths: 24,
    };

    const engineResult: EngineResult = {
      decision: Decision.DECLINED,
      reasonCode: ReasonCode.INSUFFICIENT_INCOME,
      apr: 14.5,
      estimatedPayment: 190,
      postLoanDTI: 0.227,
      benchmarkRate: 11.5,
    };

    const result = computeProductRecommendations(engineResult, inputs);
    const offer = result.recommendations[0];

    expect(offer.qualificationGap).toContain('direct deposit history');
    expect(offer.qualificationGap).toContain('$1,800');
    expect(offer.qualificationGap).not.toContain('supplemental income source');
  });

  it('should use stability message when income meets or exceeds threshold', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 2000, // Above threshold
      monthlyDebt: 50,
      creditScore: 660,
      loanAmount: 3500,
      termMonths: 12,
    };

    const engineResult: EngineResult = {
      decision: Decision.DECLINED,
      reasonCode: ReasonCode.INSUFFICIENT_INCOME,
      apr: 15.0,
      estimatedPayment: 310,
      postLoanDTI: 0.18,
      benchmarkRate: 11.5,
    };

    const result = computeProductRecommendations(engineResult, inputs);
    const offer = result.recommendations[0];

    expect(offer.qualificationGap).toBe(
      'Establish 3-month direct deposit history to demonstrate income stability'
    );
  });

  it('should always return 3-month timeline', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 1000,
      monthlyDebt: 100,
      creditScore: 650,
      loanAmount: 3000,
      termMonths: 24,
    };

    const engineResult: EngineResult = {
      decision: Decision.DECLINED,
      reasonCode: ReasonCode.INSUFFICIENT_INCOME,
      apr: 16.5,
      estimatedPayment: 150,
      postLoanDTI: 0.25,
      benchmarkRate: 11.5,
    };

    const result = computeProductRecommendations(engineResult, inputs);
    const offer = result.recommendations[0];

    expect(offer.timelineMonths).toBe(3);
    expect(offer.timelineLabel).toBe('3 months of direct deposit history');
  });

  it('should include all required key terms', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 1600,
      monthlyDebt: 200,
      creditScore: 650,
      loanAmount: 5000,
      termMonths: 24,
    };

    const engineResult: EngineResult = {
      decision: Decision.DECLINED,
      reasonCode: ReasonCode.INSUFFICIENT_INCOME,
      apr: 16.5,
      estimatedPayment: 250,
      postLoanDTI: 0.28,
      benchmarkRate: 11.5,
    };

    const result = computeProductRecommendations(engineResult, inputs);
    const offer = result.recommendations[0];

    expect(offer.keyTerms).toEqual([
      'No minimum balance requirement',
      '4.50% APY on all balances',
      'Set up direct deposit for bonus consideration',
      'Mobile app with budgeting tools',
    ]);
  });
});
