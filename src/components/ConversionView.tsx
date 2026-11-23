import type { EngineResult, ApplicantInputs, ProductRecommendation } from '../engine/types';
import { computeProductRecommendations } from '../engine/productMapper';
import { ProductOfferCard } from './ProductOfferCard';
import DeclineReasonDetail from './DeclineReasonDetail';

interface ConversionViewProps {
  inputs: ApplicantInputs;
  engineResult: EngineResult;
  onAcceptProduct: (recommendation: ProductRecommendation) => void;
  onReturnToSimulator: () => void;
}

/**
 * ConversionView Component
 * 
 * Main view for declined loan applications. Displays decline reason summary,
 * product recommendations (1-3 cards), and return-to-simulator navigation.
 * 
 * **Validates: Requirements 12.1, 12.5, 12.6**
 */
export function ConversionView({
  inputs,
  engineResult,
  onAcceptProduct,
  onReturnToSimulator,
}: ConversionViewProps) {
  const { recommendations, emptyMessage } = computeProductRecommendations(engineResult, inputs);

  return (
    <div className="space-y-8">
      {/* Decline Reason Summary with Exact Numbers */}
      <div className="rounded-lg bg-stone-50 p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Here is a path forward</h2>
        <DeclineReasonDetail engineResult={engineResult} inputs={inputs} />
      </div>

      {/* Product Offer Cards */}
      {recommendations.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-slate-900">Build Your Path to Yes</h3>
          <p className="text-sm text-slate-600">
            We have {recommendations.length} product{recommendations.length > 1 ? 's' : ''} you qualify for today that will help you reach approval:
          </p>
          <div className="grid gap-6">
            {recommendations.map((rec) => (
              <ProductOfferCard
                key={rec.productType}
                recommendation={rec}
                onAccept={onAcceptProduct}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-6 text-center">
          <p className="text-slate-700">{emptyMessage}</p>
        </div>
      )}

      {/* Return to Simulator Button */}
      <button
        onClick={onReturnToSimulator}
        className="w-full rounded-md border-2 border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-150"
      >
        Return to Simulator
      </button>
    </div>
  );
}
