// src/components/RateBenchmarkBadge.tsx
/**
 * RateBenchmarkBadge Component
 * Displays the current benchmark rate source and value with appropriate styling.
 */

import React from 'react';
import { RateSource } from '../engine/types';

interface RateBenchmarkBadgeProps {
  source: RateSource;
  benchmarkRate: number;
  referenceLabel: string;
}

/**
 * RateBenchmarkBadge displays the benchmark rate status with visual indicators
 * based on the data source (LIVE, CACHED, or OFFLINE).
 */
export function RateBenchmarkBadge({
  source,
  benchmarkRate,
  referenceLabel,
}: RateBenchmarkBadgeProps): React.ReactElement {
  // Determine badge styling based on source
  const getSourceInfo = (): { label: string; colorClass: string; icon: string } => {
    switch (source) {
      case RateSource.LIVE:
        return {
          label: 'Live FRED Rate',
          colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: '●',
        };
      case RateSource.CACHED:
        return {
          label: 'Cached Benchmark',
          colorClass: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: '●',
        };
      case RateSource.OFFLINE:
        return {
          label: 'Offline Benchmark',
          colorClass: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: '●',
        };
      default:
        return {
          label: 'Unknown',
          colorClass: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: '●',
        };
    }
  };

  const sourceInfo = getSourceInfo();

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${sourceInfo.colorClass}`}>
      <span className="text-xs font-bold">{sourceInfo.icon}</span>
      <span className="text-sm font-semibold">
        {sourceInfo.label}
      </span>
      <span className="text-sm font-medium text-slate-600">
        {benchmarkRate.toFixed(2)}% - {referenceLabel}
      </span>
    </div>
  );
}

export default RateBenchmarkBadge;
