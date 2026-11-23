# Product Recommendation Logic - Mathematical Specifications

## Overview

This document details the exact mathematical logic used by `productMapper.ts` to map decline reasons to retention product recommendations, including qualification gap calculations, timeline estimates, and re-qualification projections.

---

## 1. Secured Credit Builder Card

**Triggered By:** `HIGH_RISK_SCORE` (creditScore < 600)

### Qualification Gap Calculation

```typescript
const targetScore = 640;  // Minimum for standard approval
const scoreGap = targetScore - inputs.creditScore;

// Example: creditScore = 570
// scoreGap = 640 - 570 = 70 points needed
```

### Timeline Estimation

**Assumption:** On-time payments build credit at ~10 points per month for secured card users with thin/damaged credit files.

```typescript
const pointsPerMonth = 10;
const timelineMonths = Math.ceil(scoreGap / pointsPerMonth);

// Example: scoreGap = 70
// timelineMonths = Math.ceil(70 / 10) = 7 months
// timelineLabel = "7-10 months to re-qualify"  (add 3-month buffer)
```

### Re-Qualification Math

After reaching target score of 640:
- Original APR tier: Ineligible (null)
- New APR tier: `benchmarkRate + 5.00%` (600-659 tier)
- Max loan amount: $15,000 (subprime cap)
- Monthly income minimum: $2,000

**Example:**
- Benchmark: 11.50%
- New APR: 11.50% + 5.00% = 16.50%
- If loanAmount=$10,000, term=36 months:
  - New monthly payment = $353
  - If monthlyIncome=$2,800, monthlyDebt=$400:
  - New DTI = (400 + 353) / 2800 = 0.269 = 26.9% → APPROVED ✓

### Product Terms

```typescript
keyTerms: [
  'Minimum $200 refundable security deposit',
  '0% APR on purchases',
  'Reports to all 3 credit bureaus',
  'Graduation to unsecured card after 6 months'
]
```

---

## 2. High-Yield Savings + Direct Deposit

**Triggered By:** `INSUFFICIENT_INCOME` (monthlyIncome < $1,800)

### Qualification Gap Calculation

```typescript
const targetIncome = 1800;  // Minimum threshold
const incomeGap = targetIncome - inputs.monthlyIncome;

// Example: monthlyIncome = $1,500
// incomeGap = 1800 - 1500 = $300/mo shortfall
```

### Gap Message Logic

```typescript
if (incomeGap > 500) {
  qualificationGap = 'Establish supplemental income source to reach $1,800/mo minimum';
} else if (incomeGap > 0) {
  qualificationGap = 'Establish direct deposit history to reach $1,800/mo minimum';
} else {
  // Edge case: income >= 1800 but still flagged INSUFFICIENT_INCOME
  // This shouldn't happen per underwriting rules, but handle gracefully
  qualificationGap = 'Establish 3-month direct deposit history to demonstrate income stability';
}
```

### Timeline Estimation

**Fixed Timeline:** 3 months

**Rationale:** Community banks typically require 3 consecutive months of direct deposit history to verify income stability and reduce fraud risk. This is independent of the absolute income amount.

```typescript
const timelineMonths = 3;
const timelineLabel = '3 months to re-qualify';
```

### Re-Qualification Math

After 3 months of direct deposit history:
- New monthly income: (Assumed unchanged OR increased if user gets supplemental income)
- Underwriting re-evaluates with 3-month deposit pattern verified
- If income now >= $1,800: INSUFFICIENT_INCOME reason is cleared

**Example:**
- Original: monthlyIncome=$1,500 → DECLINED (INSUFFICIENT_INCOME)
- After 3 months: monthlyIncome=$1,900 (got part-time job)
- Re-evaluate: income check passes, re-run full decisioning
- If DTI and score also pass → APPROVED ✓

### Product Terms

```typescript
keyTerms: [
  'No minimum balance requirement',
  '4.50% APY on all balances',
  'Set up direct deposit for bonus consideration',
  'Mobile app with budgeting tools'
]
```

**Note:** The 4.50% APY is a placeholder; real rates vary by market conditions. The direct deposit bonus is a common retention incentive used by community banks.

---

## 3. Debt Consolidation Loan

**Triggered By:** `EXCESSIVE_DEBT` (monthlyDebt >= monthlyIncome) OR `HIGH_DTI` (postLoanDTI > 0.45)

### Qualification Gap Calculation

**Assumption:** Debt consolidation reduces monthly debt payment by ~20% via:
- Lower APR (average credit card APR ~18-24%, consolidation loan APR ~10-16%)
- Extended repayment term (24-60 months vs. revolving credit)

```typescript
const consolidationFactor = 0.8;  // 20% reduction
const consolidatedDebt = inputs.monthlyDebt * consolidationFactor;

// Example: monthlyDebt = $1,200
// consolidatedDebt = 1200 * 0.8 = $960/mo
// Reduction: $240/mo
```

### Timeline Estimation

**Immediate (0 months):** Consolidation loan approval and disbursement is instant in this simulation. In reality, it's 1-2 weeks for underwriting and funding.

```typescript
const timelineMonths = 0;
const timelineLabel = 'Immediate re-qualification with consolidation';
```

### Re-Qualification Math

After consolidation, re-compute DTI with reduced monthly debt:

```typescript
// Original DTI
const originalDTI = (inputs.monthlyDebt + estimatedPayment) / inputs.monthlyIncome;

// New DTI after consolidation
const newMonthlyDebt = consolidatedDebt;
const newDTI = (newMonthlyDebt + estimatedPayment) / inputs.monthlyIncome;

// Example:
// Original: (1200 + 400) / 3000 = 1600/3000 = 0.533 = 53.3% → DECLINED (HIGH_DTI)
// After:    ( 960 + 400) / 3000 = 1360/3000 = 0.453 = 45.3% → Still > 0.45, DECLINED
// BUT: If we also reduce loan amount slightly...
// After:    ( 960 + 350) / 3000 = 1310/3000 = 0.437 = 43.7% → COUNTER_OFFER ✓

// For gap metrics display:
gapMetrics: {
  currentValue: `${(originalDTI * 100).toFixed(1)}%`,  // "53.3%"
  targetValue: '36%',  // Approval threshold
  metricLabel: 'Debt-to-Income Ratio'
}
```

### Edge Case: Consolidation Not Enough

If consolidation brings DTI to 0.36-0.45 range → COUNTER_OFFER (progress, but not full approval)
If consolidation brings DTI below 0.36 → APPROVED (full approval)
If consolidation still leaves DTI > 0.45 → Recommend micro-loan instead (see next section)

### Product Terms

```typescript
keyTerms: [
  `Consolidate up to $${(inputs.monthlyDebt * 12).toLocaleString()} of existing debt`,
  'Fixed APR, no prepayment penalty',
  'Estimated new monthly payment: ~$' + Math.ceil(consolidatedDebt).toLocaleString(),
  'Close consolidated accounts to prevent new balances'
]
```

**Critical Requirement:** User MUST close consolidated credit card accounts. Otherwise, they can re-load those cards with new debt, defeating the consolidation and creating a worse financial situation.

---

## 4. Micro-Loan (Tier-2 Small-Dollar Loan)

**Triggered By:** `HIGH_DTI` AND `loanAmount > $10,000`

**Rationale:** If the requested loan amount is pushing DTI over threshold, offer a smaller loan that fits within the applicant's budget.

### Qualification Gap Calculation

Solve for maximum loan amount that keeps DTI <= 0.36:

```typescript
// Rearrange DTI formula to solve for max loan payment:
// (monthlyDebt + payment) / monthlyIncome <= 0.36
// payment <= (0.36 * monthlyIncome) - monthlyDebt

const maxPayment = (0.36 * inputs.monthlyIncome) - inputs.monthlyDebt;

// Now solve for loan amount using amortization formula:
// payment = L * [r(1+r)^n] / [(1+r)^n - 1]
// Rearranged: L = payment * [(1+r)^n - 1] / [r(1+r)^n]

const apr = computeAPR(inputs.creditScore, benchmarkRate) + 2.0;  // Tier-2 pricing (+2%)
const r = (apr / 100) / 12;
const n = inputs.termMonths;
const rn = Math.pow(1 + r, n);
const maxLoanAmount = maxPayment * (rn - 1) / (r * rn);

// Cap at $2,000 - $5,000 range (micro-loan limits)
const cappedAmount = Math.max(2000, Math.min(5000, Math.floor(maxLoanAmount / 100) * 100));

// Example:
// monthlyIncome = $3,000, monthlyDebt = $800
// maxPayment = (0.36 * 3000) - 800 = 1080 - 800 = $280
// If APR = 18.50% (16.50% + 2%), term = 24 months:
// r = 0.0154, n = 24, rn = 1.447
// maxLoanAmount = 280 * (1.447 - 1) / (0.0154 * 1.447) = 280 * 0.447 / 0.0223 = $5,614
// cappedAmount = Math.min(5000, 5614) = $5,000
```

### Timeline Estimation

**Immediate (0 months):** Micro-loan is a reduced-amount approval, so no additional waiting period.

```typescript
const timelineMonths = 0;
const timelineLabel = 'Immediate approval';
```

### Re-Qualification Math

```typescript
// Original request: loanAmount = $15,000, payment = $737, DTI = 51.2% → DECLINED
// Micro-loan offer: loanAmount = $5,000, payment = $246, DTI = 34.9% → APPROVED ✓

gapMetrics: {
  currentValue: `$${inputs.loanAmount.toLocaleString()}`,  // "$15,000"
  targetValue: `$${cappedAmount.toLocaleString()}`,        // "$5,000"
  metricLabel: 'Requested Loan Amount'
}
```

### Product Terms

```typescript
keyTerms: [
  `Loan amount: $${cappedAmount.toLocaleString()}`,
  `Term: ${inputs.termMonths} months`,
  `APR: ${(apr).toFixed(2)}% (Tier-2 pricing)`,
  'Build credit history for future larger loans'
]
```

**Tier-2 Pricing Rationale:** Micro-loans carry slightly higher APR (+2%) because:
1. Higher administrative cost per dollar lent
2. Higher default risk concentration
3. Incentive to graduate to standard tier after demonstrating on-time payments

---

## 5. Recommendation Ranking Logic

When multiple products are available, rank by:

1. **Primary:** Fastest timeline to re-qualification (ascending)
2. **Secondary:** Product type priority (tie-breaker)

### Product Priority Table

| Product Type | Timeline | Priority (lower = higher) |
|--------------|----------|---------------------------|
| Micro-Loan | 0 months | 1 |
| Debt Consolidation | 0 months | 2 |
| High-Yield Savings | 3 months | 3 |
| Secured Credit Builder | 6-9 months | 4 |

**Example:**
- User with HIGH_DTI + loanAmount=$15k gets TWO offers:
  1. Debt Consolidation (0 months, priority 2)
  2. Micro-Loan (0 months, priority 1)
- Ranking result: [Micro-Loan, Debt Consolidation]
- UI displays Micro-Loan first (faster path: immediate smaller loan approval)

### Maximum 3 Recommendations

```typescript
recommendations.sort((a, b) => {
  if (a.timelineMonths !== b.timelineMonths) {
    return a.timelineMonths - b.timelineMonths;  // Ascending: 0, 3, 6, 9
  }
  const priority = {
    MICRO_LOAN: 1,
    DEBT_CONSOLIDATION: 2,
    HIGH_YIELD_SAVINGS: 3,
    SECURED_CREDIT_BUILDER: 4,
  };
  return priority[a.productType] - priority[b.productType];
});

return recommendations.slice(0, 3);  // Top 3 only
```

---

## 6. Edge Cases & Error Handling

### Case 1: Multiple Decline Reasons

**Scenario:** Applicant has BOTH `HIGH_RISK_SCORE` (score=580) AND `INSUFFICIENT_INCOME` (income=$1,600)

**Logic:**
- Underwriting engine returns single primary `reasonCode` based on priority order
- Priority: HIGH_RISK_SCORE (step 1) fires before INSUFFICIENT_INCOME (step 2)
- ProductMapper sees `HIGH_RISK_SCORE` only
- Result: Recommend Secured Credit Builder only

**Alternative (Future Enhancement):**
- ProductMapper could analyze all failing conditions and recommend multiple products
- Example: Secured Credit Builder (for score) + High-Yield Savings (for income)
- Current Phase 2 spec: One reason code → One primary product recommendation

### Case 2: Consolidation Doesn't Help

**Scenario:** Even after 20% debt reduction, DTI still > 0.45

```typescript
const consolidatedDebt = inputs.monthlyDebt * 0.8;
const newDTI = (consolidatedDebt + estimatedPayment) / inputs.monthlyIncome;

if (newDTI > 0.45) {
  // Consolidation won't get them to counter-offer range
  // Don't offer consolidation product
  // Fall back to: "No feasible path at current income/debt levels"
  return { recommendations: [], emptyMessage: 'No retention products available...' };
}
```

**Mitigation:** Also offer Micro-Loan (smaller amount) as backup path.

### Case 3: Income Exactly $1,800

**Scenario:** `monthlyIncome = $1,800` (at threshold)

- Underwriting: `monthlyIncome >= 1800` → Passes income check
- ProductMapper: Never sees `INSUFFICIENT_INCOME` reason code
- Result: No High-Yield Savings offer (not needed)

### Case 4: Loan Amount Exactly $15,000, Score 650

**Scenario:** Subprime tier loan cap edge case

- Underwriting: score 600-659, loanAmount=$15,000, DTI=0.30
- Result: APPROVED (at the cap, not over)
- ProductMapper: Never called (not DECLINED)

---

## 7. Testing Scenarios

### Test 1: Secured Credit Builder

**Input:**
```typescript
inputs = { monthlyIncome: 2500, monthlyDebt: 300, creditScore: 570, loanAmount: 8000, termMonths: 36 }
benchmarkRate = 11.50
```

**Expected:**
- Decision: DECLINED (HIGH_RISK_SCORE)
- Product: Secured Credit Builder
- Gap: "Build credit from 570 to 640"
- Timeline: 7 months
- Key Terms: ["$200 deposit", "0% APR", "Reports to 3 bureaus", "Graduation after 6 months"]

### Test 2: High-Yield Savings

**Input:**
```typescript
inputs = { monthlyIncome: 1500, monthlyDebt: 200, creditScore: 720, loanAmount: 5000, termMonths: 24 }
benchmarkRate = 11.50
```

**Expected:**
- Decision: DECLINED (INSUFFICIENT_INCOME)
- Product: High-Yield Savings + Direct Deposit
- Gap: "Establish direct deposit history to reach $1,800/mo minimum"
- Timeline: 3 months
- Key Terms: ["No minimum balance", "4.50% APY", "Direct deposit bonus", "Mobile app"]

### Test 3: Debt Consolidation + Micro-Loan

**Input:**
```typescript
inputs = { monthlyIncome: 3000, monthlyDebt: 1200, creditScore: 680, loanAmount: 15000, termMonths: 36 }
benchmarkRate = 11.50
```

**Expected:**
- Decision: DECLINED (HIGH_DTI)
- Products (2 offers):
  1. Micro-Loan ($3,000-$5,000, immediate, Tier-2 APR)
  2. Debt Consolidation ($960/mo reduced debt, immediate)
- Gap (Consolidation): "Reduce DTI from 53.3% to 36%"
- Gap (Micro-Loan): "Approve $5,000 instead of $15,000"

### Test 4: No Products Available

**Input:**
```typescript
inputs = { monthlyIncome: 1200, monthlyDebt: 1300, creditScore: 550, loanAmount: 20000, termMonths: 24 }
benchmarkRate = 11.50
```

**Expected:**
- Decision: DECLINED (EXCESSIVE_DEBT + HIGH_RISK_SCORE)
- Primary reason: EXCESSIVE_DEBT (fires first in priority order)
- Consolidation check: monthlyDebt >= monthlyIncome → Can't consolidate (would need income increase first)
- Result: `emptyMessage = "No retention products available for this decline reason"`

---

## 8. Future Enhancements (Out of Phase 2 Scope)

1. **Dynamic APR Estimation:**
   - Query real consolidation loan APRs from bank's rate sheet
   - Calculate exact monthly payment reduction based on current credit card APRs

2. **Multi-Product Bundling:**
   - Recommend Secured Credit Builder + High-Yield Savings together
   - "Start with savings, graduate to credit builder after 3 months"

3. **Income Verification Integration:**
   - Connect to Plaid or similar to auto-verify direct deposit history
   - Auto-mark "Set up direct deposit" milestone as complete

4. **Credit Bureau Soft Pull:**
   - Fetch real credit report to identify specific negative items
   - Tailor credit builder messaging: "Dispute 2 collections, build 6 months on-time payment history"

5. **Machine Learning Timeline Estimation:**
   - Train on historical data: actual time from product acceptance to re-qualification
   - Replace static 10-points-per-month assumption with personalized prediction

6. **A/B Testing Product Order:**
   - Test whether users prefer fastest timeline vs. lowest cost
   - Dynamically adjust ranking based on conversion data

---

## Summary

The product recommendation engine uses **deterministic mathematical rules** to:
1. Map each decline reason to specific products
2. Calculate exact qualification gaps with numbers
3. Estimate realistic timelines to re-qualification
4. Rank recommendations by speed and feasibility

All calculations are **auditable** and **reproducible**, ensuring transparency for both applicants and regulatory review.

**Key Principle:** Every recommendation must have a clear mathematical path from "declined today" to "approved after completing this product" - no vague advice, only concrete numbers and timelines.
