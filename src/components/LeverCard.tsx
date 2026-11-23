import React from 'react';
import { CheckCircle, ArrowRight, DollarSign, TrendingUp, Target } from 'lucide-react';
import { Lever, LeverType, LeverOutcome } from '../engine/types';

// ============================================================================
// Helper Functions
// ============================================================================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getLeverIcon = (type: LeverType): React.ReactNode => {
  switch (type) {
    case LeverType.EXTEND_TERM:
      return <TrendingUp className="w-5 h-5" />;
    case LeverType.REDUCE_AMOUNT:
      return <DollarSign className="w-5 h-5" />;
    case LeverType.PAY_DOWN_DEBT:
      return <Target className="w-5 h-5" />;
    case LeverType.CREDIT_SCORE_MILESTONE:
      return <CheckCircle className="w-5 h-5" />;
    default:
      return null;
  }
};

const getLeverTitle = (type: LeverType, _outcome: Lever['leverOutcome']): string => {
  if (type === LeverType.EXTEND_TERM) {
    return 'Extend Loan Term';
  }
  if (type === LeverType.REDUCE_AMOUNT) {
    return 'Reduce Loan Amount';
  }
  if (type === LeverType.PAY_DOWN_DEBT) {
    return 'Pay Down Debt';
  }
  if (type === LeverType.CREDIT_SCORE_MILESTONE) {
    return 'Improve Credit Score';
  }
  return 'Adjust Loan Details';
};

// ============================================================================
// LeverCard Component
// ============================================================================

interface LeverCardProps {
  lever: Lever;
  onApplyFix: (lever: Lever) => void;
}

const LeverCard: React.FC<LeverCardProps> = ({ lever, onApplyFix }) => {
  const leverOutcomeText = lever.leverOutcome === LeverOutcome.APPROVED
    ? 'Leads to Approval'
    : 'Leads to Counter-Offer';

  const isApproval = lever.leverOutcome === LeverOutcome.APPROVED;

  return (
    <div className={`border-2 rounded-lg p-6 transition-all duration-200 ${
      isApproval
        ? 'border-emerald-200 bg-emerald-50 hover:shadow-md hover:-translate-y-0.5'
        : 'border-amber-200 bg-amber-50 hover:shadow-md hover:-translate-y-0.5'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className={`p-2.5 rounded-lg flex-shrink-0 ${
            isApproval
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
          }`}>
            {getLeverIcon(lever.leverType)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-900">
              {getLeverTitle(lever.leverType, lever.leverOutcome)}
            </h3>
            <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">
              {lever.displayLabel}
            </p>
            <div className="flex items-center flex-wrap gap-3 mt-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                isApproval
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {leverOutcomeText}
              </span>
              <span className="text-sm text-slate-600">
                New DTI: <span className="font-semibold text-slate-900">{(lever.resultingPostLoanDTI * 100).toFixed(1)}%</span>
              </span>
              <span className="text-sm text-slate-600">
                Payment: <span className="font-semibold text-slate-900">{formatCurrency(lever.resultingEstimatedPayment)}/mo</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => onApplyFix(lever)}
          className={`inline-flex items-center px-5 py-2.5 text-sm font-semibold rounded-md shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            isApproval
              ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-md focus:ring-emerald-500 text-white'
              : 'bg-amber-600 hover:bg-amber-700 hover:shadow-md focus:ring-amber-500 text-white'
          }`}
        >
          Apply This Fix
          <ArrowRight className="ml-2 h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default LeverCard;
