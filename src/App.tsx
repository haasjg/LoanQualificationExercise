import { useState, useEffect, useMemo } from 'react';
import ApplicantInputPanel from './components/ApplicantInputPanel';
import { ApplicantInputs, DEFAULT_INPUTS, ApplicantPersonaPreset, PERSONA_PRESETS, Lever, Decision, EngineResult, EngineOutput, RateSource } from './engine/types';
import { evaluateDecision, validateInputs, computeLevers } from './engine';
import { fetchBenchmarkRate, getReferenceLabel } from './services/fredClient';
import RateBenchmarkBadge from './components/RateBenchmarkBadge';
import DecisionBanner from './components/DecisionBanner';
import PathToYesChecklist from './components/PathToYesChecklist';
import AdverseActionModal from './components/AdverseActionModal';

function App() {
  const [inputs, setInputs] = useState<ApplicantInputs>(DEFAULT_INPUTS);
  const [benchmarkRate, setBenchmarkRate] = useState<number>(11.50);
  const [rateSource, setRateSource] = useState<RateSource>(RateSource.OFFLINE);
  const [rateLabel, setRateLabel] = useState<string>('Default benchmark');
  const [adverseModalOpen, setAdverseModalOpen] = useState(false);

  // Fetch benchmark rate on mount
  useEffect(() => {
    const apiKey = import.meta.env.VITE_FRED_API_KEY;
    fetchBenchmarkRate(apiKey)
      .then((result) => {
        setBenchmarkRate(result.value);
        setRateSource(result.source);
        setRateLabel(getReferenceLabel(result.source));
      })
      .catch(() => {
        setBenchmarkRate(11.50);
        setRateSource(RateSource.OFFLINE);
        setRateLabel('Default benchmark');
      });
  }, []);

  // Engine result - pure function evaluation
  const engineResult: EngineOutput = useMemo(() => {
    const validationErrors = validateInputs(inputs, benchmarkRate);
    if (validationErrors.length > 0) {
      return {
        kind: 'ENGINE_ERROR' as const,
        invalidFields: validationErrors.map(e => e.field),
        message: validationErrors[0].message,
      };
    }

    return evaluateDecision(inputs, benchmarkRate);
  }, [inputs, benchmarkRate]);

  // Solver levers - only compute when needed (COUNTER_OFFER or DECLINED)
  // Only compute levers when engineResult is EngineResult (not EngineError)
  const solverResult = useMemo<EngineResult | null>(() => {
    if (engineResult && 'kind' in engineResult && engineResult.kind === 'ENGINE_ERROR') {
      return null;
    }
    if (engineResult && 'decision' in engineResult && engineResult.decision === Decision.APPROVED) {
      return null;
    }
    return engineResult as EngineResult;
  }, [engineResult]);

  // Compute levers only when we have a valid engine result that's not APPROVED
  // Also skip levers for HIGH_RISK applicants (creditScore < 600) who are declined due to HIGH_RISK_SCORE
  const leversResult = useMemo(() => {
    const validResult = solverResult;
    if (!validResult || validResult.decision === Decision.APPROVED) {
      return null;
    }
    // For HIGH_RISK applicants (creditScore < 600), skip levers as they're declined for ineligible reasons
    if (inputs.creditScore < 600) {
      return null;
    }
    return computeLevers(inputs, benchmarkRate, validResult.decision);
  }, [inputs, benchmarkRate, solverResult]);

  // Handler to select a preset persona
  const handleSelectPreset = (preset: ApplicantPersonaPreset): void => {
    setInputs(preset.inputs);
  };

  // Handler to apply a Path to Yes fix lever
  const handleApplyFix = (lever: Lever): void => {
    setInputs(prev => ({ ...prev, ...lever.mutatedInputs }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Path to Yes</h1>
            <RateBenchmarkBadge
              source={rateSource}
              benchmarkRate={benchmarkRate}
              referenceLabel={rateLabel}
            />
          </div>

          {/* Preset button strip */}
          <div className="mt-8 flex flex-wrap gap-3">
            {PERSONA_PRESETS.map((preset) => {
              const isMatch = preset.inputs.monthlyIncome === inputs.monthlyIncome &&
                preset.inputs.monthlyDebt === inputs.monthlyDebt &&
                preset.inputs.creditScore === inputs.creditScore &&
                preset.inputs.loanAmount === inputs.loanAmount &&
                preset.inputs.termMonths === inputs.termMonths;

              return (
                <button
                  key={preset.label}
                  onClick={() => handleSelectPreset(preset)}
                  className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-150 ${
                    isMatch
                      ? 'bg-indigo-600 text-white shadow-sm hover:shadow-md hover:bg-indigo-700'
                      : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Two-column layout (responsive) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: Inputs */}
          <div className="flex flex-col">
            <ApplicantInputPanel inputs={inputs} onChange={setInputs} />
          </div>

          {/* Right column: Results */}
          <div className="flex flex-col space-y-6">
            {/* Decision Banner */}
            <DecisionBanner
              engineResult={engineResult}
              inputs={inputs}
              onOpenAdverseModal={() => setAdverseModalOpen(true)}
            />

            {/* Path To Yes Checklist (only show when leversResult is not null and has levers) */}
            {leversResult !== null && leversResult.levers.length > 0 && (
              <PathToYesChecklist
                solverResult={leversResult}
                onApplyFix={handleApplyFix}
              />
            )}
          </div>
        </div>
      </main>

      {/* Adverse Action Modal */}
      <AdverseActionModal
        open={adverseModalOpen}
        engineResult={engineResult}
        solverResult={leversResult}
        onClose={() => setAdverseModalOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-slate-500">
            © {new Date().getFullYear()} Path to Yes. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
