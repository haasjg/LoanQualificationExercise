import React from 'react';
import LeverCard from './LeverCard';
import { SolverResult, Lever } from '../engine/types';

// ============================================================================
// PathToYesChecklist Component
// ============================================================================

interface PathToYesChecklistProps {
  solverResult: SolverResult | null;
  onApplyFix: (lever: Lever) => void;
}

const PathToYesChecklist: React.FC<PathToYesChecklistProps> = ({ solverResult, onApplyFix }) => {
  // Hidden state for APPROVED (return null when solverResult is null)
  if (solverResult === null) {
    return null;
  }

  // Empty state: no levers available (APPROVED decision or no feasible paths)
  if (solverResult.levers.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Path to Yes</h2>
        </div>
        <p className="text-sm text-slate-600">
          {solverResult.emptyMessage || 'No levers available'}
        </p>
      </div>
    );
  }

  // Render checklist with levers (COUNTER_OFFER or DECLINED decisions)
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900 flex items-center">
          <svg className="w-6 h-6 mr-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          PATH TO YES
        </h2>
        <p className="text-sm text-slate-600 mt-2">
          These actions can improve your loan approval chances
        </p>
      </div>

      <div className="space-y-4">
        {solverResult.levers.map((lever, index) => (
          <LeverCard key={index} lever={lever} onApplyFix={onApplyFix} />
        ))}
      </div>
    </div>
  );
};

export default PathToYesChecklist;
