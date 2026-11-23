# Spec Extension Summary - Phase 2 Additions

## Overview

The Path to Yes specification has been successfully extended to add comprehensive post-denial conversion and progress-tracking capabilities. This document summarizes all changes made to the spec files.

---

## Files Modified

### 1. requirements.md (+8 KB, 36 KB total)

**Added:**
- 10 new glossary terms (ProductMapper, RetentionProduct, ConversionView, ProgressTracker, ActivePlan, ProgressState, Milestone, etc.)
- **Requirement 11:** Decline-Reason-to-Product Mapping (6 acceptance criteria)
- **Requirement 12:** Interactive Path to Yes Offer Cards (6 acceptance criteria)
- **Requirement 13:** Personal Progress Tracker Dashboard (10 acceptance criteria)

**Total:** 3 new requirements, 22 new acceptance criteria

---

### 2. design.md (+30 KB, 79 KB total)

**Added:**
- Post-Denial Conversion & Progress Tracking Architecture section
- High-level flow diagram (Applicant → Decline → ConversionView → Accept → ProgressTracker)
- localStorage schema (ActivePlan + ProgressState interfaces)
- **New Engine Module:** productMapper.ts (5 functions, ~200 lines)
- **New Engine Module:** milestones.ts (1 function, 4 product catalogs)
- **New Component:** ConversionView.tsx (props, layout, DeclineReasonDetail sub-component)
- **New Component:** ProductOfferCard.tsx (props, card layout)
- **New Component:** ProgressTracker.tsx (props, 6 sub-sections)
- **New Component:** MetricProgressCard.tsx (props, progress calculation)
- **New Component:** MilestoneChecklist.tsx (props, timeline/Gantt chart)
- **New Types:** RetentionProductType enum, ActivePlan, ProgressState, MilestoneStatus, ProductRecommendation, ProductRecommendationResult

**Code Samples:**
- productMapper.ts full implementation (~150 lines)
- getInitialMilestones() full implementation (~60 lines)
- ConversionView.tsx component structure
- ProgressTracker.tsx component structure

---

### 3. tasks.md (+16 KB, 41 KB total)

**Added:**
- **Phase 2:** Post-Denial Conversion & Progress Tracking section header
- **11 new top-level tasks (19-29):**
  - Task 19: Extend engine types (3 subtasks)
  - Task 20: Implement productMapper.ts (7 subtasks)
  - Task 21: Implement milestones.ts (2 subtasks)
  - Task 22: Implement localStorage utilities (3 subtasks)
  - Task 23: Implement ProductOfferCard.tsx (3 subtasks)
  - Task 24: Implement ConversionView.tsx (4 subtasks)
  - Task 25: Implement MetricProgressCard.tsx (3 subtasks)
  - Task 26: Implement MilestoneChecklist.tsx (4 subtasks)
  - Task 27: Implement ProgressTracker.tsx (7 subtasks)
  - Task 28: Update App.tsx for conversion flow (8 subtasks)
  - Task 29: Final verification for Phase 2 (5 subtasks)

**Updated:**
- Task Dependency Graph: Added 24 new waves (45-68)
- Notes section: Added Phase 2 notes subsection

**Total:** 49 new subtasks, all with requirement traceability

---

## New Documentation Files Created

### 4. PHASE2_ADDITIONS.md (15 KB)

**Purpose:** Comprehensive summary of all Phase 2 additions

**Contents:**
- What was added (3 new requirements)
- 2 new engine modules (productMapper.ts, milestones.ts)
- 5 new React components
- localStorage integration schema
- App.tsx state & logic updates
- New types & enums
- Task breakdown table
- Testing strategy
- Key design decisions
- Requirements coverage mapping

---

### 5. CONVERSION_FLOW_DIAGRAM.md (18 KB)

**Purpose:** Visual flow diagrams and user journey documentation

**Contents:**
- User journey flowchart (Decline → Conversion → Progress → Re-Apply)
- State transition diagrams
- View mode decision tree
- Product recommendation mapping table
- Milestone progression examples (2 detailed scenarios)
- localStorage schema examples (JSON)
- UI component hierarchy diagram
- Key user actions & side effects table
- Success metrics definitions
- Demo flow for reviewers (step-by-step walkthrough)

---

### 6. PRODUCT_RECOMMENDATION_LOGIC.md (15 KB)

**Purpose:** Detailed mathematical specifications for product recommendations

**Contents:**
- Secured Credit Builder qualification gap calculation
- High-Yield Savings timeline estimation
- Debt Consolidation 20% reduction formula
- Micro-Loan maximum amount solver (reverse amortization)
- Recommendation ranking algorithm
- Edge cases & error handling
- 4 complete testing scenarios with expected outputs
- Future enhancement ideas

---

### 7. SPEC_EXTENSION_SUMMARY.md (This File)

**Purpose:** High-level summary of all spec changes

---

## Statistics

### Lines of Code (Spec Files)

| File | Before | After | Added |
|------|--------|-------|-------|
| requirements.md | 28 KB | 36 KB | +8 KB |
| design.md | 49 KB | 79 KB | +30 KB |
| tasks.md | 25 KB | 41 KB | +16 KB |
| **New Files** | - | 48 KB | +48 KB |
| **Total** | 102 KB | 204 KB | **+102 KB** |

### Content Breakdown

| Category | Phase 1 | Phase 2 | Total |
|----------|---------|---------|-------|
| Requirements | 10 | 3 | 13 |
| Acceptance Criteria | ~80 | 22 | ~102 |
| Engine Modules | 5 | 2 | 7 |
| React Components | 6 | 5 | 11 |
| Top-Level Tasks | 18 | 11 | 29 |
| Subtasks | ~100 | 49 | ~149 |
| Glossary Terms | 15 | 10 | 25 |
| Test Scenarios | ~40 | ~20 | ~60 |

---

## Key Architectural Changes

### Before Phase 2 (Original Spec)

```
Applicant → Inputs → Decision
              ↓
         APPROVED → Done
         COUNTER_OFFER → PathToYesChecklist (Apply This Fix)
         DECLINED → AdverseActionModal (View Reasons) → Dead End
```

**Problem:** DECLINED users hit a dead end with no actionable path forward.

---

### After Phase 2 (Extended Spec)

```
Applicant → Inputs → Decision
              ↓
         APPROVED → Done
         COUNTER_OFFER → PathToYesChecklist
         DECLINED → ConversionView (Product Offers)
              ↓
         Accept Product → ProgressTracker
              ↓
         Complete Milestones → Re-Evaluate
              ↓
         APPROVED → Success! 🎉
```

**Solution:** DECLINED users are nurtured through a conversion flow with specific products, milestone tracking, and re-evaluation path.

---

## Three View Modes (App.tsx Logic)

### Mode 1: ProgressTracker (Primary View)
**Trigger:** `activePlan` exists in localStorage  
**Replaces:** Entire simulator layout  
**Purpose:** Track progress toward re-qualification  
**Components:** ProgressTracker → MetricProgressCard × 4, MilestoneChecklist  

### Mode 2: ConversionView (Conversion View)
**Trigger:** Decision is DECLINED, no activePlan  
**Replaces:** DecisionBanner only  
**Purpose:** Offer retention products  
**Components:** ConversionView → ProductOfferCard × 1-3  

### Mode 3: Standard Simulator (Default View)
**Trigger:** All other cases  
**Replaces:** Nothing (original behavior)  
**Purpose:** Standard loan simulation  
**Components:** ApplicantInputPanel, DecisionBanner, PathToYesChecklist  

---

## Product Catalog

### 4 Retention Products

| Product | Decline Reason | Timeline | Key Metric Improved |
|---------|----------------|----------|---------------------|
| Secured Credit Builder | HIGH_RISK_SCORE | 6-9 months | Credit Score (570→640) |
| High-Yield Savings + DD | INSUFFICIENT_INCOME | 3 months | Monthly Income (stability) |
| Debt Consolidation | HIGH_DTI / EXCESSIVE_DEBT | Immediate | DTI (48%→36%) |
| Micro-Loan | HIGH_DTI + Large Loan | Immediate | Loan Amount ($15k→$5k) |

---

## Milestone Catalog

### Product-Specific Milestones

**Secured Credit Builder (5 milestones, 6-9 months):**
1. Open secured card account
2. Make first on-time payment
3. Complete 3 months on-time payments
4. Complete 6 months on-time payments
5. Request credit score update

**High-Yield Savings (4 milestones, 3 months):**
1. Open high-yield savings account
2. Set up direct deposit
3. Maintain direct deposit for 3 months
4. Build emergency savings to $1,000+

**Micro-Loan (4 milestones, variable):**
1. Accept micro-loan offer
2. Make first payment on time
3. Complete 50% of loan term
4. Complete full loan term

**Debt Consolidation (4 milestones, 2 months):**
1. Accept debt consolidation offer
2. Close consolidated accounts
3. Verify reduced monthly debt payment
4. Maintain new lower debt level for 2 months

---

## Testing Coverage

### Phase 1 (Original)
- ~40 engine unit tests
- ~15 component tests
- ~5 integration tests
- **Total:** ~60 tests

### Phase 2 (New)
- ~20 engine unit tests (productMapper, milestones)
- ~15 component tests (5 new components × 3 tests each)
- ~10 integration tests (App.tsx conversion flow, localStorage persistence)
- **Total:** ~45 new tests

### Combined Total: ~105 tests

---

## Implementation Complexity

### Phase 1 Complexity (Original)
- **Engine:** Pure TypeScript, deterministic math → Low complexity
- **Components:** Standard React patterns → Medium complexity
- **API:** FRED client with timeout/cache/fallback → Medium complexity

### Phase 2 Complexity (New)
- **Engine:** Pure TypeScript, deterministic mapping → Low complexity
- **localStorage:** Browser API with error handling → Low complexity
- **Components:** React with complex state management → High complexity
- **App.tsx:** 3-mode view switching logic → High complexity

**Risk Areas:**
1. localStorage quota exceeded handling
2. App.tsx view mode state machine
3. ProgressTracker milestone toggle + re-evaluate flow
4. ConversionView responsive layout (product cards stack)

---

## Recommended Implementation Order

Based on dependency graph and complexity:

### Stage 1: Foundation (Low Risk)
- Task 19: Extend types
- Task 21: Implement milestones.ts
- Task 22: Implement localStorage utilities
- **Verification:** Unit tests pass, no React dependencies

### Stage 2: Product Mapper (Medium Risk)
- Task 20: Implement productMapper.ts
- **Verification:** Unit tests pass, all 4 product types covered

### Stage 3: Simple Components (Medium Risk)
- Task 23: ProductOfferCard.tsx
- Task 25: MetricProgressCard.tsx
- **Verification:** Storybook or component tests render correctly

### Stage 4: Complex Components (High Risk)
- Task 26: MilestoneChecklist.tsx (with timeline/Gantt)
- Task 24: ConversionView.tsx (with DeclineReasonDetail)
- Task 27: ProgressTracker.tsx (with all sub-sections)
- **Verification:** Component tests + visual regression tests

### Stage 5: Integration (Highest Risk)
- Task 28: Update App.tsx (3-mode view switching)
- **Verification:** Integration tests + manual QA on all 3 modes

### Stage 6: Final Verification (Critical)
- Task 29: Final verification for Phase 2
- **Verification:** All tests pass, localStorage persists, responsive layouts work

---

## Success Criteria

### Functional Requirements
- ✓ All 3 new requirements (11, 12, 13) have passing acceptance criteria tests
- ✓ All 4 product types map correctly to decline reasons
- ✓ All 4 milestone catalogs initialize correctly
- ✓ localStorage persistence survives page refresh
- ✓ ProgressTracker displays all metrics and milestones
- ✓ Re-evaluate flow updates Decision correctly
- ✓ Start Over clears state and returns to simulator

### Non-Functional Requirements
- ✓ No React imports in engine modules (testability)
- ✓ localStorage operations wrapped in try-catch (error handling)
- ✓ All components responsive on mobile + desktop
- ✓ No NaN, Infinity, or null in calculations
- ✓ All spec files updated and consistent

---

## Documentation Quality Metrics

### Completeness
- ✓ All new requirements have acceptance criteria
- ✓ All new functions have TypeScript signatures
- ✓ All new components have props interfaces
- ✓ All new tasks have requirement traceability

### Clarity
- ✓ Flow diagrams for user journey
- ✓ Mathematical formulas for all calculations
- ✓ Testing scenarios with expected outputs
- ✓ Edge cases documented with error handling

### Maintainability
- ✓ Design decisions explained with rationale
- ✓ Future enhancements identified but out of scope
- ✓ Dependency graph updated for Phase 2
- ✓ Notes section updated with Phase 2 guidance

---

## Deliverables Summary

### Phase 1 (Original, Already Complete)
- ✓ Core simulator with FRED integration
- ✓ Deterministic underwriting engine
- ✓ Solver with "Apply This Fix" levers
- ✓ 3 persona presets
- ✓ ~60 tests with property-based testing

### Phase 2 (New, Ready to Implement)
- [ ] 2 new engine modules (productMapper, milestones)
- [ ] 5 new React components (ConversionView, ProductOfferCard, ProgressTracker, MetricProgressCard, MilestoneChecklist)
- [ ] localStorage integration (2 keys, 6 helpers)
- [ ] App.tsx conversion flow (8 new handlers)
- [ ] ~45 new tests

### Documentation (Complete)
- ✓ requirements.md extended with 3 requirements
- ✓ design.md extended with architecture
- ✓ tasks.md extended with 11 tasks
- ✓ 4 new supporting documents (PHASE2_ADDITIONS, CONVERSION_FLOW_DIAGRAM, PRODUCT_RECOMMENDATION_LOGIC, SPEC_EXTENSION_SUMMARY)

---

## Review Checklist

Before starting implementation, verify:

- [ ] All requirements are clear and testable
- [ ] All design decisions have rationale documented
- [ ] All components have props interfaces defined
- [ ] All engine functions have pure TypeScript signatures
- [ ] All tasks have requirement traceability
- [ ] Dependency graph is complete and accurate
- [ ] Testing strategy covers all new code paths
- [ ] Edge cases are identified and handled
- [ ] localStorage error handling is specified
- [ ] Responsive layouts are defined for all components

---

## Estimated Effort

### Phase 1 (Original, Already Complete)
- **Effort:** ~40 hours (complete)

### Phase 2 (New)
| Task Category | Subtasks | Est. Hours | Notes |
|---------------|----------|------------|-------|
| Types & Utilities | 8 | 4 hours | Low complexity, mostly boilerplate |
| Engine Modules | 9 | 8 hours | Pure functions, well-specified |
| Simple Components | 6 | 6 hours | Standard React patterns |
| Complex Components | 11 | 16 hours | State management + responsive |
| App.tsx Integration | 8 | 10 hours | 3-mode view switching logic |
| Testing | 5 | 10 hours | Unit + component + integration |
| **Total Phase 2** | **47** | **54 hours** | ~7 days for 1 developer |

### Total Project Effort: ~94 hours (~12 days)

---

## Conclusion

The Path to Yes specification has been successfully extended with comprehensive post-denial conversion and progress-tracking capabilities. The spec is now ready for Phase 2 implementation, with:

- **Clear requirements** (3 new requirements, 22 acceptance criteria)
- **Detailed design** (architecture, components, data models)
- **Actionable tasks** (11 tasks, 49 subtasks, all with traceability)
- **Supporting documentation** (flow diagrams, calculation logic, testing scenarios)

The extension maintains the same quality standards as Phase 1:
- Pure TypeScript engine modules (zero React imports)
- Deterministic, auditable calculations
- Comprehensive test coverage
- Responsive, accessible UI design

**Next Step:** Begin Phase 2 implementation starting with Task 19 (Extend engine types).
