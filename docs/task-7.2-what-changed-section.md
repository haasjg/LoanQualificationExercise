# Task 7.2: "What Changed" Section Implementation

## Requirements Reference
- **Requirement 14.6 (Step 5: Summary)**: "THE Simulator SHALL display a 'What changed' section showing which inputs were adjusted from the original request (e.g., 'Extended term from 24 to 36 months to lower monthly payment')."

## Implementation Summary

### Changes Made

#### 1. SummaryStep Component (`src/components/wizard/SummaryStep.tsx`)
- Added `originalPayment?: number` prop to SummaryStepProps interface
- Added logic to calculate `paymentReduction` when both `originalTerm` and `originalPayment` are provided
- Updated "What changed" section to display payment reduction amount: "Extended term from X to Y months to lower monthly payment by $Z"
- Conditional display: only shows payment reduction amount when `paymentReduction > 0`

#### 2. LoanWizard Component (`src/components/wizard/LoanWizard.tsx`)
- Added `originalPayment` state variable to track the original estimated payment
- Updated `handleCompareTerms()` to capture the current `estimatedPayment` when entering comparison view
- Updated `handleStartOver()` to reset `originalPayment` to `undefined`
- Updated `handleSelectScenario()` to reset `originalPayment` to `undefined`
- Passed `originalPayment` prop to `SummaryStep` component

#### 3. Test Coverage (`src/components/wizard/SummaryStep.test.tsx`)
- Added new test: "shows 'What changed' section with payment reduction when both originalTerm and originalPayment are provided"
- Verifies that the payment reduction amount is correctly calculated and displayed
- Example: originalPayment=$450.50, currentPayment=$300.25 → displays "$150.25" reduction

### Design Specification Compliance

The implementation matches the design mockup from `.kiro/specs/path-to-yes/design.md`:

```
What changed
+----------------------------------------------------------+
|  Extended term from 36 to 48 months to lower monthly     |
|  payment by $62.                                         |
|  [slate-50 bg, text-sm slate-700]                        |
+----------------------------------------------------------+
```

**Visual Styling:**
- Background: `bg-slate-50` ✅
- Text size: `text-sm` ✅
- Text color: `text-slate-700` ✅
- Rounded corners: `rounded-lg` ✅
- Padding: `p-4` ✅
- Section heading: `text-base font-semibold text-slate-900 mb-2` ✅

### Behavior

1. **When term changed AND originalPayment provided**: Displays full message with payment reduction
   - Example: "Extended term from 24 to 36 months to lower monthly payment by $150.25."

2. **When term changed but NO originalPayment**: Displays message without payment amount
   - Example: "Extended term from 24 to 36 months to lower monthly payment."

3. **When term NOT changed**: "What changed" section is not displayed

### Verification

#### Test Results
```bash
✓ src/components/wizard/SummaryStep.test.tsx (9 tests)
  ✓ shows "What changed" section when term changed
  ✓ shows "What changed" section with payment reduction when both originalTerm and originalPayment are provided
  ✓ does not show "What changed" section when term did not change
```

#### Build Verification
```bash
npm run build
✓ TypeScript compilation successful
✓ Vite build successful
✓ No errors or warnings
```

### User Flow Example

1. User enters loan request: $10,000 at 24 months
2. User enters financial details: $5,000 income, $500 debt, 650 credit score
3. EstimateStep displays monthly payment: $450.50
4. User clicks "Compare a 36-month term"
5. **LoanWizard captures originalPayment = $450.50**
6. ComparisonStep shows side-by-side comparison
7. User selects "Use 36 months"
8. **SummaryStep displays**: "Extended term from 24 to 36 months to lower monthly payment by $150.25."

## Requirement Traceability
- **Requirement 14.6 (Acceptance Criteria #2)**: ✅ COMPLETE
  - "What changed" section displays correctly
  - Shows which inputs were adjusted (term change)
  - Includes exact payment reduction amount
  - Matches design specification for styling and layout

## Status
✅ **COMPLETE** - Task 7.2 is fully implemented and tested.
