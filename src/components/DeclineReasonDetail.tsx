import { AlertCircle } from 'lucide-react';
import { ReasonCode, type EngineResult, type ApplicantInputs } from '../engine/types';

interface DeclineReasonDetailProps {
  engineResult: EngineResult;
  inputs: ApplicantInputs;
}

/**
 * DeclineReasonDetail sub-component for ConversionView.
 * Maps each ReasonCode to plain-English explanation with exact numbers.
 * Requirement 12.4: Display summary of why each specific metric failed.
 */
export default function DeclineReasonDetail({ engineResult, inputs }: DeclineReasonDetailProps) {
  const { reasonCode, estimatedPayment, postLoanDTI } = engineResult;
  const { monthlyIncome, monthlyDebt, creditScore } = inputs;

  // If no reason code, return null (should not happen for DECLINED decisions)
  if (!reasonCode) {
    return null;
  }

  let explanation = '';

  switch (reasonCode) {
    case ReasonCode.HIGH_DTI: {
      // HIGH_DTI: show (monthlyDebt + estimatedPayment), postLoanDTI%, target 45%
      const totalDebt = monthlyDebt + estimatedPayment;
      const dtiPercentage = (postLoanDTI * 100).toFixed(1);
      explanation = `Adding this loan would bring your total debt payments to $${totalDebt.toFixed(2)} per month ($${monthlyDebt.toFixed(2)} existing debt + $${estimatedPayment.toFixed(2)} loan payment), which is ${dtiPercentage}% of your $${monthlyIncome.toFixed(2)} monthly income. We require this ratio to be 45% or less.`;
      break;
    }

    case ReasonCode.HIGH_RISK_SCORE: {
      // HIGH_RISK_SCORE: show current score vs. minimum 600
      explanation = `Your current credit score of ${creditScore} is below our minimum requirement of 600 for an unsecured personal loan.`;
      break;
    }

    case ReasonCode.INSUFFICIENT_INCOME: {
      // INSUFFICIENT_INCOME: show current income vs. minimum $1,800
      explanation = `Your reported monthly income of $${monthlyIncome.toFixed(2)} does not meet our minimum threshold of $1,800.`;
      break;
    }

    case ReasonCode.EXCESSIVE_DEBT: {
      // EXCESSIVE_DEBT: show monthlyDebt vs. monthlyIncome
      const debtToIncomeRatio = ((monthlyDebt / monthlyIncome) * 100).toFixed(1);
      explanation = `Your existing monthly debt obligations of $${monthlyDebt.toFixed(2)} meet or exceed your monthly income of $${monthlyIncome.toFixed(2)} (${debtToIncomeRatio}% ratio).`;
      break;
    }

    case ReasonCode.LOAN_CAP_EXCEEDED: {
      // LOAN_CAP_EXCEEDED: show requested amount vs. $15,000 cap for 600-659 score range
      const { loanAmount } = inputs;
      explanation = `For applicants with credit scores in the 600-659 range, we cap unsecured loan amounts at $15,000. You requested $${loanAmount.toFixed(2)}.`;
      break;
    }

    default:
      // Fallback for any other reason codes (INVALID_TERM, INVALID_INPUT, etc.)
      explanation = 'Your application does not meet our current lending criteria.';
      break;
  }

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-6">
      <div className="flex items-start space-x-3">
        <div className="bg-rose-100 rounded-full p-2 flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-rose-600" />
        </div>
        <div className="flex-1">
          <h4 className="text-base font-semibold text-slate-900 mb-2">Why Was I Declined?</h4>
          <p className="text-sm text-slate-600 leading-relaxed">{explanation}</p>
        </div>
      </div>
    </div>
  );
}
