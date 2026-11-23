import { useState, useEffect, useMemo } from 'react';
import { 
  ApplicantInputs, 
  LoanRequest,
  FinancialInputs,
  ComparisonState,
  DEFAULT_LOAN_REQUEST,
  DEFAULT_FINANCIAL_INPUTS,
  EngineResult,
  Lever,
  LeverOutcome,
  ActivePlan,
  ProgressState,
  ProductRecommendation
} from '../../engine/types';
import { evaluateDecision } from '../../engine';
import { computeLevers } from '../../engine/solver';
import { getInitialMilestones } from '../../engine/milestones';
import { saveActivePlan, saveProgressState } from '../../utils/storage';
import { fetchBenchmarkRate } from '../../services/fredClient';
import { LoanAmountStep } from './LoanAmountStep';
import { FinancialDetailsStep } from './FinancialDetailsStep';
import { EstimateStep } from './EstimateStep';
import { ComparisonStep } from './ComparisonStep';
import { SummaryStep } from './SummaryStep';
import { ExampleScenariosModal } from './ExampleScenariosModal';

type WizardStep = 'amount' | 'details' | 'estimate' | 'comparison' | 'summary';

export interface LoanWizardProps {
  /** Called after an accepted product plan has been saved to localStorage. */
  onPlanAccepted?: (plan: ActivePlan, progress: ProgressState) => void;
}

export function LoanWizard({ onPlanAccepted }: LoanWizardProps = {}) {
  const [step, setStep] = useState<WizardStep>('amount');
  const [loanRequest, setLoanRequest] = useState<LoanRequest>(DEFAULT_LOAN_REQUEST);
  const [financialInputs, setFinancialInputs] = useState<FinancialInputs>(DEFAULT_FINANCIAL_INPUTS);
  const [comparisonHistory, setComparisonHistory] = useState<ComparisonState[]>([]);
  const [benchmarkRate, setBenchmarkRate] = useState<number>(11.50);
  const [showExamplesModal, setShowExamplesModal] = useState(false);
  const [originalTerm, setOriginalTerm] = useState<number | undefined>();
  const [originalPayment, setOriginalPayment] = useState<number | undefined>();
  const [originalAmount, setOriginalAmount] = useState<number | undefined>();
  const [selectedLeverForComparison, setSelectedLeverForComparison] = useState<Lever | null>(null);

  // Merge loanRequest and financialInputs into ApplicantInputs for engine evaluation
  const inputs = useMemo<ApplicantInputs>(() => ({
    loanAmount: loanRequest.amount,
    termMonths: loanRequest.term,
    monthlyIncome: financialInputs.monthlyIncome,
    monthlyDebt: financialInputs.monthlyDebt,
    creditScore: financialInputs.creditScore,
  }), [loanRequest, financialInputs]);

  // Fetch benchmark rate on mount
  useEffect(() => {
    const apiKey = import.meta.env.VITE_FRED_API_KEY || '';
    fetchBenchmarkRate(apiKey).then((result) => {
      setBenchmarkRate(result.value);
    });
  }, []);

  // Calculate estimate
  const estimate = evaluateDecision(inputs, benchmarkRate);

  // Calculate 36-month option for comparison
  const thirtySixMonthInputs = { ...inputs, termMonths: 36 };
  const thirtySixMonthEstimate = evaluateDecision(thirtySixMonthInputs, benchmarkRate);

  // Compute solver result for lever analysis
  const solverResult = useMemo(() => {
    if ('kind' in estimate) return null;
    return computeLevers(inputs, benchmarkRate, estimate.decision);
  }, [inputs, benchmarkRate, estimate]);

  // bestAlternative: pick the most favorable lever for the single comparison CTA
  const bestAlternative = useMemo<Lever | null>(() => {
    if (!solverResult || solverResult.levers.length === 0) return null;
    
    // Priority 1: APPROVED-outcome lever with highest loan amount
    const approvedLevers = solverResult.levers.filter(l => l.leverOutcome === LeverOutcome.APPROVED);
    if (approvedLevers.length > 0) {
      return approvedLevers.reduce((best, current) => {
        const bestAmount = best.mutatedInputs.loanAmount ?? inputs.loanAmount;
        const currentAmount = current.mutatedInputs.loanAmount ?? inputs.loanAmount;
        return currentAmount > bestAmount ? current : best;
      });
    }
    
    // Priority 2: COUNTER_OFFER-outcome lever with lowest payment
    const counterLevers = solverResult.levers.filter(l => l.leverOutcome === LeverOutcome.COUNTER_OFFER);
    if (counterLevers.length > 0) {
      return counterLevers.reduce((best, current) => 
        current.resultingEstimatedPayment < best.resultingEstimatedPayment ? current : best
      );
    }
    
    return null;
  }, [solverResult, inputs]);

  // Handlers
  
  // Task 2.3: Comparison and navigation handlers
  // @ts-expect-error - Will be used in subsequent tasks (EstimateStep comparison button)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleCompare = () => {
    // Store current state in history
    const comparisonState: ComparisonState = {
      timestamp: Date.now(),
      originalInputs: inputs,
      originalEstimate: estimate as EngineResult,
      alternativeInputs: inputs, // Will be populated on Step 4
      alternativeEstimate: estimate as EngineResult, // Will be populated on Step 4
    };
    setComparisonHistory([...comparisonHistory, comparisonState]);
    setStep('comparison');
  };

  // @ts-expect-error - Will be used in subsequent tasks (ComparisonStep "Use" button)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleUseAlternative = (lever: Lever) => {
    // Apply lever mutated inputs
    // @ts-expect-error - Variable prepared for validation logic in future tasks
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const updatedInputs: ApplicantInputs = {
      ...inputs,
      ...lever.mutatedInputs,
    };
    
    // Update state based on what changed
    if (lever.mutatedInputs.loanAmount !== undefined) {
      setLoanRequest({ ...loanRequest, amount: lever.mutatedInputs.loanAmount });
    }
    if (lever.mutatedInputs.termMonths !== undefined) {
      setLoanRequest({ ...loanRequest, term: lever.mutatedInputs.termMonths });
    }
    if (lever.mutatedInputs.monthlyIncome !== undefined || 
        lever.mutatedInputs.monthlyDebt !== undefined || 
        lever.mutatedInputs.creditScore !== undefined) {
      setFinancialInputs({
        monthlyIncome: lever.mutatedInputs.monthlyIncome ?? financialInputs.monthlyIncome,
        monthlyDebt: lever.mutatedInputs.monthlyDebt ?? financialInputs.monthlyDebt,
        creditScore: lever.mutatedInputs.creditScore ?? financialInputs.creditScore,
      });
    }
    
    // Return to Step 3
    setStep('estimate');
  };

  // @ts-expect-error - Will be used in subsequent tasks (ComparisonStep "Keep original" button)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleKeepOriginal = () => {
    // Return to Step 3 without changes
    setStep('estimate');
  };

  const handleUndo = () => {
    // Restore previous state from history
    if (comparisonHistory.length === 0) return;
    
    const previousState = comparisonHistory[comparisonHistory.length - 1];
    
    // Restore original inputs
    setLoanRequest({
      amount: previousState.originalInputs.loanAmount,
      term: previousState.originalInputs.termMonths,
    });
    setFinancialInputs({
      monthlyIncome: previousState.originalInputs.monthlyIncome,
      monthlyDebt: previousState.originalInputs.monthlyDebt,
      creditScore: previousState.originalInputs.creditScore,
    });
    
    // Remove the last comparison from history
    setComparisonHistory(comparisonHistory.slice(0, -1));
    
    // Return to Step 4
    setStep('comparison');
  };

  const handleAmountContinue = (amount: number, term: number) => {
    setLoanRequest({ amount, term });
    setStep('details');
  };

  const handleDetailsContinue = (income: number, debt: number, creditScore: number) => {
    setFinancialInputs({
      monthlyIncome: income,
      monthlyDebt: debt,
      creditScore: creditScore,
    });
    setOriginalTerm(loanRequest.term);
    setOriginalAmount(loanRequest.amount);
    setStep('estimate');
  };

  const handleCompareTerms = () => {
    setSelectedLeverForComparison(null);
    // Capture original payment when entering comparison view
    if (!('kind' in estimate)) {
      setOriginalPayment(estimate.estimatedPayment);
    }
    setStep('comparison');
  };

  const handleCompareLever = (lever: Lever) => {
    // Reuse the original payment capture and navigation from handleCompareTerms
    handleCompareTerms();
    // Set after handleCompareTerms, which clears any previous selection
    setSelectedLeverForComparison(lever);
  };

  const handleSelectNewTerm = () => {
    // Alternative inputs: the selected lever's mutated inputs, or the 36-month default
    const altInputs: ApplicantInputs = selectedLeverForComparison
      ? { ...inputs, ...selectedLeverForComparison.mutatedInputs }
      : thirtySixMonthInputs;
    const altEvaluation = selectedLeverForComparison
      ? evaluateDecision(altInputs, benchmarkRate)
      : thirtySixMonthEstimate;

    // Store current state in comparison history BEFORE applying the alternative
    if (!('kind' in estimate)) {
      const comparisonState: ComparisonState = {
        timestamp: Date.now(),
        originalInputs: inputs,
        originalEstimate: estimate as EngineResult,
        alternativeInputs: altInputs,
        alternativeEstimate: ('kind' in altEvaluation) ? estimate as EngineResult : altEvaluation as EngineResult,
      };
      setComparisonHistory([...comparisonHistory, comparisonState]);
    }
    // Apply all mutated inputs (amount, term, debt, credit score)
    setLoanRequest({ amount: altInputs.loanAmount, term: altInputs.termMonths });
    if (selectedLeverForComparison) {
      setFinancialInputs({
        monthlyIncome: altInputs.monthlyIncome,
        monthlyDebt: altInputs.monthlyDebt,
        creditScore: altInputs.creditScore,
      });
      setSelectedLeverForComparison(null);
    }
    // Return to Step 3 (estimate) to show the new estimate with Undo button
    setStep('estimate');
  };

  const handleKeepOriginalTerm = () => {
    setStep('summary');
  };

  const handleEditDetails = () => {
    setStep('details');
  };

  const handleStartOver = () => {
    setLoanRequest(DEFAULT_LOAN_REQUEST);
    setFinancialInputs(DEFAULT_FINANCIAL_INPUTS);
    setComparisonHistory([]);
    setOriginalTerm(undefined);
    setOriginalPayment(undefined);
    setOriginalAmount(undefined);
    setSelectedLeverForComparison(null);
    setStep('amount');
  };

  const handleAcceptProduct = (recommendation: ProductRecommendation) => {
    if ('kind' in estimate) return;
    const now = new Date().toISOString();
    const plan: ActivePlan = {
      productType: recommendation.productType,
      acceptedAt: now,
      initialInputs: inputs,
      initialEngineResult: estimate,
    };
    const progress: ProgressState = {
      milestones: getInitialMilestones(recommendation.productType),
      updatedInputs: inputs,
      lastUpdated: now,
    };
    saveActivePlan(plan);
    saveProgressState(progress);
    onPlanAccepted?.(plan, progress);
  };

  const handleExploreAnother = () => {
    setShowExamplesModal(true);
  };

  const handleSelectScenario = (scenarioInputs: ApplicantInputs) => {
    setLoanRequest({
      amount: scenarioInputs.loanAmount,
      term: scenarioInputs.termMonths,
    });
    setFinancialInputs({
      monthlyIncome: scenarioInputs.monthlyIncome,
      monthlyDebt: scenarioInputs.monthlyDebt,
      creditScore: scenarioInputs.creditScore,
    });
    setOriginalTerm(undefined);
    setOriginalPayment(undefined);
    setOriginalAmount(undefined);
    setSelectedLeverForComparison(null);
    setStep('estimate');
  };

  // Don't render wizard if estimate is an error
  if ('kind' in estimate) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 md:px-8 lg:px-12">
        <div className="w-full max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-rose-200 p-8 max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-rose-900 mb-2">
            Invalid inputs
          </h2>
          <p className="text-slate-600">
            Please check your details and try again.
          </p>
          <button
            onClick={handleStartOver}
            className="mt-4 w-full py-3 text-base font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Start over
          </button>
        </div>
      </div>
    </div>
    );
  }

  // Type guard to ensure we have EngineResult, not EngineError
  const currentEstimate = estimate as EngineResult;
  const comparisonEstimate = ('kind' in thirtySixMonthEstimate) ? currentEstimate : thirtySixMonthEstimate as EngineResult;

  return (
    <>
      {step === 'amount' && (
        <LoanAmountStep
          initialAmount={loanRequest.amount}
          initialTerm={loanRequest.term}
          onContinue={handleAmountContinue}
          onShowExamples={() => setShowExamplesModal(true)}
        />
      )}

      {step === 'details' && (
        <FinancialDetailsStep
          loanAmount={loanRequest.amount}
          termMonths={loanRequest.term}
          initialIncome={financialInputs.monthlyIncome}
          initialDebt={financialInputs.monthlyDebt}
          initialCreditScore={financialInputs.creditScore}
          onContinue={handleDetailsContinue}
          onBack={() => setStep('amount')}
        />
      )}

      {step === 'estimate' && (
        <EstimateStep
          engineResult={currentEstimate}
          loanAmount={loanRequest.amount}
          termMonths={loanRequest.term}
          bestAlternative={bestAlternative}
          recommendedLever={bestAlternative}
          allLevers={solverResult?.levers ?? []}
          currentInputs={inputs}
          onCompareLever={handleCompareLever}
          onAcceptProduct={handleAcceptProduct}
          showUndo={comparisonHistory.length > 0}
          onCompareTerms={handleCompareTerms}
          onEditDetails={handleEditDetails}
          onBack={() => setStep('details')}
          onStartOver={handleStartOver}
          onUndo={handleUndo}
        />
      )}

      {step === 'comparison' && (
        <ComparisonStep
          originalInputs={inputs}
          originalEstimate={currentEstimate}
          alternativeInputs={thirtySixMonthInputs}
          alternativeEstimate={comparisonEstimate}
          selectedLever={selectedLeverForComparison}
          onSelectAlternative={handleSelectNewTerm}
          onKeepOriginal={handleKeepOriginalTerm}
          onEditDetails={handleEditDetails}
          onBack={() => setStep('estimate')}
        />
      )}

      {step === 'summary' && (
        <SummaryStep
          engineResult={evaluateDecision(inputs, benchmarkRate) as EngineResult}
          loanAmount={loanRequest.amount}
          termMonths={loanRequest.term}
          originalTerm={originalTerm}
          originalPayment={originalPayment}
          originalAmount={originalAmount}
          onStartOver={handleStartOver}
          onExploreAnother={handleExploreAnother}
        />
      )}

      <ExampleScenariosModal
        isOpen={showExamplesModal}
        onClose={() => setShowExamplesModal(false)}
        onSelectScenario={handleSelectScenario}
      />
    </>
  );
}
