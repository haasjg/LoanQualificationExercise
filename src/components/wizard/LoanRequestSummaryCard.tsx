interface LoanRequestSummaryCardProps {
  loanAmount: number;
  termMonths: number;
}

export function LoanRequestSummaryCard({ loanAmount, termMonths }: LoanRequestSummaryCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-slate-100 rounded-md p-4 border border-slate-200">
      <div className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">
        Your loan request
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-lg font-semibold text-slate-900">
          {formatCurrency(loanAmount)}
        </span>
        <span className="text-sm text-slate-600">
          for {termMonths} months
        </span>
      </div>
    </div>
  );
}
