// src/engine/milestones.test.ts
import { describe, it, expect } from 'vitest';
import { getInitialMilestones } from './milestones';
import { RetentionProductType } from './types';

describe('getInitialMilestones', () => {
  it('returns 5 milestones for SECURED_CREDIT_BUILDER', () => {
    const milestones = getInitialMilestones(RetentionProductType.SECURED_CREDIT_BUILDER);
    
    expect(milestones).toHaveLength(5);
    expect(milestones[0]).toEqual({
      milestoneId: 'scb-open',
      label: 'Open secured credit builder account',
      completed: false,
      completedAt: null,
    });
    expect(milestones[4]).toEqual({
      milestoneId: 'scb-score-update',
      label: 'Credit score update showing improvement',
      completed: false,
      completedAt: null,
    });
  });

  it('returns 4 milestones for HIGH_YIELD_SAVINGS', () => {
    const milestones = getInitialMilestones(RetentionProductType.HIGH_YIELD_SAVINGS);
    
    expect(milestones).toHaveLength(4);
    expect(milestones[0]).toEqual({
      milestoneId: 'hys-open',
      label: 'Open high-yield savings account',
      completed: false,
      completedAt: null,
    });
    expect(milestones[3]).toEqual({
      milestoneId: 'hys-emergency-fund',
      label: 'Build emergency fund to target amount',
      completed: false,
      completedAt: null,
    });
  });

  it('returns 4 milestones for MICRO_LOAN', () => {
    const milestones = getInitialMilestones(RetentionProductType.MICRO_LOAN);
    
    expect(milestones).toHaveLength(4);
    expect(milestones[0]).toEqual({
      milestoneId: 'ml-accept',
      label: 'Accept micro-loan offer',
      completed: false,
      completedAt: null,
    });
    expect(milestones[3]).toEqual({
      milestoneId: 'ml-payoff',
      label: 'Pay off loan in full',
      completed: false,
      completedAt: null,
    });
  });

  it('returns 4 milestones for DEBT_CONSOLIDATION', () => {
    const milestones = getInitialMilestones(RetentionProductType.DEBT_CONSOLIDATION);
    
    expect(milestones).toHaveLength(4);
    expect(milestones[0]).toEqual({
      milestoneId: 'dc-accept',
      label: 'Accept consolidation offer',
      completed: false,
      completedAt: null,
    });
    expect(milestones[3]).toEqual({
      milestoneId: 'dc-maintain-2-months',
      label: 'Maintain on-time payments for 2 months',
      completed: false,
      completedAt: null,
    });
  });

  it('ensures all milestones start with completed=false', () => {
    const allProductTypes = [
      RetentionProductType.SECURED_CREDIT_BUILDER,
      RetentionProductType.HIGH_YIELD_SAVINGS,
      RetentionProductType.MICRO_LOAN,
      RetentionProductType.DEBT_CONSOLIDATION,
    ];

    allProductTypes.forEach(productType => {
      const milestones = getInitialMilestones(productType);
      milestones.forEach(milestone => {
        expect(milestone.completed).toBe(false);
        expect(milestone.completedAt).toBeNull();
      });
    });
  });

  it('ensures all milestone IDs are unique within each product type', () => {
    const allProductTypes = [
      RetentionProductType.SECURED_CREDIT_BUILDER,
      RetentionProductType.HIGH_YIELD_SAVINGS,
      RetentionProductType.MICRO_LOAN,
      RetentionProductType.DEBT_CONSOLIDATION,
    ];

    allProductTypes.forEach(productType => {
      const milestones = getInitialMilestones(productType);
      const ids = milestones.map(m => m.milestoneId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  it('ensures all milestone labels are non-empty', () => {
    const allProductTypes = [
      RetentionProductType.SECURED_CREDIT_BUILDER,
      RetentionProductType.HIGH_YIELD_SAVINGS,
      RetentionProductType.MICRO_LOAN,
      RetentionProductType.DEBT_CONSOLIDATION,
    ];

    allProductTypes.forEach(productType => {
      const milestones = getInitialMilestones(productType);
      milestones.forEach(milestone => {
        expect(milestone.label).toBeTruthy();
        expect(milestone.label.length).toBeGreaterThan(0);
      });
    });
  });
});
