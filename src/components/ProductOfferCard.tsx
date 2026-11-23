import React from 'react';
import * as LucideIcons from 'lucide-react';
import { ProductRecommendation } from '../engine/types';

interface ProductOfferCardProps {
  recommendation: ProductRecommendation;
  onAccept: (recommendation: ProductRecommendation) => void;
}

/**
 * ProductOfferCard Component
 * 
 * Displays a recommended financial product for declined applicants.
 * Shows product details, qualification gap, timeline estimate, key terms,
 * and gap metrics with an "Accept & Start Plan" CTA.
 * 
 * **Validates: Requirements 12.2**
 */
export function ProductOfferCard({ recommendation, onAccept }: ProductOfferCardProps) {
  // Dynamically resolve the icon from lucide-react by name
  const IconComponent = (LucideIcons as any)[recommendation.productIcon] as React.ComponentType<{ className?: string }> | undefined;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Product Icon and Header */}
      <div className="flex items-start space-x-4 mb-6">
        <div className="bg-indigo-100 text-indigo-600 p-3 rounded-full flex-shrink-0">
          {IconComponent ? (
            <IconComponent className="w-6 h-6" />
          ) : (
            <LucideIcons.HelpCircle className="w-6 h-6" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            {recommendation.productName}
          </h3>
          <p className="text-sm text-slate-600">{recommendation.qualificationGap}</p>
        </div>
      </div>

      {/* Timeline Estimate */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-2">
          <LucideIcons.Clock className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Estimated Timeline</span>
        </div>
        <p className="text-sm text-slate-600 ml-6">{recommendation.timelineLabel}</p>
      </div>

      {/* Key Terms */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-3">
          <LucideIcons.FileText className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Key Terms</span>
        </div>
        <ul className="space-y-2 ml-6">
          {recommendation.keyTerms.map((term, index) => (
            <li key={index} className="flex items-start space-x-2">
              <span className="text-indigo-600 mt-1">•</span>
              <span className="text-sm text-slate-600">{term}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Gap Metrics */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-3">
          <LucideIcons.TrendingUp className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">{recommendation.gapMetrics.label}</span>
        </div>
        <div className="ml-6 flex items-center space-x-2">
          <span className="text-sm font-semibold text-slate-900">
            Current: {recommendation.gapMetrics.current}
          </span>
          <LucideIcons.ArrowRight className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-emerald-700">
            Target: {recommendation.gapMetrics.target}
          </span>
        </div>
      </div>

      {/* CTA Button */}
      <button
        onClick={() => onAccept(recommendation)}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-md min-h-11 px-6 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
      >
        Accept & Start Plan
      </button>
    </div>
  );
}
