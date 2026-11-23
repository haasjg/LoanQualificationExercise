import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { LoanRequestSummaryCard } from './LoanRequestSummaryCard';

interface FinancialDetailsStepProps {
  loanAmount: number;
  termMonths: number;
  initialIncome: number;
  initialDebt: number;
  initialCreditScore: number;
  onContinue: (income: number, debt: number, creditScore: number) => void;
  onBack: () => void;
}

// Validation constants from requirements
const INCOME_MIN = 1800;
const INCOME_MAX = 25000;
const DEBT_MIN = 0;
const DEBT_MAX = 15000;
const CREDIT_SCORE_MIN = 500;
const CREDIT_SCORE_MAX = 850;

// Validation helpers (moved outside component for reuse)
const validateIncome = (value: number): string | null => {
  if (value < INCOME_MIN) {
    return `Minimum monthly income is $${new Intl.NumberFormat('en-US').format(INCOME_MIN)}`;
  }
  if (value > INCOME_MAX) {
    return `Maximum monthly income is $${new Intl.NumberFormat('en-US').format(INCOME_MAX)}`;
  }
  return null;
};

const validateDebt = (value: number): string | null => {
  if (value < DEBT_MIN) {
    return 'Monthly debt cannot be negative';
  }
  if (value > DEBT_MAX) {
    return `Maximum monthly debt is $${new Intl.NumberFormat('en-US').format(DEBT_MAX)}`;
  }
  return null;
};

const validateCreditScore = (value: number): string | null => {
  if (value < CREDIT_SCORE_MIN) {
    return `Minimum credit score is ${CREDIT_SCORE_MIN}`;
  }
  if (value > CREDIT_SCORE_MAX) {
    return `Maximum credit score is ${CREDIT_SCORE_MAX}`;
  }
  return null;
};

export function FinancialDetailsStep({
  loanAmount,
  termMonths,
  initialIncome,
  initialDebt,
  initialCreditScore,
  onContinue,
  onBack,
}: FinancialDetailsStepProps) {
  const [income, setIncome] = useState(initialIncome);
  const [debt, setDebt] = useState(initialDebt);
  const [creditScore, setCreditScore] = useState(initialCreditScore);
  
  // Validation state - initialize with validation of initial values
  const [incomeError, setIncomeError] = useState<string | null>(() => validateIncome(initialIncome));
  const [debtError, setDebtError] = useState<string | null>(() => validateDebt(initialDebt));
  const [creditScoreError, setCreditScoreError] = useState<string | null>(() => validateCreditScore(initialCreditScore));

  // Update validation when initial values change
  useEffect(() => {
    setIncomeError(validateIncome(income));
  }, [income]);

  useEffect(() => {
    setDebtError(validateDebt(debt));
  }, [debt]);

  useEffect(() => {
    setCreditScoreError(validateCreditScore(creditScore));
  }, [creditScore]);

  // Format number with thousand separators
  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    const numValue = Number(rawValue);
    if (!isNaN(numValue)) {
      setIncome(numValue);
    }
  };

  const handleDebtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    const numValue = Number(rawValue);
    if (!isNaN(numValue)) {
      setDebt(numValue);
    }
  };

  const handleCreditScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = Number(e.target.value);
    if (!isNaN(numValue)) {
      setCreditScore(numValue);
    }
  };

  // Check if form is valid
  const isFormValid = (): boolean => {
    // All fields must be non-empty (greater than 0)
    if (income === 0 || debt < 0 || creditScore === 0) {
      return false;
    }
    // All fields must pass validation
    return (
      validateIncome(income) === null &&
      validateDebt(debt) === null &&
      validateCreditScore(creditScore) === null
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation check
    const incomeErr = validateIncome(income);
    const debtErr = validateDebt(debt);
    const creditErr = validateCreditScore(creditScore);
    
    setIncomeError(incomeErr);
    setDebtError(debtErr);
    setCreditScoreError(creditErr);
    
    if (incomeErr === null && debtErr === null && creditErr === null) {
      onContinue(income, debt, creditScore);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 md:px-8 lg:px-12">
      <div className="w-full max-w-6xl mx-auto">
        {/* Context Bar */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center text-sm text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </button>
          <LoanRequestSummaryCard loanAmount={loanAmount} termMonths={termMonths} />
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12 max-w-2xl mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">
              A few quick details
            </h2>
            <p className="text-slate-600">
              We'll use this to estimate your monthly payment
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Monthly Income */}
            <div className="space-y-2">
              <label htmlFor="income" className="text-sm font-medium text-slate-900 block">
                Monthly income
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                  $
                </span>
                <input
                  id="income"
                  type="text"
                  value={formatNumber(income)}
                  onChange={handleIncomeChange}
                  className={`w-full pl-8 pr-4 py-3 text-lg border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none ${
                    incomeError ? 'border-rose-300 bg-rose-50' : 'border-slate-300'
                  }`}
                  placeholder="5,000"
                  aria-invalid={incomeError !== null}
                  aria-describedby={incomeError ? 'income-error' : 'income-help'}
                />
              </div>
              {incomeError && (
                <p id="income-error" className="text-sm text-rose-700">
                  {incomeError}
                </p>
              )}
              {!incomeError && (
                <p id="income-help" className="text-sm text-slate-600">
                  Include salary, wages, and regular income
                </p>
              )}
            </div>

            {/* Monthly Debt Payments */}
            <div className="space-y-2">
              <label htmlFor="debt" className="text-sm font-medium text-slate-900 block">
                Monthly debt payments
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">
                  $
                </span>
                <input
                  id="debt"
                  type="text"
                  value={formatNumber(debt)}
                  onChange={handleDebtChange}
                  className={`w-full pl-8 pr-4 py-3 text-lg border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none ${
                    debtError ? 'border-rose-300 bg-rose-50' : 'border-slate-300'
                  }`}
                  placeholder="800"
                  aria-invalid={debtError !== null}
                  aria-describedby={debtError ? 'debt-error' : 'debt-help'}
                />
              </div>
              {debtError && (
                <p id="debt-error" className="text-sm text-rose-700">
                  {debtError}
                </p>
              )}
              {!debtError && (
                <p id="debt-help" className="text-sm text-slate-600">
                  Credit cards, auto loans, student loans, rent/mortgage
                </p>
              )}
            </div>

            {/* Credit Score Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="creditScore" className="text-sm font-medium text-slate-900 block">
                  Estimated credit score
                </label>
                <span className="text-lg font-semibold text-slate-900">{creditScore}</span>
              </div>
              <input
                id="creditScore"
                type="range"
                min="500"
                max="850"
                step="5"
                value={creditScore}
                onChange={handleCreditScoreChange}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                style={{
                  background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${((creditScore - 500) / (850 - 500)) * 100}%, #e2e8f0 ${((creditScore - 500) / (850 - 500)) * 100}%, #e2e8f0 100%)`
                }}
                aria-invalid={creditScoreError !== null}
                aria-describedby={creditScoreError ? 'credit-error' : 'credit-help'}
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>500</span>
                <span>850</span>
              </div>
              {creditScoreError && (
                <p id="credit-error" className="text-sm text-rose-700">
                  {creditScoreError}
                </p>
              )}
              {!creditScoreError && (
                <p id="credit-help" className="text-sm text-slate-600">
                  Check Credit Karma or your bank app for free
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isFormValid()}
              className={`w-full py-4 text-lg font-semibold text-white rounded-lg transition-colors shadow-sm mt-8 ${
                isFormValid()
                  ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
                  : 'bg-slate-300 cursor-not-allowed'
              }`}
            >
              See my estimate
            </button>
          </form>
        </div>

        {/* Progress Indicator */}
        <div className="mt-6 text-center text-sm text-slate-600">
          Step 2 of 5
        </div>
      </div>
    </div>
  );
}
