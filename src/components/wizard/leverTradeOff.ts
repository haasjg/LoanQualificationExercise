import {
  LeverType,
  type ApplicantInputs,
  type CreditScoreMilestonePayload,
  type Lever,
  type PayDownDebtPayload,
  type ReduceAmountPayload,
} from '../../engine/types';

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function fmt(value: number): string {
  return usd.format(Math.round(value));
}

/** Describes a monthly payment change plus its effect on total repaid. */
function paymentSummary(monthlyDiff: number, totalDiff: number): string {
  const monthlyRounded = Math.round(Math.abs(monthlyDiff));
  const totalRounded = Math.round(Math.abs(totalDiff));
  const monthlyText =
    monthlyRounded === 0
      ? 'Same monthly payment'
      : monthlyDiff > 0
        ? `Save ${fmt(monthlyRounded)}/month`
        : `Pay ${fmt(monthlyRounded)}/month more`;
  const totalText =
    totalRounded === 0
      ? 'same total cost'
      : totalDiff > 0
        ? `pay ${fmt(totalRounded)} more total`
        : `pay ${fmt(totalRounded)} less total`;
  return `${monthlyText}, ${totalText}`;
}

/**
 * Builds the plain-English trade-off summary for a lever.
 * monthly difference = currentPayment - lever payment; total cost = payment * term.
 */
export function getLeverTradeOffText(
  lever: Lever,
  currentPayment: number,
  currentInputs: ApplicantInputs,
): string {
  const currentTerm = currentInputs.termMonths;
  const newTerm = lever.mutatedInputs.termMonths ?? currentTerm;
  const monthlyDiff = currentPayment - lever.resultingEstimatedPayment;
  const totalDiff =
    lever.resultingEstimatedPayment * newTerm - currentPayment * currentTerm;

  switch (lever.leverType) {
    case LeverType.PAY_DOWN_DEBT: {
      const { dReduce } = lever.payload as PayDownDebtPayload;
      return `Pay down ${fmt(dReduce)}/month of existing debt. Loan payment stays ${fmt(lever.resultingEstimatedPayment)}/month`;
    }
    case LeverType.CREDIT_SCORE_MILESTONE: {
      const { creditScore, monthlyPaymentReduction } =
        lever.payload as CreditScoreMilestonePayload;
      return `Reach a score of ${creditScore}: save ${fmt(monthlyPaymentReduction)}/month`;
    }
    case LeverType.REDUCE_AMOUNT: {
      const { loanAmount } = lever.payload as ReduceAmountPayload;
      return `Borrow ${fmt(loanAmount)} instead: ${paymentSummary(monthlyDiff, totalDiff)}`;
    }
    case LeverType.EXTEND_TERM:
    default:
      return `Extend to ${newTerm} months: ${paymentSummary(monthlyDiff, totalDiff)}`;
  }
}
