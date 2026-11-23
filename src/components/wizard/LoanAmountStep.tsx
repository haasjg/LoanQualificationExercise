import { useState } from 'react';

interface LoanAmountStepProps {
  initialAmount: number;
  initialTerm?: number;
  onContinue: (amount: number, term: number) => void;
  onShowExamples: () => void;
}

export function LoanAmountStep({ 
  initialAmount, 
  initialTerm = 36,
  onContinue, 
  onShowExamples 
}: LoanAmountStepProps) {
  const [amount, setAmount] = useState(initialAmount);
  const [termMonths, setTermMonths] = useState(initialTerm);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 md:px-8 lg:px-12">
      <div className="w-full max-w-6xl mx-auto">
        {/* Main Card - Warm stone-50 background canvas */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 md:p-12 max-w-2xl mx-auto">
          <div className="text-center space-y-8">
            {/* Heading in text-3xl slate-900 */}
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              How much would you like to borrow?
            </h1>
            
            {/* Giant amount display in text-6xl font-bold slate-900 */}
            <div className="text-6xl font-bold text-slate-900">
              {formatCurrency(amount)}
            </div>

            {/* Slider for $2,000-$25,000 in $500 increments */}
            <div className="space-y-3">
              <input
                type="range"
                min="2000"
                max="25000"
                step="500"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-sm text-slate-600">
                <span>$2,000</span>
                <span>$25,000</span>
              </div>
            </div>

            {/* Amount Presets */}
            <div className="flex flex-wrap gap-3 justify-center">
              {[5000, 10000, 15000, 20000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmount(preset)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                    amount === preset
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {formatCurrency(preset)}
                </button>
              ))}
            </div>

            {/* Term Selector */}
            <div className="space-y-3 pt-6">
              <label className="block text-base font-medium text-slate-900">
                Loan term
              </label>
              <div className="flex flex-wrap gap-3 justify-center">
                {[12, 24, 36, 48, 60].map((term) => (
                  <button
                    key={term}
                    onClick={() => setTermMonths(term)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                      termMonths === term
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {term} months
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={() => onContinue(amount, termMonths)}
            className="w-full mt-8 py-4 min-h-12 text-lg font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md"
          >
            Continue
          </button>

          {/* Secondary Link */}
          <div className="text-center mt-6">
            <button
              onClick={onShowExamples}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Try an example scenario →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
