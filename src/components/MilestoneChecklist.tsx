// src/components/MilestoneChecklist.tsx

import { CheckCircle2, Circle, Clock } from 'lucide-react';
import type { MilestoneStatus } from '../engine/types';

interface MilestoneChecklistProps {
  milestones: MilestoneStatus[];
  onToggle: (milestoneId: string) => void;
}

export function MilestoneChecklist({
  milestones,
  onToggle,
}: MilestoneChecklistProps) {
  // Find the first uncompleted milestone (current in-progress)
  const currentMilestoneIndex = milestones.findIndex(m => !m.completed);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h3 className="text-xl font-semibold text-slate-900 mb-6">
        Milestone Timeline
      </h3>

      <div className="space-y-6">
        {milestones.map((milestone, index) => {
          const isCompleted = milestone.completed;
          const isCurrent = !isCompleted && index === currentMilestoneIndex;

          return (
            <div key={milestone.milestoneId} className="relative">
              {/* Connecting line (not shown for last item) */}
              {index < milestones.length - 1 && (
                <div
                  className={`absolute left-4 top-10 h-full w-0.5 ${
                    isCompleted ? 'bg-emerald-300' : 'bg-slate-200'
                  }`}
                  style={{ height: 'calc(100% + 0.5rem)' }}
                />
              )}

              {/* Milestone row */}
              <div className="relative flex items-start space-x-4">
                {/* Icon */}
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  ) : isCurrent ? (
                    <Clock className="h-8 w-8 text-blue-600" />
                  ) : (
                    <Circle className="h-8 w-8 text-slate-400" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-start justify-between gap-4">
                    <label
                      htmlFor={milestone.milestoneId}
                      className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                    >
                      <input
                        type="checkbox"
                        id={milestone.milestoneId}
                        checked={milestone.completed}
                        onChange={() => onToggle(milestone.milestoneId)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                      />
                      <span
                        className={`text-base font-medium ${
                          isCompleted
                            ? 'line-through text-slate-500'
                            : isCurrent
                            ? 'text-blue-900'
                            : 'text-slate-700'
                        }`}
                      >
                        {milestone.label}
                      </span>
                    </label>

                    {/* Date/Status */}
                    <div className="flex-shrink-0">
                      {isCompleted && milestone.completedAt ? (
                        <span className="text-xs text-emerald-700 font-medium">
                          {formatCompletionDate(milestone.completedAt)}
                        </span>
                      ) : isCurrent ? (
                        <span className="text-xs text-blue-700 font-medium bg-blue-50 px-3 py-1.5 rounded-full">
                          In Progress
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">
                          Upcoming
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Format ISO 8601 timestamp to human-readable date.
 * Returns format like "Jan 15, 2024"
 */
function formatCompletionDate(isoTimestamp: string): string {
  try {
    const date = new Date(isoTimestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoTimestamp;
  }
}
