
import { X } from 'lucide-react';
import { PERSONA_PRESETS, ApplicantInputs } from '../../engine/types';

interface ExampleScenariosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScenario: (inputs: ApplicantInputs) => void;
}

export function ExampleScenariosModal({ isOpen, onClose, onSelectScenario }: ExampleScenariosModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 md:px-8 lg:px-12 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h3 className="text-xl font-semibold text-slate-900">
            Try an example scenario
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Scenarios */}
        <div className="p-6 space-y-4">
          {PERSONA_PRESETS.map((preset, index) => (
            <button
              key={index}
              onClick={() => {
                onSelectScenario(preset.inputs);
                onClose();
              }}
              className="w-full text-left p-6 border-2 border-slate-200 rounded-xl hover:border-indigo-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-lg font-semibold text-slate-900">
                  {preset.label}
                </h4>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  preset.expectedDecision === 'APPROVED' 
                    ? 'bg-emerald-50 text-emerald-700'
                    : preset.expectedDecision === 'COUNTER_OFFER'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-rose-50 text-rose-700'
                }`}>
                  {preset.expectedDecision}
                </span>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                {preset.description}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-slate-600">Income:</span>{' '}
                  <span className="font-medium">${preset.inputs.monthlyIncome.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-600">Debt:</span>{' '}
                  <span className="font-medium">${preset.inputs.monthlyDebt.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-600">Credit:</span>{' '}
                  <span className="font-medium">{preset.inputs.creditScore}</span>
                </div>
                <div>
                  <span className="text-slate-600">Loan:</span>{' '}
                  <span className="font-medium">${preset.inputs.loanAmount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-600">Term:</span>{' '}
                  <span className="font-medium">{preset.inputs.termMonths}mo</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
