
import { ArrowLeft } from 'lucide-react';
import {
  EngineResult,
  Decision,
  Lever,
  LeverOutcome,
  ApplicantInputs,
  ProductRecommendation,
} from '../../engine/types';
import { QuietStatusBadge } from '../QuietStatusBadge';
import { ConversionView } from '../ConversionView';
import { LeverOptionCard } from './LeverOptionCard';

export const MAX_LEVER_CARDS = 4;

/**
 * Orders levers for display: the recommended lever (matched by leverType) first,
 * the rest in solver order, capped at MAX_LEVER_CARDS.
 */
export function orderLeversForDisplay(
  levers: Lever[],
  recommendedLever?: Lever | null,
): Lever[] {
  if (!recommendedLever) return levers.slice(0, MAX_LEVER_CARDS);
  const match = levers.find((l) => l.leverType === recommendedLever.leverType);
  if (!match) return levers.slice(0, MAX_LEVER_CARDS);
  const rest = levers.filter((l) => l !== match);
  return [match, ...rest].slice(0, MAX_LEVER_CARDS);
}

interface EstimateStepProps {
  engineResult: EngineResult;
  loanAmount: number;
  termMonths: number;
  /** Deprecated: no longer drives a CTA. Kept optional for compatibility. */
  bestAlternative?: Lever | null;
  /** Most favorable lever; shown first with a recommended badge. */
  recommendedLever?: Lever | null;
  /** All solver levers to render as option cards. */
  allLevers?: Lever[];
  /** Current applicant inputs, passed to each lever card. */
  currentInputs?: ApplicantInputs;
  onCompareLever?: (lever: Lever) => void;
  onCompareTerms?: () => void;
  /** Called when a declined borrower accepts a product offer. */
  onAcceptProduct?: (recommendation: ProductRecommendation) => void;
  showUndo?: boolean;
  onEditDetails: () => void;
  onBack: () => void;
  onStartOver: () => void;
  onUndo?: () => void;
}

export function EstimateStep({
  engineResult,
  loanAmount,
  termMonths,
  allLevers = [],
  recommendedLever = null,
  currentInputs,
  onCompareLever,
  onAcceptProduct,
  showUndo = false,
  onEditDetails,
  onBack,
  onStartOver,
  onUndo,
}: EstimateStepProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getStatusInfo = () => {
    if (engineResult.decision === Decision.APPROVED) {
      return {
        message: 'Based on these details, you meet our standard criteria',
        showComparison: false,
      };
    } else if (engineResult.decision === Decision.COUNTER_OFFER) {
      return {
        message: termMonths === 24 
          ? 'With a 36-month term, your monthly payment could be lower'
          : 'Your application may qualify with adjusted terms',
        showComparison: termMonths === 24,
      };
    } else {
      return {
        message: 'With these details, monthly debt would exceed our criteria',
        showComparison: false,
      };
    }
  };

  const status = getStatusInfo();

  // Approved applicants need no adjustments. Gated on currentInputs like the options section.
  // Declined applicants see ConversionView instead, so they are excluded here.
  const showEmptyState =
    engineResult.decision !== Decision.APPROVED &&
    engineResult.decision !== Decision.DECLINED &&
    allLevers.length === 0 &&
    currentInputs !== undefined;

  const showConversion =
    engineResult.decision === Decision.DECLINED && currentInputs !== undefined;

  // Only levers that would actually lead to a counter-offer are shown beside the products.
  const displayLevers = showConversion
    ? allLevers.filter((l) => l.leverOutcome === LeverOutcome.COUNTER_OFFER)
    : allLevers;

  const secondaryActions = (
    <div className="flex justify-center gap-6 text-sm">
      <button
        onClick={onEditDetails}
        className="text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
      >
        Edit details
      </button>
      {showUndo && onUndo && (
        <button
          onClick={onUndo}
          className="text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
        >
          Undo
        </button>
      )}
      <button
        onClick={onStartOver}
        className="text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
      >
        Start over
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 md:px-8 lg:px-12">
      <div className="w-full max-w-6xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </button>
        </div>

        {showConversion && currentInputs ? (
          <div className="max-w-2xl mx-auto space-y-6" data-testid="declined-conversion">
            <ConversionView
              inputs={currentInputs}
              engineResult={engineResult}
              onAcceptProduct={(rec) => onAcceptProduct?.(rec)}
              onReturnToSimulator={onEditDetails}
            />
            {secondaryActions}
            <div className="text-center text-xs text-slate-500">Simulated estimate</div>
          </div>
        ) : (
        /* Estimate Card */
        <div className="bg-white rounded-2xl shadow-sm border-2 border-indigo-100 p-8 md:p-12 max-w-2xl mx-auto">
          {/* Giant Payment Display - Hero Element */}
          <div className="text-center mb-8">
            <h2 className="text-xl text-slate-700 mb-4">
              Your estimated monthly payment
            </h2>
            <div className="text-7xl font-bold text-slate-900 mb-3">
              {formatCurrency(engineResult.estimatedPayment)}
              <span className="text-3xl text-slate-600">/mo</span>
            </div>
            <div className="text-sm text-slate-600">
              ${loanAmount.toLocaleString()} | {termMonths} months | {engineResult.apr.toFixed(2)}% APR
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex justify-center mb-6">
            <QuietStatusBadge 
              decision={engineResult.decision} 
              reasonCode={engineResult.reasonCode} 
            />
          </div>

          {/* Plain Language Reason */}
          <p className="text-center text-slate-700 mb-8">
            {status.message}
          </p>

          {/* Secondary Actions - Text Links */}
          {secondaryActions}

          {/* Footer Disclaimer */}
          <div className="mt-6 text-center text-xs text-slate-500">
            Simulated estimate
          </div>
        </div>
        )}

        {/* Your options */}
        {displayLevers.length > 0 && currentInputs && (
          <section className="mt-10" data-testid="lever-options-section">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Your options</h2>
            <div className="space-y-4 md:grid md:grid-cols-2 md:gap-6 md:space-y-0">
              {orderLeversForDisplay(displayLevers, recommendedLever).map((lever) => (
                <LeverOptionCard
                  key={`${lever.leverType}-${lever.displayLabel}`}
                  lever={lever}
                  isRecommended={
                    recommendedLever != null && lever.leverType === recommendedLever.leverType
                  }
                  onCompare={(l) => onCompareLever?.(l)}
                  currentPayment={engineResult.estimatedPayment}
                  currentInputs={currentInputs}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state: no levers available (self-contained, easy to bypass for DECLINED) */}
        {showEmptyState && (
          <section
            className="mt-10 max-w-2xl mx-auto bg-white border border-slate-200 rounded-lg shadow-sm p-6 text-center"
            data-testid="no-levers-empty-state"
          >
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              No automatic adjustments available
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              Try changing your loan amount, term, or financial details to see new options.
            </p>
            <button
              type="button"
              onClick={onEditDetails}
              className="inline-flex items-center justify-center min-h-11 px-6 bg-white border-2 border-slate-300 hover:border-slate-400 rounded-md text-sm font-medium text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Edit details
            </button>
          </section>
        )}

        {/* Progress Indicator */}
        <div className="mt-6 text-center text-sm text-slate-600">
          Step 3 of 5
        </div>
      </div>
    </div>
  );
}
