// src/utils/storage.ts
// localStorage persistence helpers for ActivePlan and ProgressState
// Requirements: 12.3, 13.1, 13.6

import type { ActivePlan, ProgressState } from '../engine/types';

const ACTIVE_PLAN_KEY = 'pathToYesActivePlan';
const PROGRESS_STATE_KEY = 'pathToYesProgressState';

/**
 * Saves an ActivePlan to localStorage.
 * Serializes the plan to JSON and stores it with the standard key.
 * Handles storage errors gracefully by logging without throwing.
 * 
 * @param plan - The ActivePlan to persist
 */
export function saveActivePlan(plan: ActivePlan): void {
  try {
    const serialized = JSON.stringify(plan);
    localStorage.setItem(ACTIVE_PLAN_KEY, serialized);
  } catch (error) {
    console.error('[storage] Failed to save ActivePlan:', error);
  }
}

/**
 * Loads an ActivePlan from localStorage.
 * Returns null if the key doesn't exist, JSON is corrupted, or any error occurs.
 * 
 * @returns The persisted ActivePlan, or null if unavailable or corrupted
 */
export function loadActivePlan(): ActivePlan | null {
  try {
    const stored = localStorage.getItem(ACTIVE_PLAN_KEY);
    if (!stored) {
      return null;
    }
    
    const parsed = JSON.parse(stored) as ActivePlan;
    return parsed;
  } catch (error) {
    console.error('[storage] Failed to load ActivePlan:', error);
    return null;
  }
}

/**
 * Removes the ActivePlan from localStorage.
 * Used when the user exits the retention product flow or resets state.
 */
export function clearActivePlan(): void {
  try {
    localStorage.removeItem(ACTIVE_PLAN_KEY);
  } catch (error) {
    console.error('[storage] Failed to clear ActivePlan:', error);
  }
}

// ============================================================================
// ProgressState storage helpers
// ============================================================================

/**
 * Saves a ProgressState to localStorage.
 * Serializes the state to JSON and stores it with the standard key.
 * Handles storage errors gracefully by logging without throwing.
 * 
 * @param state - The ProgressState to persist
 */
export function saveProgressState(state: ProgressState): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(PROGRESS_STATE_KEY, serialized);
  } catch (error) {
    console.error('[storage] Failed to save ProgressState:', error);
  }
}

/**
 * Loads a ProgressState from localStorage.
 * Returns null if the key doesn't exist, JSON is corrupted, or any error occurs.
 * 
 * @returns The persisted ProgressState, or null if unavailable or corrupted
 */
export function loadProgressState(): ProgressState | null {
  try {
    const stored = localStorage.getItem(PROGRESS_STATE_KEY);
    if (!stored) {
      return null;
    }
    
    const parsed = JSON.parse(stored) as ProgressState;
    return parsed;
  } catch (error) {
    console.error('[storage] Failed to load ProgressState:', error);
    return null;
  }
}

/**
 * Removes the ProgressState from localStorage.
 * Used when the user exits the retention product flow or resets progress tracking.
 */
export function clearProgressState(): void {
  try {
    localStorage.removeItem(PROGRESS_STATE_KEY);
  } catch (error) {
    console.error('[storage] Failed to clear ProgressState:', error);
  }
}
