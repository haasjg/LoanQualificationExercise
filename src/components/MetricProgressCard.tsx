import React from 'react';

/**
 * Props for MetricProgressCard component
 * **Validates: Requirements 13.2**
 */
export interface MetricProgressCardProps {
  label: string;
  current: number;
  target: number;
  unit: 'currency' | 'percentage' | 'score';
  isInverse?: boolean; // true for DTI and debt (lower is better)
  min?: number; // minimum baseline for normal metrics (default: 0)
  max?: number; // initial/maximum value for inverse metrics (required for proper progress tracking)
}

/**
 * MetricProgressCard displays a single financial metric with progress visualization.
 * Uses inverse coloring for metrics where lower values are better (DTI, debt).
 * 
 * **Validates: Requirements 13.2**
 */
export function MetricProgressCard({
  label,
  current,
  target,
  unit,
  isInverse = false,
  min = 0,
  max,
}: MetricProgressCardProps): React.ReactElement {
  // Format values based on unit type
  const formatValue = (value: number): string => {
    switch (unit) {
      case 'currency':
        return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'score':
        return value.toString();
      default:
        return value.toString();
    }
  };

  // Calculate progress percentage
  // **Validates: Requirements 13.2**
  // For normal metrics (credit score, income): progress = (current - min) / (target - min)
  // For inverse metrics (DTI, debt): progress = (max - current) / (max - target)
  const calculateProgress = (): number => {
    if (isInverse) {
      // For inverse metrics: lower is better
      // If current <= target, we've achieved 100% progress
      if (current <= target) {
        return 100;
      }
      
      if (max !== undefined) {
        // Use the proper progress formula with explicit max (initial value)
        // If target equals max, avoid division by zero - return 0% (no progress possible)
        if (max === target) {
          return 0;
        }
        
        // If current >= max, we've made 0% progress (or regressed)
        if (current >= max) {
          return 0;
        }
        
        // Progress = (max - current) / (max - target)
        const progress = ((max - current) / (max - target)) * 100;
        return Math.max(0, Math.min(100, progress));
      } else {
        // Fallback for when max is not provided: use simplified formula
        // This provides reasonable behavior for inverse metrics without tracking history
        // Progress = (current - target) / current
        // This shows how much of the gap to target has been closed
        const progress = ((current - target) / current) * 100;
        return Math.max(0, Math.min(100, progress));
      }
    } else {
      // For normal metrics: higher is better
      // If current >= target, we've achieved 100% progress
      if (current >= target) {
        return 100;
      }
      
      // If target equals min, avoid division by zero - return 100% (target achieved)
      if (target === min) {
        return 100;
      }
      
      // If current <= min, we've made 0% progress (at or below baseline)
      if (current <= min) {
        return 0;
      }
      
      // Progress = (current - min) / (target - min)
      const progress = ((current - min) / (target - min)) * 100;
      return Math.max(0, Math.min(100, progress));
    }
  };

  const progressPercentage = calculateProgress();

  // Determine color classes based on inverse flag
  const colorClasses = isInverse
    ? {
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        text: 'text-rose-700',
        progressBg: 'bg-rose-500',
      }
    : {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-700',
        progressBg: 'bg-emerald-500',
      };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-lg p-6 shadow-sm">
      {/* Metric Label */}
      <h3 className="text-base font-medium text-slate-900 mb-4">{label}</h3>

      {/* Current and Target Values */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-600">Current:</span>
          <span className="text-sm font-semibold text-slate-900">
            {formatValue(current)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-600">Target:</span>
          <span className="text-sm font-semibold text-slate-900">
            {formatValue(target)}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${colorClasses.progressBg}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500">Progress</span>
          <span className={`text-xs font-semibold ${colorClasses.text}`}>
            {progressPercentage.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
