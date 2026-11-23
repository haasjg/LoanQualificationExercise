import { computeProductRecommendations } from './src/engine/productMapper.ts';
import { Decision, ReasonCode } from './src/engine/types.ts';

const inputs = {
  monthlyIncome: 2800,
  monthlyDebt: 200,
  creditScore: 570,
  loanAmount: 7000,
  termMonths: 36,
};

const engineResult = {
  decision: Decision.DECLINED,
  reasonCode: ReasonCode.HIGH_RISK_SCORE,
  apr: 0,
  estimatedPayment: 0,
  postLoanDTI: 0,
  benchmarkRate: 11.50,
};

const result = computeProductRecommendations(engineResult, inputs, 11.50);
console.log('Result:', JSON.stringify(result, null, 2));
