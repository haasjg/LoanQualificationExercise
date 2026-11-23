# Phase 2: Post-Denial Conversion & Progress Tracking - Spec Extensions

## Overview

This document summarizes the Phase 2 extensions added to the Path to Yes specification. Phase 2 transforms the post-denial experience from a dead-end into a constructive conversion and progress-tracking flow that nurtures declined applicants into future approvals.

---

## What Was Added

### 1. Three New Requirements (Requirements 11-13)

#### Requirement 11: Decline-Reason-to-Product Mapping
Maps each specific underwriting failure condition to targeted retention products with exact qualification math:
- **HIGH_RISK_SCORE** (< 600) → Secured Credit Builder Card
- **INSUFFICIENT_INCOME** (< $1,800) → High-Yield Savings + Direct Deposit
- **EXCESSIVE_DEBT** or **HIGH_DTI** → Debt Consolidation + Micro-Loan options
- Each recommendation includes qualification gap, timeline estimate, and key product terms
- Recommendations ranked by fastest timeline to re-qualification (0-9 months)

#### Requirement 12: Interactive Path to Yes Offer Cards
Replaces dead-end decline screen with constructive conversion view:
- Shows **why** the applicant was declined with exact numbers (e.g., "DTI is 48%, target is 36%")
- Displays 1-3 tailored product offers the applicant qualifies for **today**
- Each card has "Accept & Start Plan" one-click action
- Not a modal - renders inline as primary view when Decision is DECLINED
- "Return to Simulator" escape hatch to continue exploring without commitment

#### Requirement 13: Personal Progress Tracker Dashboard
Persistent, interactive client-side tracker backed by localStorage:
- Displays current vs. target qualification metrics (credit score, DTI, income, debt)
- Product-specific milestone checklist with completion tracking
- Estimated timeline to re-qualification
- "Re-Evaluate Eligibility" button to re-run underwriting with updated inputs
- Celebration/success state when all milestones complete or re-evaluation shows approval
- "Start Over" to clear state and return to simulator
- Fully responsive mobile + desktop layout

---

## 2. New Engine Modules

### productMapper.ts
Pure TypeScript module that maps decline reasons to retention products:

**Key Functions:**
- `computeProductRecommendations(engineResult, inputs)` - Main entry point
- `createSecuredCreditBuilderOffer(inputs)` - Credit score < 600
- `createHighYieldSavingsOffer(inputs)` - Insufficient income
- `createDebtConsolidationOffer(inputs, engineResult)` - High DTI / excessive debt
- `createMicroLoanOffer(inputs, engineResult)` - Smaller loan alternative

**Data Model:**
```typescript
interface ProductRecommendation {
  productType: RetentionProductType;
  productName: string;
  productIcon: string; // lucide-react icon name
  qualificationGap: string; // Plain-English explanation
  timelineMonths: number;
  timelineLabel: string;
  keyTerms: string[];
  gapMetrics: {
    currentValue: number | string;
    targetValue: number | string;
    metricLabel: string;
  };
}
```

### milestones.ts
Static milestone catalog for each product type:

**Product-Specific Milestones:**
- **Secured Credit Builder:** 5 milestones (open account → 6 months on-time payments → score update)
- **High-Yield Savings:** 4 milestones (open account → direct deposit → 3 months history → emergency savings)
- **Micro-Loan:** 4 milestones (accept offer → first payment → 50% term → full term)
- **Debt Consolidation:** 4 milestones (accept offer → close accounts → verify reduction → maintain 2 months)

**Key Function:**
- `getInitialMilestones(productType)` - Returns array of `MilestoneStatus` objects

---

## 3. New React Components

### ConversionView.tsx
Replaces DecisionBanner for DECLINED decisions:
- **DeclineReasonDetail** sub-component shows exact failure metrics
- Renders 1-3 **ProductOfferCard** components with recommendations
- Empty state if no products available
- "Return to Simulator" button to exit without accepting

**Props:**
```typescript
interface ConversionViewProps {
  engineResult: EngineResult;
  inputs: ApplicantInputs;
  onAcceptProduct: (recommendation: ProductRecommendation) => void;
  onReturnToSimulator: () => void;
}
```

### ProductOfferCard.tsx
Individual product offer card with one-click accept:
- Product icon, name, and qualification gap
- Timeline estimate with label
- Key terms as bullet list
- Gap metrics: current vs. target with visual indicator
- "Accept & Start Plan" CTA button

### ProgressTracker.tsx
Main dashboard for active Path to Yes plans:
- Product name and icon header
- Visual progress bar showing milestone completion %
- Grid of **MetricProgressCard** components (credit score, DTI, income, debt)
- **MilestoneChecklist** with checkboxes for demo simulation
- "Re-Evaluate Eligibility" button (prominent when all milestones complete)
- "Start Over" button to clear localStorage and return to simulator

**Props:**
```typescript
interface ProgressTrackerProps {
  activePlan: ActivePlan;
  progressState: ProgressState;
  benchmarkRate: number;
  onMilestoneToggle: (milestoneId: string) => void;
  onReEvaluate: (updatedInputs: ApplicantInputs) => void;
  onStartOver: () => void;
}
```

### MetricProgressCard.tsx
Displays single metric progress (credit score, DTI, income, debt):
- Current value with unit formatting ($, %, none)
- Target value
- Visual progress bar or radial indicator
- Inverse coloring for metrics where lower is better (DTI, debt)

### MilestoneChecklist.tsx
Checklist of product-specific milestones:
- Each item: checkbox, label, optional completion date
- Completed items: checked, strikethrough, timestamp
- Visual timeline/Gantt chart showing completed, in-progress, and upcoming milestones

---

## 4. localStorage Integration

### Schema

**Key: `pathToYesActivePlan`**
```typescript
interface ActivePlan {
  productType: RetentionProductType;
  acceptedAt: string; // ISO 8601 timestamp
  initialInputs: ApplicantInputs;
  initialEngineResult: EngineResult;
}
```

**Key: `pathToYesProgressState`**
```typescript
interface ProgressState {
  milestones: MilestoneStatus[];
  updatedInputs: ApplicantInputs | null;
  lastUpdated: string; // ISO 8601 timestamp
}

interface MilestoneStatus {
  milestoneId: string;
  label: string;
  completed: boolean;
  completedAt: string | null; // ISO 8601 timestamp
}
```

### Storage Helpers
- `saveActivePlan(plan)` / `loadActivePlan()` / `clearActivePlan()`
- `saveProgressState(state)` / `loadProgressState()` / `clearProgressState()`
- All operations wrapped in try-catch for graceful quota/corruption handling

---

## 5. App.tsx State & Logic Updates

### New State
```typescript
const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);
const [progressState, setProgressState] = useState<ProgressState | null>(null);
```

### View Mode Logic
App.tsx now manages **three distinct view modes**:

1. **ProgressTracker** (if `activePlan` exists in localStorage)
   - Primary view, replaces entire simulator layout
   - Shows milestone progress, metric cards, re-evaluate button

2. **ConversionView** (if Decision is `DECLINED` and no `activePlan`)
   - Replaces DecisionBanner with product offer cards
   - User can accept product or return to simulator

3. **Standard Simulator** (otherwise)
   - Original behavior: ApplicantInputPanel + DecisionBanner + PathToYesChecklist

### New Handlers

**handleAcceptProduct:**
- Create `ActivePlan` from recommendation + current inputs
- Create initial `ProgressState` with product-specific milestones
- Save both to localStorage
- Transition to ProgressTracker view

**handleMilestoneToggle:**
- Toggle `milestone.completed` status
- Set `completedAt` timestamp if newly completed
- Recalculate completion percentage
- Save updated `progressState` to localStorage

**handleReEvaluate:**
- Accept updated `ApplicantInputs` from user
- Re-run `evaluateDecision` with updated inputs
- Display success state if Decision is APPROVED or COUNTER_OFFER
- Save updated inputs to `progressState` in localStorage

**handleStartOver:**
- Clear `activePlan` and `progressState` from state
- Clear both localStorage keys
- Reset inputs to `DEFAULT_INPUTS`
- Return to standard simulator view

**handleReturnToSimulator:**
- Exit ConversionView without accepting product
- Return to standard DecisionBanner view
- Leave inputs unchanged

---

## 6. New Types & Enums

### RetentionProductType Enum
```typescript
enum RetentionProductType {
  SECURED_CREDIT_BUILDER = 'SECURED_CREDIT_BUILDER',
  HIGH_YIELD_SAVINGS = 'HIGH_YIELD_SAVINGS',
  MICRO_LOAN = 'MICRO_LOAN',
  DEBT_CONSOLIDATION = 'DEBT_CONSOLIDATION',
}
```

### Added to Glossary
- **ProductMapper**: Pure TypeScript module that maps decline reason codes to retention product recommendations
- **RetentionProduct**: One of four product types offered to declined applicants
- **ProductRecommendation**: Structured payload describing a single retention product offer
- **ConversionView**: UI component that replaces DecisionBanner for DECLINED decisions
- **ProgressTracker**: UI component that displays Personal Progress Tracker Dashboard
- **ActivePlan**: localStorage-persisted record of accepted retention product
- **ProgressState**: localStorage-persisted record of milestone completion and updated inputs
- **Milestone**: Single step in product-specific checklist with completion status

---

## 7. Task Breakdown

Phase 2 adds **11 new top-level tasks (19-29)** with **60+ subtasks**:

| Task | Description | Subtasks |
|------|-------------|----------|
| 19 | Extend engine types for conversion & progress tracking | 3 |
| 20 | Implement engine: productMapper.ts | 7 |
| 21 | Implement engine: milestones.ts | 2 |
| 22 | Implement localStorage utilities | 3 |
| 23 | Implement components: ProductOfferCard.tsx | 3 |
| 24 | Implement components: ConversionView.tsx | 4 |
| 25 | Implement components: MetricProgressCard.tsx | 3 |
| 26 | Implement components: MilestoneChecklist.tsx | 4 |
| 27 | Implement components: ProgressTracker.tsx | 7 |
| 28 | Update App.tsx for conversion flow | 8 |
| 29 | Final verification for Phase 2 | 5 |

**Total:** 49 new subtasks

**Dependency Waves:** Tasks 19-29 are independent of Phase 1 at the type level, but integration (Task 28) requires Phase 1 to be complete. All Phase 2 engine modules are pure TypeScript with zero React imports, maintaining the same testability standards as Phase 1.

---

## 8. Testing Strategy

### Unit Tests
- **productMapper.ts:** Test all 4 decline reason mappings, ranking logic, edge cases
- **milestones.ts:** Verify all 4 product types return correct milestone counts and unique IDs
- **localStorage helpers:** Test save/load round-trip, corrupted JSON handling, clear operations

### Component Tests
- **ProductOfferCard:** Render all fields, test accept button click
- **ConversionView:** Test all decline reason detail views, test product card rendering for 1/2/3 recommendations, test return button
- **MetricProgressCard:** Test normal/inverse metrics, progress bar calculation, unit formatting
- **MilestoneChecklist:** Test completed/uncompleted rendering, checkbox toggle, timeline visual states
- **ProgressTracker:** Test progress bar calculation, all-milestones-complete state, re-evaluate button, start over clears localStorage

### Integration Tests (App.tsx)
- Test accept product flow: DECLINED → ConversionView → Accept → ProgressTracker
- Test milestone toggle updates completion percentage
- Test re-evaluate with improved inputs shows success
- Test start over clears state and returns to simulator
- Test return to simulator exits conversion view
- **Test localStorage persistence across page refresh** (critical for user experience)

### Responsive Tests
- Verify ConversionView renders correctly on mobile and desktop
- Verify ProgressTracker metric cards stack vertically on mobile
- Verify milestone checklist and timeline render on small screens

---

## 9. Key Design Decisions

1. **ConversionView is NOT a modal** - It replaces the DecisionBanner inline, making the conversion path the primary experience rather than a secondary dialog.

2. **ProgressTracker becomes the primary view** - When an active plan exists, the entire app layout changes to focus on progress tracking, not just an overlay or sidebar.

3. **localStorage for persistence** - Ensures progress survives page refreshes, critical for a multi-day/week journey to re-qualification.

4. **Demo simulation via checkboxes** - Since this is a client-side MVP with no backend, milestone completion is manually toggled by the user to simulate real-world progress. In production, this would integrate with actual account/transaction data.

5. **Product recommendations computed on-demand** - Not persisted to state or localStorage - only the accepted product is saved. This keeps storage lean and allows for dynamic re-ranking if the user returns to ConversionView later.

6. **Re-evaluate eligibility as a celebration trigger** - When all milestones are complete and the user re-runs underwriting with improved inputs, the app celebrates progress if Decision improves to APPROVED or COUNTER_OFFER. This creates a motivational loop.

7. **Start Over as escape hatch** - Users can clear all progress and return to the simulator at any time, ensuring the demo flow is easy to reset for reviewers.

---

## 10. Requirements Coverage

### Phase 1 (Original)
- Requirements 1-10: Fully covered by Tasks 1-18

### Phase 2 (New)
- **Requirement 11:** Covered by Tasks 19-21 (types, productMapper, milestones)
- **Requirement 12:** Covered by Tasks 22-24 (localStorage, ProductOfferCard, ConversionView)
- **Requirement 13:** Covered by Tasks 25-28 (MetricProgressCard, MilestoneChecklist, ProgressTracker, App.tsx integration)

### Verification
- **Requirement 11:** 7 acceptance criteria, all mapped to productMapper tests
- **Requirement 12:** 6 acceptance criteria, all mapped to ConversionView tests and App.tsx integration tests
- **Requirement 13:** 10 acceptance criteria, all mapped to ProgressTracker tests, localStorage tests, and responsive layout tests

---

## Summary of Changes

| File | Lines Added | Key Additions |
|------|-------------|---------------|
| `requirements.md` | ~200 | 3 new requirements (11-13), 23 acceptance criteria, 10 new glossary terms |
| `design.md` | ~600 | productMapper architecture, ConversionView design, ProgressTracker design, localStorage schema, 4 new components, milestone catalog, App.tsx state updates |
| `tasks.md` | ~400 | 11 new top-level tasks (19-29), 49 new subtasks, updated dependency graph (24 new waves), Phase 2 notes section |

**Total spec expansion:** ~1,200 lines across 3 files

**New deliverables:** 2 engine modules, 5 React components, 1 localStorage utility module, 8 new App.tsx handlers

**Test coverage expansion:** ~30 new unit tests, ~20 new component tests, ~10 new integration tests

---

## Next Steps

With the specs now extended, the implementation can proceed in two phases:

**Phase 1 (Tasks 1-18):** Already complete - core simulator with FRED integration, decisioning engine, solver, and "Apply This Fix" interactivity.

**Phase 2 (Tasks 19-29):** To be implemented - post-denial conversion flow with product recommendations, offer cards, progress tracker dashboard, and localStorage persistence.

The spec is designed to allow Phase 2 to be implemented and tested independently after Phase 1 is verified, minimizing risk and enabling incremental delivery.
