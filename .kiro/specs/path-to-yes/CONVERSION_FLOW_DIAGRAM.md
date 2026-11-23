# Path to Yes - Conversion Flow Diagram

## User Journey: From Decline to Approval

```
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICANT ENTERS INPUTS                      │
│  Monthly Income, Debt, Credit Score, Loan Amount, Term          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       v
              evaluateDecision()
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        v              v              v
    APPROVED      COUNTER-OFFER   DECLINED
        │              │              │
        v              v              v
   ┌─────────┐   ┌─────────┐   ┌──────────────────┐
   │Standard │   │Standard │   │ ConversionView   │
   │Decision │   │Decision │   │ (Product Offers) │
   │ Banner  │   │ Banner  │   └────────┬─────────┘
   └─────────┘   └────┬────┘            │
                      │                 │
                      v                 │
              ┌────────────────┐        │
              │PathToYesChecklist       │
              │(Apply This Fix)│        │
              └────────────────┘        │
                                        │
            ┌───────────────────────────┼───────────────────┐
            │                           │                   │
            v                           v                   v
      ┌─────────┐             ┌──────────────┐    ┌────────────┐
      │ Return  │             │ User Accepts │    │  User      │
      │   to    │             │   Product    │    │ Improves   │
      │Simulator│             │ Offer Card   │    │  Inputs &  │
      └─────────┘             └──────┬───────┘    │ Re-applies │
                                     │            └─────┬──────┘
                                     v                  │
                           Create ActivePlan            │
                           & ProgressState              │
                           → Save to localStorage       │
                                     │                  │
                                     v                  │
                   ┌───────────────────────────────┐   │
                   │   PROGRESS TRACKER DASHBOARD  │   │
                   │                               │   │
                   │  • Product Name & Icon        │   │
                   │  • Progress Bar (% complete)  │   │
                   │  • Metric Cards:              │   │
                   │    - Credit Score: 570 / 640  │   │
                   │    - DTI: 48% / 36%           │   │
                   │    - Income: $1600 / $2000    │   │
                   │    - Debt: $900 / $600        │   │
                   │  • Milestone Checklist:       │   │
                   │    ☐ Open account             │   │
                   │    ☐ First payment            │   │
                   │    ☐ 3 months on-time         │   │
                   │    ☐ 6 months on-time         │   │
                   │    ☐ Score update             │   │
                   │  • Re-Evaluate Button         │   │
                   │  • Start Over Button          │   │
                   └───────────┬───────────────────┘   │
                               │                       │
                ┌──────────────┼───────────────────────┘
                │              │
                v              v
        ┌────────────┐  ┌──────────────────┐
        │  User      │  │ All Milestones   │
        │  Toggles   │  │   Complete!      │
        │ Milestone  │  │ [Celebration]    │
        │ Checkboxes │  └────────┬─────────┘
        └─────┬──────┘           │
              │                  │
              │  Auto-save to    │
              │  localStorage    │
              │                  │
              v                  v
      Update completion %   Prominent Re-Evaluate
      & timeline estimate   Button (pulsing)
              │                  │
              └──────────────────┘
                       │
                       v
              User Clicks Re-Evaluate
              (Prompts for updated inputs)
                       │
                       v
              evaluateDecision(updatedInputs)
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        v              v              v
   APPROVED       COUNTER-OFFER    DECLINED
        │              │              │
        v              v              v
   ┌────────────┐ ┌────────────┐ ┌──────────┐
   │ SUCCESS!   │ │  PROGRESS  │ │  KEEP    │
   │ Celebrate  │ │  Continue  │ │  GOING   │
   │ & Prompt   │ │  Tracking  │ │  User    │
   │ to Apply   │ │            │ │  stays on│
   └────────────┘ └────────────┘ │  tracker │
                                  └──────────┘
```

---

## State Transitions

### localStorage Keys

```
Key: 'pathToYesActivePlan'
├─ Exists? → Render ProgressTracker (primary view)
└─ Null?   → Check Decision state

Key: 'pathToYesProgressState'
├─ Exists? → Load milestone completion & updated inputs
└─ Null?   → Initialize with product-specific milestones
```

### View Mode Decision Tree

```
App.tsx Mount
    │
    ├─ Load localStorage
    │
    ├─ activePlan exists?
    │   ├─ YES → Render ProgressTracker (Mode 1)
    │   │          └─ Show progress, milestones, re-evaluate button
    │   │
    │   └─ NO  → Check Decision
    │            │
    │            ├─ Decision === DECLINED?
    │            │   ├─ YES → Render ConversionView (Mode 2)
    │            │   │          └─ Show decline reason + product offers
    │            │   │
    │            │   └─ NO  → Render Standard Simulator (Mode 3)
    │            │              └─ Show DecisionBanner + PathToYesChecklist
    │            │
    │            └─ [Mode 3 is default]
```

---

## Product Recommendation Mapping

```
Decline Reason Code          →  Retention Product Recommendation
─────────────────────────────────────────────────────────────────

HIGH_RISK_SCORE              →  Secured Credit Builder Card
(creditScore < 600)          │  • $200 minimum deposit
                             │  • 0% APR on purchases
                             │  • Reports to 3 bureaus
                             │  • Timeline: 6-9 months to score 640
                             │  • Gap: "Build credit from 570 to 640"

INSUFFICIENT_INCOME          →  High-Yield Savings + Direct Deposit
(monthlyIncome < $1,800)     │  • 4.50% APY
                             │  • No minimum balance
                             │  • Set up direct deposit for bonus
                             │  • Timeline: 3 months deposit history
                             │  • Gap: "Establish income stability"

EXCESSIVE_DEBT               →  Debt Consolidation Loan
HIGH_DTI                     │  • Fixed APR, no prepayment penalty
(postLoanDTI > 0.45)         │  • ~20% reduction in monthly payment
                             │  • Close consolidated accounts
                             │  • Timeline: Immediate re-qualification
                             │  • Gap: "Reduce DTI from 48% to 36%"
                             │
                             └→ ALSO Micro-Loan (if loanAmount > $10k)
                                • Smaller amount that fits DTI
                                • $2,000 - $5,000 range
                                • Tier-2 pricing (APR + 2%)
                                • Timeline: Immediate approval
                                • Gap: "Approve $3,000 instead of $15,000"

LOAN_CAP_EXCEEDED            →  (Handled by PathToYesChecklist levers)
(600-659 score, loan > $15k) │  • Reduce loan amount to $15,000
                             │  • OR improve credit score to 660+
```

---

## Milestone Progression Examples

### Secured Credit Builder Card (6-9 months)

```
Month 0:  ☐ Open secured card account
          └─ User deposits $200 security deposit

Month 1:  ☑ Open account [✓]
          ☐ Make first on-time payment
          └─ User makes $25 payment on card

Month 2:  ☑ First payment [✓]
          ☐ Complete 3 months on-time payments
          └─ User continues making on-time payments

Month 4:  ☑ 3 months complete [✓]
          ☐ Complete 6 months on-time payments

Month 7:  ☑ 6 months complete [✓]
          ☐ Request credit score update
          └─ User checks credit report

Month 8:  ☑ All milestones complete [✓]
          └─ Score improved from 570 → 650
          └─ User clicks "Re-Evaluate Eligibility"
          └─ New Decision: APPROVED 🎉
```

### Debt Consolidation (Immediate)

```
Day 0:    ☐ Accept consolidation offer
          └─ User accepts offer to consolidate $12,000 debt

Day 1:    ☑ Accept offer [✓]
          ☐ Close consolidated accounts
          └─ User closes 3 credit card accounts

Day 7:    ☑ Close accounts [✓]
          ☐ Verify reduced monthly debt payment
          └─ Monthly debt drops from $900 → $720

Day 14:   ☑ Verify reduction [✓]
          ☐ Maintain new lower debt level for 2 months

Month 2:  ☑ Maintain 2 months [✓]
          └─ All milestones complete
          └─ User updates inputs: monthlyDebt = $720
          └─ User clicks "Re-Evaluate Eligibility"
          └─ New Decision: APPROVED 🎉
```

---

## localStorage Schema Example

### After Accepting Secured Credit Builder

```json
// Key: 'pathToYesActivePlan'
{
  "productType": "SECURED_CREDIT_BUILDER",
  "acceptedAt": "2024-01-15T14:30:00.000Z",
  "initialInputs": {
    "monthlyIncome": 1600,
    "monthlyDebt": 400,
    "creditScore": 570,
    "loanAmount": 10000,
    "termMonths": 36
  },
  "initialEngineResult": {
    "decision": "DECLINED",
    "reasonCode": "HIGH_RISK_SCORE",
    "apr": 0,
    "estimatedPayment": 0,
    "postLoanDTI": 0,
    "benchmarkRate": 11.50
  }
}

// Key: 'pathToYesProgressState'
{
  "milestones": [
    {
      "milestoneId": "scb-1",
      "label": "Open secured credit card account",
      "completed": true,
      "completedAt": "2024-01-16T10:00:00.000Z"
    },
    {
      "milestoneId": "scb-2",
      "label": "Make first on-time payment",
      "completed": true,
      "completedAt": "2024-02-10T09:15:00.000Z"
    },
    {
      "milestoneId": "scb-3",
      "label": "Complete 3 months of on-time payments",
      "completed": false,
      "completedAt": null
    },
    {
      "milestoneId": "scb-4",
      "label": "Complete 6 months of on-time payments",
      "completed": false,
      "completedAt": null
    },
    {
      "milestoneId": "scb-5",
      "label": "Request credit score update",
      "completed": false,
      "completedAt": null
    }
  ],
  "updatedInputs": null,
  "lastUpdated": "2024-02-10T09:15:30.000Z"
}
```

---

## UI Component Hierarchy (Phase 2 Extensions)

```
App.tsx
├─ [Mode 1: activePlan exists]
│   └─ ProgressTracker
│       ├─ Product Header (name, icon, progress bar)
│       ├─ MetricProgressCard × 4
│       │   ├─ Credit Score: 570 / 640
│       │   ├─ DTI: 48% / 36%
│       │   ├─ Income: $1600 / $2000
│       │   └─ Debt: $900 / $600
│       ├─ MilestoneChecklist
│       │   └─ Milestone × N (with timeline/Gantt view)
│       ├─ Success Banner (if all milestones complete)
│       ├─ Re-Evaluate Button
│       └─ Start Over Button
│
├─ [Mode 2: Decision === DECLINED, no activePlan]
│   └─ ConversionView
│       ├─ DeclineReasonDetail (exact numbers)
│       ├─ ProductOfferCard × 1-3
│       │   ├─ Product icon & name
│       │   ├─ Qualification gap
│       │   ├─ Timeline estimate
│       │   ├─ Key terms (bullet list)
│       │   ├─ Gap metrics (current vs. target)
│       │   └─ "Accept & Start Plan" button
│       └─ "Return to Simulator" button
│
└─ [Mode 3: Standard simulator (default)]
    ├─ ApplicantInputPanel
    ├─ DecisionBanner
    ├─ PathToYesChecklist (if COUNTER_OFFER or DECLINED)
    └─ AdverseActionModal (if user clicks "View Decline Reasons")
```

---

## Key User Actions & Side Effects

| User Action | Side Effect | localStorage | State Update |
|-------------|-------------|--------------|--------------|
| Accept Product Offer | Create ActivePlan & ProgressState | Save both keys | activePlan, progressState |
| Toggle Milestone Checkbox | Update milestone.completed & completedAt | Save progressState | progressState |
| Re-Evaluate Eligibility | Re-run evaluateDecision with updated inputs | Save progressState.updatedInputs | Display new Decision |
| Start Over | Clear all progress | Clear both keys | activePlan=null, progressState=null, inputs=DEFAULT |
| Return to Simulator | Exit ConversionView | No change | No change |
| Page Refresh | Reload from localStorage | No change | Restore activePlan & progressState on mount |

---

## Success Metrics (For Demo Purposes)

### Conversion Rate
- **Baseline:** 100% of DECLINED users see dead-end screen → 0% conversion
- **Phase 2:** 100% of DECLINED users see product offers → Target 20-30% accept product

### Progress Completion
- **Milestone Completion Rate:** % of users who complete at least 1 milestone after accepting product
- **Re-Evaluation Rate:** % of users who click "Re-Evaluate Eligibility" after completing milestones
- **Re-Qualification Rate:** % of re-evaluations that result in APPROVED or COUNTER_OFFER

### Persistence
- **Return Rate:** % of users who return to ProgressTracker after page refresh (proves localStorage works)
- **Time to Re-Apply:** Average days between accepting product and re-evaluating eligibility

---

## Demo Flow for Reviewers

### 1. Experience Decline → Conversion → Progress Tracking
```
1. Load app with preset "Credit-Thin" (score 570, income $2800)
   → Decision: DECLINED (HIGH_RISK_SCORE)
   
2. See ConversionView with Secured Credit Builder offer
   → Qualification gap: "Build credit from 570 to 640"
   → Timeline: 6-9 months
   
3. Click "Accept & Start Plan"
   → Transition to ProgressTracker dashboard
   
4. Toggle milestones one by one (simulating progress over months)
   → Watch progress bar fill up (0% → 20% → 40% → 60% → 80% → 100%)
   
5. After all milestones complete, see celebration banner
   → "All milestones complete - Ready to re-apply!"
   
6. Click "Re-Evaluate Eligibility"
   → Manually update credit score to 650
   → See new Decision: APPROVED 🎉
   
7. Refresh page
   → Progress state persists (all milestones still checked)
   
8. Click "Start Over"
   → Return to standard simulator with DEFAULT_INPUTS
```

### 2. Experience Different Product Types
```
A. HIGH_DTI → Debt Consolidation
   - Set: income=$3000, debt=$1500, score=680, loan=$10k
   - Accept consolidation offer
   - See milestones: Accept → Close accounts → Verify reduction → Maintain
   
B. INSUFFICIENT_INCOME → High-Yield Savings
   - Set: income=$1500, debt=$200, score=720, loan=$5k
   - Accept savings + direct deposit offer
   - See milestones: Open account → Set up DD → 3 months → Emergency savings
   
C. HIGH_DTI + Large Loan → Micro-Loan
   - Set: income=$3000, debt=$1200, score=680, loan=$15k
   - See 2 offers: Consolidation + Micro-Loan
   - Accept micro-loan (smaller amount, immediate approval)
```

---

This conversion flow transforms a dead-end decline into a nurturing journey that:
1. **Educates** the applicant on exactly what went wrong (with numbers)
2. **Offers** specific products they qualify for today
3. **Guides** them through a clear milestone path to re-qualification
4. **Celebrates** their progress when they re-apply and get approved

The result: declined applicants become nurtured leads with a clear path forward.
