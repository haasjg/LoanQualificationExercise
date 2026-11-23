import { useMemo } from 'react';
import { ArrowLeft, TrendingDown, TrendingUp } from 'lucide-react';
import {
  ApplicantInputs,
  EngineResult,
  Lever,
  LeverType,
  PayDownDebtPayload,
} from '../../engine/types';
import { evaluateDecision } from '../../engine/underwriting';

interface ComparisonStepProps {
  originalInputs: ApplicantInputs;
  originalEstimate: EngineResult;
  alternativeInputs: ApplicantInputs;
  alternativeEstimate: EngineResult;
  selectedLever?: Lever | null;

  onSelectAlternative: () => void;
  onKeepOriginal: () => void;
  onEditDetails: () => void;
  onBack: () => void;
}

export function ComparisonStep({
  originalInputs,
  originalEstimate,
  alternativeInputs: alternativeInputsProp,
  alternativeEstimate: alternativeEstimateProp,
  selectedLever,

  onSelectAlternative,
  onKeepOriginal,
  onEditDetails,
  onBack,
}: ComparisonStepProps) {
  const alternativeInputs: ApplicantInputs = selectedLever
    ? { ...originalInputs, ...selectedLever.mutatedInputs }
    : alternativeInputsProp;

  const alternativeEstimate: EngineResult = useMemo(() => {
    if (!selectedLever) return alternativeEstimateProp;
    const result = evaluateDecision(
      { ...originalInputs, ...selectedLever.mutatedInputs },
      originalEstimate.benchmarkRate
    );
    return 'kind' in result ? alternativeEstimateProp : result;
  }, [selectedLever, originalInputs, originalEstimate.benchmarkRate, alternativeEstimateProp]);

  const getActionLabel = (): string => {
    if (!selectedLever) return `Use ${alternativeInputs.termMonths} months`;
    switch (selectedLever.leverType) {
      case LeverType.EXTEND_TERM:
        return `Use ${alternativeInputs.termMonths} months`;
      case LeverType.REDUCE_AMOUNT:
        return `Borrow ${formatCurrency(alternativeInputs.loanAmount)} instead`;
      default:
        return 'Use this option';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return value.toFixed(2) + '%';
  };

  // Use rounded (displayed) payments so shown numbers add up
  const originalPayment = Math.round(originalEstimate.estimatedPayment);
  const alternativePayment = Math.round(alternativeEstimate.estimatedPayment);
  const originalTotal = originalPayment * originalInputs.termMonths;
  const alternativeTotal = alternativePayment * alternativeInputs.termMonths;
  const monthlyDifference = originalPayment - alternativePayment;
  const totalDifference = alternativeTotal - originalTotal;
  
  const isLowerMonthly = monthlyDifference > 0;
  const isLowerTotal = totalDifference < 0;

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 md:px-8 lg:px-12">
      <div className="w-full max-w-6xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            Compare your options
          </h2>
          <p className="text-slate-600">
            Choose the option that works best for your budget
          </p>
        </div>

        {/* Two-Column Comparison (Desktop) / Stacked (Mobile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6 max-w-4xl mx-auto">
          {/* Left: Original Estimate */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="text-sm font-medium text-slate-600 mb-4">
              Your original estimate
            </div>
            
            {/* Amount (if different from alternative) */}
            {originalInputs.loanAmount !== alternativeInputs.loanAmount && (
              <div className="mb-3">
                <div className="text-xs text-slate-500 mb-1">Amount</div>
                <div className="text-lg font-semibold text-slate-900">
                  {formatCurrency(originalInputs.loanAmount)}
                </div>
              </div>
            )}
            
            {/* Term */}
            <div className="mb-3">
              <div className="text-xs text-slate-500 mb-1">Term</div>
              <div className="text-base font-medium text-slate-900">
                {originalInputs.termMonths} months
              </div>
            </div>
            
            {/* Monthly Payment - Prominent */}
            <div className="mb-3">
              <div className="text-xs text-slate-500 mb-1">Monthly payment</div>
              <div className="text-4xl font-bold text-slate-900">
                {formatCurrency(originalPayment)}
              </div>
            </div>
            
            {/* APR */}
            <div className="mb-3">
              <div className="text-xs text-slate-500 mb-1">APR</div>
              <div className="text-base font-medium text-slate-900">
                {formatPercent(originalEstimate.apr)}
              </div>
            </div>
            
            {/* Total Cost */}
            <div className="mb-4 pb-4 border-b border-slate-200">
              <div className="text-xs text-slate-500 mb-1">Total cost</div>
              <div className="text-base font-medium text-slate-900">
                {formatCurrency(originalTotal)}
              </div>
            </div>
            
            {/* Keep Original Button */}
            <button
              onClick={onKeepOriginal}
              className="w-full py-3 text-base font-medium text-slate-700 bg-white border-2 border-slate-300 rounded-md hover:border-slate-400 transition-colors"
            >
              Keep original
            </button>
          </div>

          {/* Right: Alternative Estimate */}
          <div className="bg-white rounded-lg shadow-sm border-2 border-indigo-300 p-6">
            <div className="text-sm font-medium text-indigo-600 mb-4">
              {selectedLever ? selectedLever.displayLabel : 'Suggested alternative'}
            </div>
            
            {/* Amount (if different from original) */}
            {originalInputs.loanAmount !== alternativeInputs.loanAmount && (
              <div className="mb-3">
                <div className="text-xs text-slate-500 mb-1">Amount</div>
                <div className="text-lg font-semibold text-slate-900">
                  {formatCurrency(alternativeInputs.loanAmount)}
                </div>
              </div>
            )}
            
            {/* Term */}
            <div className="mb-3">
              <div className="text-xs text-slate-500 mb-1">Term</div>
              <div className="text-base font-medium text-slate-900">
                {alternativeInputs.termMonths} months
              </div>
            </div>
            
            {/* Monthly Payment - Prominent */}
            <div className="mb-3">
              <div className="text-xs text-slate-500 mb-1">Monthly payment</div>
              <div className="text-4xl font-bold text-slate-900">
                {formatCurrency(alternativePayment)}
              </div>
            </div>
            
            {/* APR */}
            <div className="mb-3">
              <div className="text-xs text-slate-500 mb-1">APR</div>
              <div className="text-base font-medium text-slate-900">
                {formatPercent(alternativeEstimate.apr)}
              </div>
            </div>
            
            {/* Total Cost */}
            <div className="mb-4 pb-4 border-b border-slate-200">
              <div className="text-xs text-slate-500 mb-1">Total cost</div>
              <div className="text-base font-medium text-slate-900">
                {formatCurrency(alternativeTotal)}
              </div>
            </div>
            
            {/* Use Alternative Button */}
            <button
              onClick={onSelectAlternative}
              className="w-full py-3 text-base font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
            >
              {getActionLabel()}
            </button>
          </div>
        </div>

        {/* Trade-off Summary */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 max-w-4xl mx-auto">
          <div className="space-y-2 text-sm text-amber-900">
            {selectedLever?.leverType === LeverType.PAY_DOWN_DEBT ? (
              <>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-amber-700 flex-shrink-0" />
                  <span>
                    <strong>Pay down monthly debt by:</strong>{' '}
                    {formatCurrency((selectedLever.payload as PayDownDebtPayload).dReduce)} per month
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-amber-700 flex-shrink-0" />
                  <span>
                    <strong>Resulting debt-to-income:</strong>{' '}
                    {(alternativeEstimate.postLoanDTI * 100).toFixed(1)}%
                  </span>
                </div>
              </>
            ) : (
              <>
              {/* Row 1: Monthly Difference */}
              <div className="flex items-center gap-2">
                {isLowerMonthly ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-amber-700 flex-shrink-0" />
                    <span>
                      <strong>Monthly savings:</strong> {formatCurrency(Math.abs(monthlyDifference))}
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 text-amber-700 flex-shrink-0" />
                    <span>
                      <strong>Pay {formatCurrency(Math.abs(monthlyDifference))} more per month</strong>
                    </span>
                  </>
                )}
              </div>
              
              {/* Row 2: Total Cost Difference */}
              <div className="flex items-center gap-2">
                {isLowerTotal ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-amber-700 flex-shrink-0" />
                    <span>
                      <strong>Total cost difference:</strong> {formatCurrency(Math.abs(totalDifference))} less
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 text-amber-700 flex-shrink-0" />
                    <span>
                      <strong>Total cost difference:</strong> {formatCurrency(Math.abs(totalDifference))} more total interest
                    </span>
                  </>
                )}
              </div>
              {selectedLever?.leverType === LeverType.CREDIT_SCORE_MILESTONE && (
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-amber-700 flex-shrink-0" />
                  <span>
                    <strong>New APR:</strong> {formatPercent(alternativeEstimate.apr)}. Requires reaching a credit score of {alternativeInputs.creditScore}.
                  </span>
                </div>
              )}
              </>
            )}
          </div>
        </div>

        {/* Edit Details Link */}
        <div className="text-center">
          <button
            onClick={onEditDetails}
            className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
          >
            Edit details
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="mt-6 text-center text-sm text-slate-500">
          Step 4 of 5
        </div>
      </div>
    </div>
  );
}
