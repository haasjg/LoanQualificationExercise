import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Decision, type EngineOutput, type EngineError, type ApplicantInputs } from '../engine/types';

interface DecisionBannerProps {
  engineResult: EngineOutput | null;
  inputs: ApplicantInputs | null;
  onOpenAdverseModal: () => void;
}

// Type guard to check if engineResult is an EngineError
function isEngineError(result: EngineOutput): result is EngineError {
  return (result as EngineError).kind === 'ENGINE_ERROR';
}

export default function DecisionBanner({ engineResult, inputs, onOpenAdverseModal }: DecisionBannerProps) {
  // Loading state
  if (engineResult === null) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8">
        <div className="flex items-center space-x-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-base font-medium">Computing decision...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (isEngineError(engineResult)) {
    return (
      <div className="bg-rose-50 rounded-lg border-2 border-rose-200 shadow-sm p-8">
        <div className="flex items-start space-x-4">
          <XCircle className="w-8 h-8 text-rose-600 flex-shrink-0" />
          <div>
            <h3 className="text-xl font-semibold text-rose-900">Unable to Process Application</h3>
            <p className="mt-2 text-sm text-rose-700">{engineResult.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // APPROVED state
  if (engineResult.decision === Decision.APPROVED) {
    return (
      <div className="bg-emerald-50 rounded-lg border-2 border-emerald-200 shadow-sm p-8">
        <div className="flex items-start space-x-4">
          <CheckCircle className="w-8 h-8 text-emerald-600 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-emerald-900">Congratulations! You're Approved</h3>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium text-emerald-700 mb-1">Annual Percentage Rate</p>
                <p className="text-3xl font-bold text-emerald-900">{engineResult.apr.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-700 mb-1">Estimated Monthly Payment</p>
                <p className="text-3xl font-bold text-emerald-900">
                  ${engineResult.estimatedPayment.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-700 mb-1">Loan Term</p>
                <p className="text-3xl font-bold text-emerald-900">{inputs?.termMonths} months</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // COUNTER_OFFER state
  if (engineResult.decision === Decision.COUNTER_OFFER) {
    let reasonText = '';
    
    if (engineResult.postLoanDTI > 0.36 && engineResult.postLoanDTI <= 0.45) {
      reasonText = 'Your debt-to-income ratio is slightly above our standard threshold. We can still work with you.';
    } else if (engineResult.apr > 15) {
      reasonText = 'We can offer you a loan with adjusted terms to improve affordability.';
    } else {
      reasonText = 'We can offer you a loan with modified terms to improve affordability.';
    }

    return (
      <div className="bg-amber-50 rounded-lg border-2 border-amber-200 shadow-sm p-8">
        <div className="flex items-start space-x-4">
          <AlertTriangle className="w-8 h-8 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-amber-900">We Can Work With You</h3>
            <p className="mt-2 text-sm text-amber-700">{reasonText}</p>
            
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium text-amber-700 mb-1">Annual Percentage Rate</p>
                <p className="text-2xl font-bold text-amber-900">{engineResult.apr.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-sm font-medium text-amber-700 mb-1">Current Monthly Payment</p>
                <p className="text-2xl font-bold text-amber-900">
                  ${engineResult.estimatedPayment.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-amber-700 mb-1">Post-Loan DTI</p>
                <p className="text-2xl font-bold text-amber-900">
                  {(engineResult.postLoanDTI * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DECLINED state
  if (engineResult.decision === Decision.DECLINED) {
    let declineSummary = '';
    
    if (engineResult.reasonCode === 'HIGH_RISK_SCORE') {
      declineSummary = 'Your credit score is below our minimum requirement for standard unsecured loans.';
    } else if (engineResult.reasonCode === 'INSUFFICIENT_INCOME') {
      declineSummary = 'Your monthly income does not meet our minimum requirements for loan approval.';
    } else if (engineResult.reasonCode === 'EXCESSIVE_DEBT') {
      declineSummary = 'Your current debt obligations are too high relative to your income.';
    } else if (engineResult.reasonCode === 'HIGH_DTI') {
      declineSummary = 'After adding this loan, your debt-to-income ratio would exceed our tolerance threshold.';
    } else {
      declineSummary = 'Based on your application, we cannot currently approve this loan.';
    }

    return (
      <div className="bg-rose-50 rounded-lg border-2 border-rose-200 shadow-sm p-8">
        <div className="flex items-start space-x-4">
          <XCircle className="w-8 h-8 text-rose-600 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-rose-900">Application Declined</h3>
            <p className="mt-2 text-sm text-rose-700">{declineSummary}</p>
            
            <div className="mt-6">
              <button
                onClick={onOpenAdverseModal}
                className="inline-flex items-center px-4 py-2 text-sm font-semibold text-rose-700 bg-white border-2 border-rose-300 rounded-md hover:border-rose-400 hover:shadow-sm transition-all duration-150"
              >
                View Decline Reasons
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback state (should not occur)
  return (
    <div className="bg-slate-50 rounded-lg border border-slate-200 shadow-sm p-8">
      <p className="text-sm text-slate-600">Unable to determine decision status.</p>
    </div>
  );
}
