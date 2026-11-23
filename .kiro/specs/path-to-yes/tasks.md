# Implementation Plan: Path to Yes

## Overview

This implementation plan covers the borrower-focused 5-step wizard flow (Requirement 14) and the restoration of multiple levers with cross-sell opportunities (Requirement 15). Requirement 14 has been completed; Requirement 15 tasks are ready for execution.

## Tasks

### Phase 1: Requirement 14 - Wizard Flow (COMPLETED)

- [x] 1. Update visual design system tokens
  - Update Tailwind configuration to use stone-50 canvas and slate-900 typography
  - Define indigo-600 primary CTA color system
  - Remove gray-50 and white background references
  - _Requirements: 14.7_

- [x] 2. Refactor wizard state management in App.tsx
  - [x] 2.1 Add wizard step state (1-5) and navigation handlers
    - Add `wizardStep` state, `setWizardStep` setter
    - Add `handleContinueFromStep1`, `handleContinueFromStep2` handlers
    - Add `handleCompareLever`, `handleUseAlternative`, `handleKeepOriginal` handlers
    - _Requirements: 14.8_
  
  - [x] 2.2 Split ApplicantInputs into LoanRequest and FinancialInputs
    - Create `LoanRequest` state with `{ amount, term }`
    - Create `FinancialInputs` state with `{ monthlyIncome, monthlyDebt, creditScore }`
    - Add `useMemo` to merge into full `ApplicantInputs` for engine
    - _Requirements: 14.1, 14.8_
  
  - [x] 2.3 Add comparison history state for undo functionality
    - Add `comparisonHistory` state array
    - Implement `handleUndo` to restore previous inputs
    - Store original and alternative states in history
    - _Requirements: 14.8_

- [x] 3. Build Step 1: LoanAmountStep component
  - [x] 3.1 Create component with loan amount slider/input
    - Display "How much would you like to borrow?" heading
    - Render amount in text-6xl font-bold numerals
    - Provide slider with $2,000-$25,000 range, $500 steps
    - _Requirements: 14.2_
  
  - [x] 3.2 Add term selector with radio pill buttons
    - Display 12, 24, 36, 48, 60 month options
    - Style as pill-shaped radio buttons with indigo-600 active state
    - Default to 36 months
    - _Requirements: 14.2_
  
  - [x] 3.3 Add "View example scenarios" modal
    - Create secondary link opening modal
    - Display 2-3 common scenarios without navigation
    - _Requirements: 14.2_

- [x] 4. Build Step 2: FinancialDetailsStep component
  - [x] 4.1 Create component with three financial inputs
    - Display monthly income input with thousand separators
    - Display monthly debt payments input with thousand separators
    - Display credit score slider with live value display
    - Add inline help text beneath each field
    - _Requirements: 14.3_
  
  - [x] 4.2 Add loan request summary card at top
    - Display chosen amount and term in compact card
    - Use slate-100 background, text-sm typography
    - _Requirements: 14.3_
  
  - [x] 4.3 Add validation and navigation controls
    - Validate all fields are non-empty and within ranges
    - Display inline validation messages
    - Add "Back" button to Step 1
    - Add "Continue" button to Step 3 (enabled when valid)
    - _Requirements: 14.3_

- [x] 5. Build Step 3: EstimateStep component
  - [x] 5.1 Display estimated monthly payment prominently
    - Render payment in text-7xl font-bold at top
    - Use slate-900 text on stone-50 canvas
    - Display loan amount, term, APR in compact row beneath
    - _Requirements: 14.4_
  
  - [x] 5.2 Add quiet status badge for decision
    - Display small pill badge (amber-100 or emerald-100) near summary
    - Show plain-language reason for counter-offer or decline
    - Use "Approved estimate" text for approved decisions
    - _Requirements: 14.4_
  
  - [x] 5.3 Display single comparison CTA button
    - Compute best alternative lever
    - Display "Compare [description]" button as primary action
    - Use indigo-600 background, full-width on mobile
    - _Requirements: 14.4_
  
  - [x] 5.4 Add secondary navigation links
    - Display "Edit details" and "Start over" as text links
    - Add "Simulated estimate" footer text
    - _Requirements: 14.4_

- [x] 6. Build Step 4: ComparisonStep component
  - [x] 6.1 Create side-by-side comparison layout
    - Display two columns: original estimate and alternative
    - Show loan amount, term, payment, APR, total cost in each
    - Stack vertically on mobile (<640px)
    - _Requirements: 14.5_
  
  - [x] 6.2 Add trade-off summary section
    - Compute monthly savings/increase with dollar amounts
    - Compute total cost difference with dollar amounts
    - Display in visually distinct row between columns
    - _Requirements: 14.5_
  
  - [x] 6.3 Add action buttons and navigation
    - Display "Use [term] months" primary CTA
    - Display "Keep original" and "Edit details" secondary actions
    - Wire up handlers to update inputs or return to previous steps
    - _Requirements: 14.5_

- [x] 7. Build Step 5: SummaryStep component
  - [x] 7.1 Display selected loan summary card
    - Show final loan amount, term, payment, APR, total cost
    - Use clean vertical summary card layout
    - _Requirements: 14.6_
  
  - [x] 7.2 Add "What changed" section
    - Display which inputs were adjusted from original request
    - Show plain-language reason for each change
    - _Requirements: 14.6_
  
  - [x] 7.3 Add primary CTA and navigation
    - Display "Start your application" button (if approved/counter)
    - Display "Explore other options" button (if declined)
    - Add "Edit details" and "Start over" secondary links
    - Add "Simulated estimate - not a final offer" disclaimer
    - _Requirements: 14.6_

- [x] 8. Update LoanWizard.tsx orchestrator
  - [x] 8.1 Implement wizard step routing
    - Add switch/conditional rendering based on `wizardStep` state
    - Route to correct step component (1-5)
    - _Requirements: 14.1_
  
  - [x] 8.2 Wire up navigation handlers
    - Connect all step transition handlers to state updates
    - Implement backward navigation preserving inputs
    - Implement forward navigation with validation
    - _Requirements: 14.8_
  
  - [x] 8.3 Integrate with existing engine and solver
    - Merge `LoanRequest` and `FinancialInputs` into `ApplicantInputs`
    - Call `evaluateDecision` after Step 2 complete
    - Compute `bestAlternative` for Step 3 CTA
    - _Requirements: 14.4_

- [x] 9. Update responsive layout and mobile-first patterns
  - [x] 9.1 Apply mobile-first breakpoints
    - Use full-width single-column layout below 640px
    - Center wizard in max-w-2xl container on desktop
    - Bottom-pin primary CTAs on mobile with min-h-12
    - _Requirements: 14.9_
  
  - [x] 9.2 Ensure 44×44px tap targets
    - Verify all buttons meet minimum accessible size
    - Test radio pills, links, slider thumbs
    - _Requirements: 14.9_
  
  - [x] 9.3 Test responsive comparison columns
    - Verify Step 4 stacks vertically on mobile
    - Verify side-by-side display on desktop
    - _Requirements: 14.9_

- [x] 10. Remove old Path to Yes checklist UI
  - Remove legacy PathToYesChecklist component from Step 3
  - Remove "Apply This Fix" button handlers (replaced by comparison flow)
  - Archive old UI components for reference
  - _Requirements: 14.1_

- [x] 11. Update existing component tests for new wizard flow
  - [x] 11.1 Add LoanAmountStep.test.tsx
    - Test amount slider interaction
    - Test term selector interaction
    - Test "Continue" navigation
    - _Requirements: 14.2_
  
  - [x] 11.2 Add FinancialDetailsStep.test.tsx
    - Test input validation
    - Test "Back" and "Continue" navigation
    - Test loan request summary display
    - _Requirements: 14.3_
  
  - [x] 11.3 Add EstimateStep.test.tsx
    - Test payment display for all decision states
    - Test comparison CTA rendering
    - Test navigation to Step 4
    - _Requirements: 14.4_
  
  - [x] 11.4 Add ComparisonStep.test.tsx
    - Test side-by-side layout
    - Test trade-off summary computation
    - Test "Use alternative" and "Keep original" actions
    - _Requirements: 14.5_

- [x] 12. Checkpoint - Ensure all tests pass
  - Run `npm test` to verify all unit tests pass
  - Verify wizard flow end-to-end in browser
  - Verify responsive layouts on mobile and desktop viewports
  - Ask user if questions arise

---

### Phase 2: Requirement 15 - Restore Multiple Levers and Cross-Sell

- [x] 13. Create LeverOptionCard component
  - [x] 13.1 Implement card layout and styling
    - Create component accepting `lever`, `isRecommended`, `onCompare` props
    - Apply white card background with slate-200 border and rounded-lg corners
    - Use p-6 padding and shadow-sm elevation
    - Apply border-2 border-indigo-300 or bg-indigo-50 when `isRecommended` is true
    - _Requirements: 15.2_
  
  - [x] 13.2 Add trade-off display
    - Display lever description as heading (text-lg font-semibold slate-900)
    - Display resulting monthly payment in text-3xl or text-4xl font-bold
    - Display `leverOutcome` as small badge (emerald-100 for APPROVED, amber-100 for COUNTER_OFFER)
    - Display trade-off summary as text-sm slate-600 (e.g., "Save $62/month, pay $1,260 more total")
    - _Requirements: 15.2_
  
  - [x] 13.3 Add "Compare this option" CTA
    - Add full-width button with indigo-600 background and text-white
    - Call `onCompare(lever)` when clicked
    - Display "Recommended" badge (text-xs indigo-600 bg-indigo-100) top-right when `isRecommended` is true
    - _Requirements: 15.2_

- [x] 14. Update EstimateStep to show all levers
  - [x] 14.1 Replace single CTA with LeverOptionCard grid
    - Remove single comparison CTA button from EstimateStep
    - Add "Your options" heading (text-lg font-semibold slate-900)
    - Render LeverOptionCard for each lever in `allLevers` array
    - Use vertical stack with space-y-4 on mobile, grid-cols-2 gap-6 on desktop (if space permits)
    - _Requirements: 15.1_
  
  - [x] 14.2 Highlight recommended lever
    - Pass `isRecommended={true}` to the most favorable lever card
    - Position recommended lever first in the list
    - Ensure max 4 lever cards displayed
    - _Requirements: 15.1_
  
  - [x] 14.3 Add empty state handling
    - Display "No automatic adjustments available" message when `allLevers` is empty
    - Show prominent "Edit details" button for empty state
    - _Requirements: 15.6_

- [x] 15. Update ComparisonStep for selected lever
  - [x] 15.1 Accept selectedLever prop
    - Update ComparisonStep props to accept `selectedLever: Lever`
    - Use `selectedLever.mutatedInputs` to compute alternative estimate
    - Display lever description in alternative column heading
    - _Requirements: 15.5_
  
  - [x] 15.2 Display correct alternative based on selection
    - Compute alternative `EngineResult` by merging `selectedLever.mutatedInputs` with original inputs
    - Display alternative payment, APR, term, total cost
    - Ensure trade-off summary reflects the selected lever's changes
    - _Requirements: 15.5_

- [x] 16. Integrate ConversionView for declined scenarios
  - [x] 16.1 Update wizard to show ConversionView when declined
    - Modify EstimateStep to conditionally render ConversionView instead of estimate display when Decision is DECLINED
    - Pass `engineResult`, `inputs`, `onAcceptProduct`, `onReturnToSimulator` props
    - _Requirements: 15.3_
  
  - [x] 16.2 Update ProductOfferCard styling to match Requirement 14
    - Apply white card background with slate-200 border and rounded-lg
    - Use text-lg font-semibold for product name, text-sm for body text
    - Apply indigo-600 CTA button styling
    - Display product icon in colored circle (p-3 rounded-full bg-indigo-100 text-indigo-600)
    - _Requirements: 15.3_
  
  - [x] 16.3 Wire up product acceptance handlers
    - Implement `onAcceptProduct` handler in App.tsx
    - Store accepted product in localStorage (`pathToYesActivePlan`)
    - Transition to ProgressTracker flow on acceptance
    - _Requirements: 15.3_

- [x] 17. Update LoanWizard state management
  - [x] 17.1 Add selectedLeverForComparison state
    - Add `selectedLeverForComparison: Lever | null` state
    - Initialize to null on mount
    - _Requirements: 15.5_
  
  - [x] 17.2 Update handleCompareLever to accept lever parameter
    - Change `handleCompareLever` signature to accept `lever: Lever`
    - Set `selectedLeverForComparison` to the passed lever
    - Store current state in comparison history
    - Navigate to Step 4 (ComparisonStep)
    - _Requirements: 15.5_

- [ ] 18. Test coverage for multi-lever selection
  - [ ]* 18.1 Add LeverOptionCard.test.tsx
    - Test card rendering with and without `isRecommended` flag
    - Test "Compare this option" button click handler
    - Test trade-off summary display
    - _Requirements: 15.2_
  
  - [ ]* 18.2 Update EstimateStep tests for multiple levers
    - Test rendering of multiple LeverOptionCard components
    - Test recommended lever highlighted correctly
    - Test empty state when no levers available
    - _Requirements: 15.1_
  
  - [ ]* 18.3 Update ComparisonStep tests for lever selection
    - Test alternative estimate computed from selected lever
    - Test trade-off summary reflects lever changes
    - Test navigation with selected lever
    - _Requirements: 15.5_

- [x] 19. Checkpoint - Verify all features restored
  - Run `npm test` to verify all unit tests pass
  - Test multi-lever display on counter-offer scenarios
  - Test comparison flow with each lever type
  - Test ConversionView display on declined scenarios
  - Test product acceptance flow to ProgressTracker
  - Ask user if questions arise

## Notes

- **Phase 1 (Tasks 1-12)**: Requirement 14 wizard flow implementation is complete. All tasks marked as done.
- **Phase 2 (Tasks 13-19)**: Requirement 15 restoration of multiple levers and cross-sell is ready for execution.
- Tasks marked with `*` are optional test tasks and can be skipped for faster MVP delivery.
- Each task references specific requirements for traceability.
- Checkpoints (12, 19) ensure incremental validation of functionality.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 2, "tasks": ["3.1", "3.2", "4.1", "4.2"] },
    { "id": 3, "tasks": ["3.3", "4.3", "5.1", "5.2"] },
    { "id": 4, "tasks": ["5.3", "5.4", "6.1", "6.2"] },
    { "id": 5, "tasks": ["6.3", "7.1", "7.2"] },
    { "id": 6, "tasks": ["7.3", "8.1", "8.2"] },
    { "id": 7, "tasks": ["8.3", "9.1", "9.2"] },
    { "id": 8, "tasks": ["9.3", "10"] },
    { "id": 9, "tasks": ["11.1", "11.2", "11.3", "11.4"] },
    { "id": 10, "tasks": ["12"] },
    { "id": 11, "tasks": ["13.1", "13.2"] },
    { "id": 12, "tasks": ["13.3", "14.1"] },
    { "id": 13, "tasks": ["14.2", "14.3", "15.1"] },
    { "id": 14, "tasks": ["15.2", "16.1"] },
    { "id": 15, "tasks": ["16.2", "16.3", "17.1"] },
    { "id": 16, "tasks": ["17.2"] },
    { "id": 17, "tasks": ["18.1", "18.2", "18.3"] },
    { "id": 18, "tasks": ["19"] }
  ]
}
```
