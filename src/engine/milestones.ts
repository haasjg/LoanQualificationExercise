// src/engine/milestones.ts
// Milestone catalog for retention product types

import { RetentionProductType, MilestoneStatus } from './types';

/**
 * Returns the initial milestone catalog for a given retention product type.
 * All milestones start with completed=false and completedAt=null.
 * 
 * @param productType - The retention product type
 * @returns Array of MilestoneStatus objects with completed=false
 * 
 * **Validates: Requirements 13.3**
 */
export function getInitialMilestones(productType: RetentionProductType): MilestoneStatus[] {
  switch (productType) {
    case RetentionProductType.SECURED_CREDIT_BUILDER:
      return [
        {
          milestoneId: 'scb-open',
          label: 'Open secured credit builder account',
          completed: false,
          completedAt: null,
        },
        {
          milestoneId: 'scb-first-payment',
          label: 'Make first on-time payment',
          completed: false,
          completedAt: null,
        },
        {
          milestoneId: 'scb-3-months',
          label: 'Complete 3 months of on-time payments',
          completed: false,
          completedAt: null,
        },
        {
          milestoneId: 'scb-6-months',
          label: 'Complete 6 months of on-time payments',
          completed: false,
          completedAt: null,
        },
        {
          milestoneId: 'scb-score-update',
          label: 'Credit score update showing improvement',
          completed: false,
          completedAt: null,
        },
      ];

    case RetentionProductType.HIGH_YIELD_SAVINGS:
      return [
        {
          milestoneId: 'hys-open',
          label: 'Open high-yield savings account',
          completed: false,
          completedAt: null,
        },
        {
          milestoneId: 'hys-direct-deposit',
          label: 'Set up direct deposit',
          completed: false,
          completedAt: null,
        },
        {
          milestoneId: 'hys-3-months',
          label: 'Maintain 3 months of consistent deposits',
          completed: false,
          completedAt: null,
        },
        {
          milestoneId: 'hys-emergency-fund',
          label: 'Build emergency fund to target amount',
          completed: false,
          completedAt: null,
        },
      ];

    case RetentionProductType.MICRO_LOAN:
      return [
        {
          milestoneId: 'ml-accept',
          label: 'Accept micro-loan offer',
          completed: false,
          completedAt: null,
        },
        {
          milestoneId: 'ml-first-payment',
          label: 'Make first on-time payment',
          completed: false,
          completedAt: null,
        },
        {
          milestoneId: 'ml-50-percent',
          label: 'Complete 50% of loan term',
          completed: false,
          completedAt: null,
        },
        {
          milestoneId: 'ml-payoff',
          label: 'Pay off loan in full',
          completed: false,
          completedAt: null,
        },
      ];

    case RetentionProductType.DEBT_CONSOLIDATION:
      return [
        {
          milestoneId: 'dc-accept',
          label: 'Accept consolidation offer',
          completed: false,
          completedAt: null,
        },
        {
          milestoneId: 'dc-close-accounts',
          label: 'Close original high-interest accounts',
          completed: false,
          completedAt: null,
        },
        {
          milestoneId: 'dc-verify-reduction',
          label: 'Verify monthly debt reduction',
          completed: false,
          completedAt: null,
        },
        {
          milestoneId: 'dc-maintain-2-months',
          label: 'Maintain on-time payments for 2 months',
          completed: false,
          completedAt: null,
        },
      ];

    default:
      // TypeScript exhaustiveness check - should never reach here
      const _exhaustive: never = productType;
      throw new Error(`Unknown retention product type: ${_exhaustive}`);
  }
}
