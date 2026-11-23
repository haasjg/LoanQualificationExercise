# Path to Yes - Specification Documentation

## Overview

This directory contains the complete specification for **Path to Yes**, a digital banking pre-qualification and credit-decisioning simulator with post-denial conversion and progress-tracking capabilities.

---

## Document Index

### Core Specification Files

#### 1. [requirements.md](./requirements.md) (36 KB)
**Purpose:** Formal requirements document with acceptance criteria

**Contents:**
- Glossary (25 terms)
- 13 Requirements with 102+ acceptance criteria:
  - Requirements 1-10: Core simulator (Phase 1)
  - Requirements 11-13: Conversion & progress tracking (Phase 2)

**Use Case:** Validation, compliance review, QA test planning

---

#### 2. [design.md](./design.md) (79 KB)
**Purpose:** Technical architecture and implementation design

**Contents:**
- High-level architecture diagrams
- Data flow and component hierarchy
- Complete TypeScript interfaces and function signatures
- Engine modules: underwriting, solver, productMapper, milestones
- React components: 11 components with props
- FRED API client design
- Correctness properties (11 formal properties for testing)

**Use Case:** Developer reference, code review, architecture decisions

---

#### 3. [tasks.md](./tasks.md) (41 KB)
**Purpose:** Implementation task breakdown with dependency graph

**Contents:**
- 29 top-level tasks organized into 2 phases
- 149 subtasks with requirement traceability
- Dependency graph (68 waves)
- Notes section with implementation guidance
- Task status tracking (Phase 1 complete, Phase 2 pending)

**Use Case:** Sprint planning, progress tracking, work assignment

---

### Supporting Documentation

#### 4. [PHASE2_ADDITIONS.md](./PHASE2_ADDITIONS.md) (15 KB)
**Purpose:** Summary of Phase 2 extensions to the original spec

**Contents:**
- What was added (3 requirements, 2 engine modules, 5 components)
- New data models (ActivePlan, ProgressState, ProductRecommendation)
- localStorage integration schema
- Task breakdown table (11 tasks, 49 subtasks)
- Testing strategy
- Key design decisions
- Requirements coverage mapping

**Use Case:** Phase 2 kickoff, stakeholder review, design rationale

---

#### 5. [CONVERSION_FLOW_DIAGRAM.md](./CONVERSION_FLOW_DIAGRAM.md) (18 KB)
**Purpose:** Visual flow diagrams and user journey documentation

**Contents:**
- Complete user journey flowchart (decline → conversion → progress → approval)
- State transition diagrams (localStorage keys, view mode decision tree)
- Product recommendation mapping table
- 2 detailed milestone progression examples (Secured Credit Builder, Debt Consolidation)
- localStorage schema examples (JSON)
- UI component hierarchy diagram
- Demo flow for reviewers (step-by-step walkthrough)

**Use Case:** UX review, user testing planning, demo preparation

---

#### 6. [PRODUCT_RECOMMENDATION_LOGIC.md](./PRODUCT_RECOMMENDATION_LOGIC.md) (15 KB)
**Purpose:** Detailed mathematical specifications for product recommendations

**Contents:**
- 4 product recommendation algorithms:
  - Secured Credit Builder (credit score gap, 10 points/month formula)
  - High-Yield Savings (3-month direct deposit timeline)
  - Debt Consolidation (20% debt reduction calculation)
  - Micro-Loan (reverse amortization solver for max loan amount)
- Recommendation ranking algorithm
- Edge cases & error handling (5 scenarios)
- 4 complete testing scenarios with expected outputs
- Future enhancement ideas

**Use Case:** Engine implementation, mathematical verification, product team review

---

#### 7. [SPEC_EXTENSION_SUMMARY.md](./SPEC_EXTENSION_SUMMARY.md) (This File)
**Purpose:** High-level summary of all Phase 2 spec changes

**Contents:**
- Files modified breakdown (what changed in each file)
- Statistics (lines added, requirements, components, tasks)
- Architectural changes (before/after diagrams)
- 3 view modes explanation
- Product catalog table
- Milestone catalog table
- Testing coverage expansion
- Implementation complexity analysis
- Recommended implementation order
- Success criteria checklist
- Estimated effort breakdown

**Use Case:** Project planning, effort estimation, change tracking

---

## Quick Start Guide

### For Product Managers / Stakeholders
**Start Here:**
1. [CONVERSION_FLOW_DIAGRAM.md](./CONVERSION_FLOW_DIAGRAM.md) - See user journey and flow diagrams
2. [PHASE2_ADDITIONS.md](./PHASE2_ADDITIONS.md) - Understand what's new in Phase 2
3. [requirements.md](./requirements.md) - Review requirements 11-13 for acceptance criteria

### For Developers
**Start Here:**
1. [design.md](./design.md) - Understand architecture and component design
2. [tasks.md](./tasks.md) - See implementation task breakdown
3. [PRODUCT_RECOMMENDATION_LOGIC.md](./PRODUCT_RECOMMENDATION_LOGIC.md) - Understand product mapping math

### For QA / Testers
**Start Here:**
1. [requirements.md](./requirements.md) - Extract acceptance criteria for test cases
2. [CONVERSION_FLOW_DIAGRAM.md](./CONVERSION_FLOW_DIAGRAM.md) - See user flows for end-to-end tests
3. [tasks.md](./tasks.md) - See testing strategy notes

### For Project Managers
**Start Here:**
1. [SPEC_EXTENSION_SUMMARY.md](./SPEC_EXTENSION_SUMMARY.md) - See effort estimates and complexity
2. [tasks.md](./tasks.md) - Review dependency graph and task breakdown
3. [PHASE2_ADDITIONS.md](./PHASE2_ADDITIONS.md) - Understand Phase 2 scope

---

## Document Relationships

```
requirements.md (What to build)
        ↓
   design.md (How to build)
        ↓
   tasks.md (Work breakdown)
        ↓
   Implementation

Supporting Documents:
├─ PHASE2_ADDITIONS.md (Phase 2 summary)
├─ CONVERSION_FLOW_DIAGRAM.md (User journey)
├─ PRODUCT_RECOMMENDATION_LOGIC.md (Math specs)
└─ SPEC_EXTENSION_SUMMARY.md (Change summary)
```

---

## Specification Statistics

### Total Documentation Size: 204 KB (4,657 lines)

| File | Size | Lines | Purpose |
|------|------|-------|---------|
| requirements.md | 36 KB | ~700 | Requirements & acceptance criteria |
| design.md | 79 KB | ~1,800 | Architecture & technical design |
| tasks.md | 41 KB | ~1,000 | Task breakdown & dependencies |
| PHASE2_ADDITIONS.md | 15 KB | ~400 | Phase 2 summary |
| CONVERSION_FLOW_DIAGRAM.md | 18 KB | ~450 | Flow diagrams & user journey |
| PRODUCT_RECOMMENDATION_LOGIC.md | 15 KB | ~400 | Mathematical specifications |
| SPEC_EXTENSION_SUMMARY.md | (New) | ~300 | Change summary & metrics |

### Content Breakdown

- **13 Requirements** (10 Phase 1, 3 Phase 2)
- **102+ Acceptance Criteria**
- **7 Engine Modules** (5 Phase 1, 2 Phase 2)
- **11 React Components** (6 Phase 1, 5 Phase 2)
- **29 Top-Level Tasks** (18 Phase 1, 11 Phase 2)
- **149 Subtasks**
- **25 Glossary Terms**
- **60+ Test Scenarios**

---

## Key Features by Phase

### Phase 1: Core Simulator (Complete)
- ✓ Applicant input sandbox with 5 financial parameters
- ✓ APR tier computation anchored to FRED benchmark rate
- ✓ Standard amortization and DTI calculation
- ✓ Deterministic decisioning (APPROVED / COUNTER_OFFER / DECLINED)
- ✓ Path to Yes solver with 4 concrete levers
- ✓ "Apply This Fix" one-click interactivity
- ✓ FRED API integration with timeout/cache/fallback
- ✓ Adverse action modal with plain-English reasons
- ✓ 3 persona presets (Prime, Near-Prime, Credit-Thin)
- ✓ Full Vitest coverage with property-based testing

### Phase 2: Conversion & Progress Tracking (Pending)
- [ ] Decline-reason-to-product mapping (4 retention products)
- [ ] Interactive conversion view with product offer cards
- [ ] Personal progress tracker dashboard
- [ ] Product-specific milestone checklists (4 catalogs)
- [ ] Current vs. target metric cards (credit score, DTI, income, debt)
- [ ] Re-evaluate eligibility flow with success celebration
- [ ] localStorage persistence (activePlan + progressState)
- [ ] 3-mode view switching (ProgressTracker / ConversionView / Standard)
- [ ] Responsive mobile + desktop layouts
- [ ] ~45 new tests (unit + component + integration)

---

## Quality Standards

All specifications follow these standards:

### Requirements
- ✓ SHALL/WHEN/IF language for acceptance criteria
- ✓ Testable, measurable, unambiguous
- ✓ Traceability to implementation tasks
- ✓ Edge cases and error conditions specified

### Design
- ✓ Pure TypeScript engine modules (zero React imports)
- ✓ Explicit return types on all functions
- ✓ Complete TypeScript interfaces for all data models
- ✓ Deterministic, auditable calculations
- ✓ Formal correctness properties for testing

### Tasks
- ✓ Requirement traceability on every subtask
- ✓ Dependency graph with execution waves
- ✓ Test coverage specified for each module
- ✓ Implementation notes and guidance

### Documentation
- ✓ Clear, active-voice prose
- ✓ Visual diagrams for complex flows
- ✓ Code examples with TypeScript
- ✓ Testing scenarios with expected outputs

---

## Model Routing (Credit Budget)

Per workspace steering rule `model_routing.md`:

| Phase | Active Model | Credit Cost | Tasks |
|-------|--------------|-------------|-------|
| Phase 1: Specs | Claude Sonnet 4.5 | 1.3x | Generate requirements.md, design.md |
| Phase 2: Scaffolding | Qwen3 Coder Next | 0.05x | Generate tasks.md, initialize project |
| Phase 3: Engine | DeepSeek v3.2 | 0.25x | Implement pure TypeScript engine modules |
| Phase 4: UI | MiniMax 2.1 | 0.15x | Implement React components |
| Phase 5: Audit | DeepSeek v3.2 | 0.25x | Final verification, README updates |

**Current Status:** Phase 1 complete (specs finalized). Ready to switch to Qwen3 Coder Next for scaffolding and engine implementation.

---

## Implementation Phases

### Phase 1: Core Simulator (Tasks 1-18)
**Status:** ✅ Complete  
**Duration:** ~40 hours  
**Deliverables:**
- Core underwriting engine + solver
- 6 React components
- FRED API integration
- ~60 tests (unit + component + property-based)

### Phase 2: Conversion & Progress Tracking (Tasks 19-29)
**Status:** 📋 Pending  
**Duration:** ~54 hours (est.)  
**Deliverables:**
- 2 engine modules (productMapper, milestones)
- 5 React components (ConversionView, ProductOfferCard, ProgressTracker, MetricProgressCard, MilestoneChecklist)
- localStorage integration
- App.tsx 3-mode view switching
- ~45 new tests

**Total Project Duration:** ~94 hours (~12 days for 1 developer)

---

## Change Log

### 2024-11-23: Phase 2 Spec Extension
**Added:**
- 3 new requirements (11-13) with 22 acceptance criteria
- 2 new engine modules (productMapper.ts, milestones.ts)
- 5 new React components
- localStorage integration schema
- 11 new tasks (19-29) with 49 subtasks
- 4 new supporting documents (PHASE2_ADDITIONS, CONVERSION_FLOW_DIAGRAM, PRODUCT_RECOMMENDATION_LOGIC, SPEC_EXTENSION_SUMMARY)

**Modified:**
- requirements.md: +8 KB (10 new glossary terms, 3 requirements)
- design.md: +30 KB (architecture, components, data models)
- tasks.md: +16 KB (11 tasks, dependency graph update)

**Total Spec Growth:** +102 KB (100% increase from 102 KB → 204 KB)

---

## Contributing

When updating specifications:

1. **Maintain Consistency:** All requirements use SHALL/WHEN/IF language
2. **Add Traceability:** Every design element maps to a requirement, every task maps to a design element
3. **Update All Files:** When adding a feature, update requirements.md, design.md, AND tasks.md
4. **Document Decisions:** Add rationale for design choices in design.md or supporting docs
5. **Test Coverage:** Specify testing strategy for every new module in tasks.md

---

## References

### Workspace Rules
- `.kiro/rules/Project_and_Stack.md` - Tech stack standards
- `.kiro/rules/api_and_code_standards.md` - API resilience & code quality
- `.kiro/rules/model_routing.md` - Credit-saving model switching
- `.kiro/rules/ui_standards.md` - Tailwind design system
- `.kiro/rules/underwriting_rules.md` - Decisioning logic

### External APIs
- [FRED API Docs](https://fred.stlouisfed.org/docs/api/fred/) - Series TERMCBPER24NS (24-month personal loan rate)

### Tech Stack
- React 18 + Vite + TypeScript strict
- Tailwind CSS v3/v4
- lucide-react icons
- Vitest + fast-check (property-based testing)

---

## Contact

For questions about this specification:
- **Product:** Review requirements.md acceptance criteria
- **Architecture:** Review design.md component design
- **Implementation:** Review tasks.md task breakdown
- **User Flow:** Review CONVERSION_FLOW_DIAGRAM.md

---

**Last Updated:** 2024-11-23  
**Specification Version:** 2.0 (Phase 2 Extended)  
**Status:** ✅ Spec Complete, 📋 Implementation Pending
