// src/engine/index.ts
/**
 * Public API entry point for the underwriting engine.
 * Re-exports all types, constants, and functions from engine modules.
 */

// Types and constants from types.ts
export * from './types';

// Functions from apr.ts
export { computeAPR } from './apr';

// Functions from amortization.ts
export { roundHalfUp, computeEstimatedPayment, computePostLoanDTI } from './amortization';

// Functions from underwriting.ts
export { validateInputs, evaluateDecision } from './underwriting';

// Functions from solver.ts
export {
  computeLevers,
  computeExtendTermLever,
  computeReduceAmountLever,
  computePayDownDebtLever,
  computeCreditScoreMilestoneLever,
} from './solver';

// Functions from productMapper.ts
export { computeProductRecommendations } from './productMapper';

// Functions from milestones.ts
export { getInitialMilestones } from './milestones';
