# Path to Yes - UX Redesign Proposal

## Executive Summary

Transform the current single-page underwriting simulator into a guided, borrower-focused loan exploration experience with clear decision moments and visual hierarchy.

---

## Current State Issues

### 1. **First Impression Problems**
- Opens with technical jargon ("Offline Benchmark", "Near-Prime High DTI")
- Pre-filled form suggests "someone else's details"
- No clear entry point or borrower intent capture
- Looks like internal tool, not consumer product

### 2. **Visual Hierarchy Problems**
- Competing surfaces (white header, gray bg, bordered cards, nested cards)
- Most important number ($531/mo payment) is buried
- Cramped layout with excessive padding and borders
- No clear visual focus or progression

### 3. **Decision Flow Problems**
- "Apply This Fix" ends exploration immediately
- No comparison or trade-off visibility (longer term vs lower payment)
- No "undo" or ability to compare side-by-side
- Missing the key decision moment

---

## Proposed Solution: 5-Step Guided Journey

### Step 1: Loan Intent
**Purpose**: Capture what the borrower wants to accomplish

**Screen Elements**:
- **Hero heading**: "Explore a personal loan"
- **Main question**: "How much would you like to borrow?"
- **Amount selector**: Large, touch-friendly slider or stepper ($2,000 - $25,000)
- **Display**: Show amount in large numerals ($12,000)
- **Secondary link**: "Try an example scenario" (persona presets in modal/sheet)
- **Primary CTA**: "Continue" button (full-width mobile)

**Visual Treatment**:
- Warm off-white canvas (bg-stone-50 or bg-amber-50/5)
- Large indigo amount display (text-5xl font-bold text-indigo-600)
- Minimal chrome, focus on the amount

---

### Step 2: Financial Details
**Purpose**: Collect minimum info needed for estimate

**Screen Elements**:
- **Context bar**: Show chosen loan amount at top ("Personal loan: $12,000")
- **Heading**: "A few quick details"
- **Three formatted inputs**:
  1. Monthly income → with help text: "Include salary, wages, and regular income"
  2. Monthly debt payments → with help text: "Credit cards, auto loans, student loans, rent/mortgage"
  3. Estimated credit score → with help text: "Check Credit Karma or your bank app for free"
- **Input style**: Single formatted field per value (currency or plain number)
- **Primary CTA**: "See my estimate"

**Visual Treatment**:
- Clean white card with subtle shadow
- One field per row, generous touch targets (min 44px)
- Inline validation with helpful messages
- Progress indicator (Step 2 of 5)

---

### Step 3: Initial Estimate
**Purpose**: Present the estimate with clear next action

**Screen Elements**:
- **Hero display**: Monthly payment in very large type (text-6xl, $738/mo)
- **Details row**: "Amount $12,000 · 24 months · 14.0% APR"
- **Status label**: Quiet badge "May qualify with different terms"
- **Plain-language reason**: "With a 36-month term, your monthly payment could be lower"
- **Primary CTA**: "Compare a 36-month term"
- **Secondary action**: "Edit details"

**Visual Treatment**:
- Distinct estimate surface (bg-white with border-2 border-indigo-100)
- Massive payment number, near-black (text-slate-900)
- Compact metadata row (text-sm text-slate-600)
- Single, obvious next action

---

### Step 4: Side-by-Side Comparison
**Purpose**: Let borrower make informed trade-off decision

**Screen Elements**:
- **Heading**: "Compare your options"
- **Two-column comparison**:
  
  **Your original estimate** (left/top):
  - $738/mo
  - 24 months
  - Total: $17,712
  
  **36-month option** (right/bottom):
  - $531/mo
  - 36 months  
  - Total: $19,118
  - Badge: "Save $207/mo" in green
  
- **Trade-off callout**: "Longer term = lower monthly payment (+$1,406 total)"
- **Primary CTA**: "Use 36 months"
- **Secondary actions**: "Keep 24 months" | "Edit details"

**Visual Treatment**:
- Two cards side-by-side (desktop) or stacked (mobile)
- Highlight differences with color (green for savings, subtle gray for more)
- Equal visual weight, borrower chooses

---

### Step 5: Confirmation Summary
**Purpose**: Clear outcome and next steps

**Screen Elements**:
- **Status heading**: "Your estimated loan"
- **Large payment**: $531/mo in indigo
- **Summary details**:
  - Amount: $12,000
  - Term: 36 months (changed from 24)
  - Estimated APR: 14.0%
  - Total estimated cost: $19,118
- **What changed**: "✓ Extended term to lower monthly payment"
- **Disclaimer**: "This is a simulated estimate. Actual rates and terms..."
- **Actions**: "Start over" | "Explore another scenario"

**Visual Treatment**:
- Success state with indigo accent
- Clear "what you chose" summary
- Transparent about estimate nature

---

## Alternative Paths

### If No Eligible Option
Show on Step 3 screen (replace comparison CTA):
- **Status**: "No qualifying option available"
- **Plain reason**: "With these details, monthly debt would exceed 45% of income"
- **What to try**: 
  - "Reduce loan amount to $8,000"
  - "Increase monthly income"
  - "Pay down existing debt"
- **Secondary**: "Edit details" | "Learn about credit building"

### If Approved Immediately
Show on Step 3:
- **Hero**: "You may qualify!"
- **Large payment**: $738/mo
- **Status**: Green badge "Meets standard criteria"
- **CTA**: "See full details" → goes to Step 5 summary

---

## Visual Design System

### Color Palette
- **Canvas**: `bg-stone-50` (warm off-white)
- **Text**: `text-slate-900` (near-black primary), `text-slate-600` (secondary)
- **Brand action**: `bg-indigo-600` (primary CTA), `hover:bg-indigo-700`
- **Status colors**:
  - Success: `text-emerald-700`, `bg-emerald-50`
  - Warning: `text-amber-700`, `bg-amber-50` (use sparingly)
  - Info: `text-slate-700`, `bg-slate-50`
- **Surfaces**: 
  - Main card: `bg-white`, `border border-slate-200`, `shadow-sm`
  - Estimate highlight: `border-2 border-indigo-100`

### Typography Scale
- **Hero numbers**: `text-6xl font-bold` (payment amounts)
- **Large numbers**: `text-4xl font-semibold` (comparison amounts)
- **Headings**: `text-2xl font-semibold` (step titles)
- **Labels**: `text-sm font-medium` (field labels)
- **Body**: `text-base` (descriptions)
- **Helper text**: `text-sm text-slate-600`

### Component Patterns

#### Input Field
```tsx
<div className="space-y-2">
  <label className="text-sm font-medium text-slate-900">
    Monthly income
  </label>
  <input 
    type="text"
    className="w-full px-4 py-3 text-lg border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
    placeholder="$5,000"
  />
  <p className="text-sm text-slate-600">
    Include salary, wages, and regular income
  </p>
</div>
```

#### Primary CTA
```tsx
<button className="w-full py-4 text-lg font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
  Continue
</button>
```

#### Estimate Card
```tsx
<div className="p-8 bg-white border-2 border-indigo-100 rounded-2xl shadow-sm">
  <div className="text-6xl font-bold text-slate-900 mb-2">
    $531<span className="text-3xl text-slate-600">/mo</span>
  </div>
  <div className="text-sm text-slate-600">
    Amount $12,000 · 36 months · 14.0% APR
  </div>
</div>
```

---

## Implementation Priority

### Phase 1: Core Flow (MVP)
1. ✅ Step 1: Loan amount selection
2. ✅ Step 2: Financial details form
3. ✅ Step 3: Initial estimate display
4. ✅ Step 4: Comparison view (original vs 36-month)
5. ✅ Step 5: Summary/confirmation

### Phase 2: Polish
- Smooth step transitions
- Form validation with helpful errors
- "Edit details" navigation
- Undo functionality
- Example scenarios modal

### Phase 3: Edge Cases
- Handle all decision outcomes (approved, counter-offer, declined)
- Multiple recommendation options
- Credit building paths
- Progress tracking integration

---

## Success Metrics

**Before → After improvements:**
- First screen clarity: Technical form → Clear "How much?" question
- Visual focus: Scattered → Payment amount dominates
- Decision quality: Hidden trade-offs → Side-by-side comparison
- Exploration: Dead-end on "Apply" → Can undo, compare, restart
- Borrower confidence: Underwriting tool → Guided exploration

---

## Next Steps

1. Create new component structure:
   - `LoanAmountStep.tsx`
   - `FinancialDetailsStep.tsx`
   - `EstimateStep.tsx`
   - `ComparisonStep.tsx`
   - `SummaryStep.tsx`
   - `StepWizard.tsx` (orchestrator)

2. Update design tokens in Tailwind config
3. Build Step 1 → Step 3 flow first (simplest path)
4. Add comparison logic and Step 4
5. Connect to existing engine (unchanged)
6. Test on mobile and desktop
7. Add smooth transitions
8. Launch!

---

**Key Principle**: Every screen should answer "What do I do next?" immediately.
