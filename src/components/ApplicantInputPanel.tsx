import React from 'react';
import {
  DollarSign,
  CreditCard,
  PieChart,
  Briefcase,
  Calendar,
} from 'lucide-react';
import { ApplicantInputs } from '../engine/types';

// ============================================================================
// Helper Functions
// ============================================================================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getTermOptions = (): number[] => [12, 24, 36, 48, 60];

const getLoanAmountOptions = (): number[] => {
  const options: number[] = [];
  for (let amount = 2000; amount <= 25000; amount += 500) {
    options.push(amount);
  }
  return options;
};

// ============================================================================
// Slider Component
// ============================================================================

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  icon: React.ReactNode;
  formatValue?: (value: number) => string;
  error?: boolean;
}

const SliderInput: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  icon,
  formatValue,
  error,
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={`space-y-3 ${error ? 'opacity-75' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`p-2 rounded-lg ${error ? 'bg-rose-100 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
            {icon}
          </div>
          <label className="text-base font-medium text-slate-900">{label}</label>
        </div>
        <div className="text-base font-semibold text-slate-900">
          {formatValue ? formatValue(value) : value}
        </div>
      </div>

      <div className="relative flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full h-2.5 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
            ${error ? 'bg-rose-200' : 'bg-indigo-200'}`}
          style={{
            backgroundImage: `linear-gradient(to right, #4f46e5 ${percentage}%, #e0e7ff ${percentage}%)`,
          }}
        />
      </div>

      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full px-3 py-2.5 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
          ${error ? 'border-rose-300 bg-rose-50' : 'border-slate-300 bg-white'}`}
      />
    </div>
  );
};

// ============================================================================
// Select Component
// ============================================================================

interface SelectProps {
  label: string;
  value: number;
  options: number[];
  onChange: (value: number) => void;
  icon: React.ReactNode;
  formatValue?: (value: number) => string;
  error?: boolean;
}

const SelectInput: React.FC<SelectProps> = ({
  label,
  value,
  options,
  onChange,
  icon,
  formatValue,
  error,
}) => {
  return (
    <div className={`space-y-3 ${error ? 'opacity-75' : ''}`}>
      <div className="flex items-center space-x-2">
        <div className={`p-2 rounded-lg ${error ? 'bg-rose-100 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
          {icon}
        </div>
        <label className="text-base font-medium text-slate-900">{label}</label>
      </div>

      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full px-3 py-2.5 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
          ${error ? 'border-rose-300 bg-rose-50' : 'border-slate-300 bg-white'}`}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {formatValue ? formatValue(option) : option}
          </option>
        ))}
      </select>
    </div>
  );
};

// ============================================================================
// ApplicantInputPanel Component
// ============================================================================

interface ApplicantInputPanelProps {
  inputs: ApplicantInputs;
  onChange: (updated: ApplicantInputs) => void;
}

const ApplicantInputPanel: React.FC<ApplicantInputPanelProps> = ({ inputs, onChange }) => {
  const handleChange = (field: keyof ApplicantInputs, value: number) => {
    onChange({ ...inputs, [field]: value });
  };

  const loanAmountOptions = getLoanAmountOptions();
  const termOptions = getTermOptions();

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8">
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 flex items-center">
          <CreditCard className="w-6 h-6 mr-3 text-indigo-600" />
          Applicant Information
        </h2>
        <p className="text-sm text-slate-600 mt-2">
          Enter your financial details to check your loan eligibility
        </p>
      </div>

      <div className="space-y-8">
        {/* Monthly Income */}
        <SliderInput
          label="Monthly Gross Income"
          value={inputs.monthlyIncome}
          min={1800}
          max={25000}
          step={100}
          onChange={(value) => handleChange('monthlyIncome', value)}
          icon={<DollarSign className="w-5 h-5" />}
          formatValue={formatCurrency}
        />

        {/* Monthly Debt */}
        <SliderInput
          label="Monthly Debt Obligations"
          value={inputs.monthlyDebt}
          min={0}
          max={15000}
          step={50}
          onChange={(value) => handleChange('monthlyDebt', value)}
          icon={<PieChart className="w-5 h-5" />}
          formatValue={formatCurrency}
        />

        {/* Credit Score */}
        <SliderInput
          label="Estimated Credit Score"
          value={inputs.creditScore}
          min={500}
          max={850}
          step={5}
          onChange={(value) => handleChange('creditScore', value)}
          icon={<CreditCard className="w-5 h-5" />}
        />

        {/* Loan Amount */}
        <SelectInput
          label="Requested Loan Amount"
          value={inputs.loanAmount}
          options={loanAmountOptions}
          onChange={(value) => handleChange('loanAmount', value)}
          icon={<Briefcase className="w-5 h-5" />}
          formatValue={formatCurrency}
        />

        {/* Term Months */}
        <SelectInput
          label="Loan Term"
          value={inputs.termMonths}
          options={termOptions}
          onChange={(value) => handleChange('termMonths', value)}
          icon={<Calendar className="w-5 h-5" />}
          formatValue={(value) => `${value} months`}
        />
      </div>
    </div>
  );
};

export default ApplicantInputPanel;
