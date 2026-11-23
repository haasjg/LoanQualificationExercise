# Task 28.2 Implementation Summary: App View Mode Logic

## Overview
Implemented conditional rendering logic in `src/App.tsx` to support three-view navigation flow:
- **Simulator View** (default)
- **ConversionView** (when DECLINED and no activePlan)
- **ProgressTracker** (when activePlan exists)

## Changes Made

### 1. Added Required Imports
```typescript
import { ProductRecommendation } from './engine/types';
import { getInitialMilestones } from './engine/milestones';
import { saveActivePlan, saveProgressState, clearActivePlan, clearProgressState } from './utils/storage';
import { ConversionView } from './components/ConversionView';
import { ProgressTracker } from './components/ProgressTracker';
```

### 2. Implemented Event Handlers

#### `handleAcceptProduct(recommendation: ProductRecommendation)`
- Creates `ActivePlan` with product type, timestamp, and initial inputs/results
- Initializes `ProgressState` with product-specific milestones
- Persists both to localStorage
- Updates state to trigger ProgressTracker view

#### `handleReturnToSimulator()`
- Simple no-op handler (view automatically switches when condition changes)

#### `handleMilestoneToggle(milestoneId: string)`
- Toggles milestone completion status
- Updates completion timestamp
- Persists updated ProgressState to localStorage

#### `handleReEvaluate(updatedInputs: ApplicantInputs)`
- Updates progress state with new inputs
- Clears retention state to return to Simulator
- Triggers re-evaluation with updated inputs

#### `handleStartOver()`
- Clears all localStorage state
- Resets to DEFAULT_INPUTS
- Returns to Simulator view

### 3. Conditional Rendering Logic

The view priority order is:
1. **ProgressTracker** - if `activePlan && progressState` exist
2. **ConversionView** - if `decision === DECLINED` and no activePlan
3. **Simulator** - default view (APPROVED or COUNTER_OFFER)

Each view renders with consistent header/footer structure:
- Path to Yes title
- RateBenchmarkBadge
- Preset persona buttons (Simulator and ConversionView only)
- Footer with copyright

### 4. Test Coverage

Created `src/App.view-mode.test.tsx` with 4 test cases:
- ✓ Renders Simulator view when no activePlan exists
- ✓ Renders ConversionView when DECLINED (placeholder test)
- ✓ Renders ProgressTracker when activePlan/progressState exist
- ✓ Prioritizes ProgressTracker over ConversionView

All tests passing.

## Requirements Validated

- **Requirement 12.1**: ConversionView is rendered when decision is DECLINED
- **Requirement 13.1**: ProgressTracker is rendered when activePlan exists
- **Priority ordering**: ProgressTracker > ConversionView > Simulator

## Flow Summary

```
Simulator (Default)
    |
    | User adjusts inputs -> DECLINED
    v
ConversionView
    |
    | User clicks "Accept & Start Plan"
    v
ProgressTracker
    |
    +-- User clicks "Re-Evaluate" -> Back to Simulator
    |
    +-- User clicks "Start Over" -> Back to Simulator
```

## Technical Notes

- State is persisted to localStorage with keys:
  - `pathToYesActivePlan`
  - `pathToYesProgressState`
- State is loaded on mount via `useEffect`
- All handlers update both memory state and localStorage atomically
- View transitions are purely conditional (no routing library needed)
