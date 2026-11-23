import { X } from 'lucide-react';
import { Lever, SolverResult, EngineOutput } from '../engine/types';

interface AdverseActionModalProps {
  open: boolean;
  engineResult: EngineOutput | null;
  solverResult: SolverResult | null;
  onClose: () => void;
}

/**
 * Map reason codes to plain English explanations.
 */
const reasonCodeDescriptions: Record<string, string> = {
  HIGH_RISK_SCORE: 'Your credit score is below the minimum required for this loan',
  INSUFFICIENT_INCOME: 'Your income does not meet the minimum threshold',
  EXCESSIVE_DEBT: 'Your existing debt obligations exceed your monthly income',
  HIGH_DTI: 'Adding this loan would bring your total debt payments above 45% of your income',
  LOAN_CAP_EXCEEDED: 'The requested amount exceeds the $15,000 limit for your credit tier',
};

/**
 * Format a number as currency.
 */
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function AdverseActionModal({
  open,
  engineResult,
  solverResult,
  onClose,
}: AdverseActionModalProps) {
  // If modal is not open, render nothing
  if (!open) {
    return null;
  }

  // Handle click outside modal content
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  // Handle Escape key
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  // Get reason code description
  const getReasonDescription = (reasonCode: string | null): string => {
    if (!reasonCode) {
      return 'Your application could not be approved based on the information provided.';
    }
    return reasonCodeDescriptions[reasonCode] || 'Your application could not be approved based on the information provided.';
  };

  // Render levers section
  const renderLevers = () => {
    if (!solverResult) {
      return (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900">Path to Yes</h3>
          <p className="mt-2 text-sm text-gray-600">No levers available</p>
        </div>
      );
    }

    if (solverResult.levers.length === 0) {
      return (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900">Path to Yes</h3>
          <p className="mt-2 text-sm text-gray-600">
            {solverResult.emptyMessage || 'No mathematically feasible path to approval exists.'}
          </p>
        </div>
      );
    }

    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-900">Path to Yes</h3>
        <div className="mt-4 space-y-4">
          {solverResult.levers.map((lever: Lever, index: number) => (
            <div
              key={`${lever.leverType}-${index}`}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {lever.displayLabel}
                  </p>
                  <div className="mt-2 text-sm text-gray-600">
                    <p>
                      Projected DTI after fix:{' '}
                      <span className="font-medium text-gray-900">
                        {(lever.resultingPostLoanDTI * 100).toFixed(1)}%
                      </span>
                    </p>
                    <p>
                      New monthly payment:{' '}
                      <span className="font-medium text-gray-900">
                        {formatCurrency(lever.resultingEstimatedPayment)}/mo
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Outcome: {lever.leverOutcome === 'APPROVED' ? 'Approval' : 'Counter-Offer'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-gray-900/50 backdrop-blur-sm p-4"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal content */}
        <div className="p-6 sm:p-8">
          {/* Title */}
          <h2
            id="modal-title"
            className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-4"
          >
            WHY YOUR APPLICATION WAS DECLINED
          </h2>

          {/* Reason codes */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900">Decline Reasons</h3>
            <p className="mt-2 text-sm text-gray-700">
              {engineResult && 'reasonCode' in engineResult 
                ? getReasonDescription(engineResult.reasonCode) 
                : engineResult && 'kind' in engineResult 
                  ? engineResult.message 
                  : 'Reason not available.'}
            </p>
          </div>

          {/* Levers section */}
          {renderLevers()}

          {/* Close button at bottom */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={onClose}
              className="inline-flex items-center px-6 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
