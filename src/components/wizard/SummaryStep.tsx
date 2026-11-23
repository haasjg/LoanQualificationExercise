import { EngineResult, Decision } from '../../engine/types';

interface SummaryStepProps {
  engineResult: EngineResult;
  loanAmount: number;
  termMonths: number;
  originalTerm?: number;
  originalPayment?: number;
  /** Loan amount before a lever was applied; used to describe amount changes. */
  originalAmount?: number;
  onStartOver: () => void;
  onExploreAnother: () => void;
}

export function SummaryStep({
  engineResult,
  loanAmount,
  termMonths,
  originalTerm,
  originalPayment,
  originalAmount,
  onStartOver,
  onExploreAnother,
}: SummaryStepProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const totalCost = engineResult.estimatedPayment * termMonths;
  const termChanged = originalTerm && originalTerm !== termMonths;
  const amountChanged = originalAmount !== undefined && originalAmount !== loanAmount;
  const anyChange = termChanged || amountChanged;
  const paymentReduction = originalPayment && anyChange
    ? originalPayment - engineResult.estimatedPayment
    : 0;
  const paymentSuffix = paymentReduction > 0 ? ` by ${formatCurrency(paymentReduction)}` : '';

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 md:px-8 lg:px-12">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header with secondary links */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={onExploreAnother}
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            Edit details
          </button>
          <button
            onClick={onStartOver}
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            Start over
          </button>
        </div>

        {/* Page Title */}
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          Your loan summary
        </h2>

        {/* Summary Card - Clean slate-100 bg */}
        <div className="bg-slate-100 rounded-lg p-6 mb-6 max-w-2xl mx-auto">
          <div className="space-y-4">
            <div className="flex justify-between text-base">
              <span className="text-slate-600">Loan amount</span>
              <span className="font-semibold text-slate-900">${loanAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-base">
              <span className="text-slate-600">Loan term</span>
              <span className="font-semibold text-slate-900">{termMonths} months</span>
            </div>
            <div className="flex justify-between text-base">
              <span className="text-slate-600">Estimated payment</span>
              <span className="font-semibold text-slate-900">{formatCurrency(engineResult.estimatedPayment)}/mo</span>
            </div>
            <div className="flex justify-between text-base">
              <span className="text-slate-600">APR</span>
              <span className="font-semibold text-slate-900">{engineResult.apr.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-base">
              <span className="text-slate-600">Total cost</span>
              <span className="font-semibold text-slate-900">{formatCurrency(totalCost)}</span>
            </div>
          </div>
        </div>

        {/* What Changed Section */}
        {anyChange && (
          <div className="mb-6 max-w-2xl mx-auto">
            <h3 className="text-base font-semibold text-slate-900 mb-2">What changed</h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              {termChanged && (
                <p className="text-sm text-slate-700">
                  Extended term from {originalTerm} to {termMonths} months to lower monthly payment{amountChanged ? '' : paymentSuffix}.
                </p>
              )}
              {amountChanged && (
                <p className="text-sm text-slate-700">
                  {loanAmount < (originalAmount ?? 0) ? 'Reduced' : 'Changed'} loan amount from ${(originalAmount ?? 0).toLocaleString()} to ${loanAmount.toLocaleString()}{termChanged ? '' : ` to lower monthly payment${paymentSuffix}`}.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="border-t border-slate-200 pt-4 mb-6 max-w-2xl mx-auto">
          <p className="text-sm font-semibold text-slate-700">
            Simulated estimate - not a final offer
          </p>
        </div>

        {/* Primary CTA */}
        <button
          onClick={onExploreAnother}
          className="w-full py-3 text-base font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors max-w-2xl mx-auto block"
        >
          {engineResult.decision === Decision.APPROVED || engineResult.decision === Decision.COUNTER_OFFER
            ? 'Start your application'
            : 'Explore other options'}
        </button>
      </div>
    </div>
  );
}
