import type React from 'react';
import { LeverOutcome, type ApplicantInputs, type Lever } from '../../engine/types';
import { getLeverTradeOffText } from './leverTradeOff';

function formatPayment(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

export interface LeverOptionCardProps {
  lever: Lever;
  isRecommended: boolean;
  onCompare: (lever: Lever) => void;
  /** Current estimated monthly payment, used by trade-off display (13.2). */
  currentPayment: number;
  /** Current applicant inputs, used by trade-off display (13.2). */
  currentInputs: ApplicantInputs;
}

export function LeverOptionCard({
  lever,
  isRecommended,
  onCompare,
  currentPayment,
  currentInputs,
}: LeverOptionCardProps): React.ReactElement {
  const isApproved = lever.leverOutcome === LeverOutcome.APPROVED;
  const borderClasses = isRecommended
    ? 'border-2 border-indigo-300'
    : 'border border-slate-200';

  return (
    <div
      className={`bg-white rounded-lg p-6 shadow-sm ${borderClasses}`}
      data-testid="lever-option-card"
      data-recommended={isRecommended}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">{lever.displayLabel}</h3>
        {isRecommended && (
          <span
            className="text-xs font-semibold text-indigo-600 bg-indigo-100 rounded-full px-3 py-1.5"
            data-testid="lever-recommended-badge"
          >
            Recommended
          </span>
        )}
      </div>

      <div className="space-y-4" data-testid="lever-card-body">
        <div>
          <p className="text-3xl font-bold text-slate-900" data-testid="lever-payment">
            {formatPayment(lever.resultingEstimatedPayment)}
            <span className="text-sm font-normal text-slate-600">/month</span>
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${
            isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}
          data-testid="lever-outcome-badge"
        >
          {isApproved ? 'Likely approved' : 'Closer to approval'}
        </span>
        <p className="text-sm text-slate-600" data-testid="lever-trade-off">
          {getLeverTradeOffText(lever, currentPayment, currentInputs)}
        </p>
      </div>

      <div className="mt-4" data-testid="lever-card-footer">
        <button
          type="button"
          onClick={() => onCompare(lever)}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-md min-h-11 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
        >
          Compare this option
        </button>
      </div>
    </div>
  );
}
