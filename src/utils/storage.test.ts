// src/utils/storage.test.ts
// Unit tests for localStorage persistence helpers
// Requirements: 12.3, 13.1, 13.6

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveActivePlan,
  loadActivePlan,
  clearActivePlan,
  saveProgressState,
  loadProgressState,
  clearProgressState,
} from './storage';
import type { ActivePlan, ProgressState } from '../engine/types';
import { RetentionProductType, Decision, ReasonCode } from '../engine/types';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('ActivePlan storage', () => {
    const mockActivePlan: ActivePlan = {
      productType: RetentionProductType.SECURED_CREDIT_BUILDER,
      acceptedAt: '2024-01-15T10:30:00Z',
      initialInputs: {
        monthlyIncome: 2800,
        monthlyDebt: 200,
        creditScore: 570,
        loanAmount: 7000,
        termMonths: 36,
      },
      initialEngineResult: {
        decision: Decision.DECLINED,
        reasonCode: ReasonCode.HIGH_RISK_SCORE,
        apr: 16.5,
        estimatedPayment: 250.5,
        postLoanDTI: 0.1609,
        benchmarkRate: 11.5,
      },
    };

    it('should save and load ActivePlan successfully', () => {
      saveActivePlan(mockActivePlan);
      const loaded = loadActivePlan();
      expect(loaded).toEqual(mockActivePlan);
    });

    it('should return null when no ActivePlan exists', () => {
      const loaded = loadActivePlan();
      expect(loaded).toBeNull();
    });

    it('should clear ActivePlan from storage', () => {
      saveActivePlan(mockActivePlan);
      clearActivePlan();
      const loaded = loadActivePlan();
      expect(loaded).toBeNull();
    });

    it('should handle corrupted JSON gracefully', () => {
      localStorage.setItem('pathToYesActivePlan', 'invalid-json{]');
      const loaded = loadActivePlan();
      expect(loaded).toBeNull();
    });

    it('should handle storage errors gracefully in save', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage full');
      });

      saveActivePlan(mockActivePlan);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[storage] Failed to save ActivePlan:',
        expect.any(Error)
      );

      setItemSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('ProgressState storage', () => {
    const mockProgressState: ProgressState = {
      milestones: [
        {
          milestoneId: 'milestone-1',
          label: 'Pay down $200 in monthly debt',
          completed: true,
          completedAt: '2024-02-01T14:00:00Z',
        },
        {
          milestoneId: 'milestone-2',
          label: 'Reach credit score 640',
          completed: false,
          completedAt: null,
        },
      ],
      updatedInputs: {
        monthlyIncome: 2800,
        monthlyDebt: 150,
        creditScore: 620,
        loanAmount: 7000,
        termMonths: 36,
      },
      lastUpdated: '2024-02-01T14:00:00Z',
    };

    it('should save and load ProgressState successfully', () => {
      saveProgressState(mockProgressState);
      const loaded = loadProgressState();
      expect(loaded).toEqual(mockProgressState);
    });

    it('should return null when no ProgressState exists', () => {
      const loaded = loadProgressState();
      expect(loaded).toBeNull();
    });

    it('should clear ProgressState from storage', () => {
      saveProgressState(mockProgressState);
      clearProgressState();
      const loaded = loadProgressState();
      expect(loaded).toBeNull();
    });

    it('should handle corrupted JSON gracefully', () => {
      localStorage.setItem('pathToYesProgressState', '{incomplete json');
      const loaded = loadProgressState();
      expect(loaded).toBeNull();
    });

    it('should handle storage errors gracefully in save', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage full');
      });

      saveProgressState(mockProgressState);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[storage] Failed to save ProgressState:',
        expect.any(Error)
      );

      setItemSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle load errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      const loaded = loadProgressState();
      expect(loaded).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[storage] Failed to load ProgressState:',
        expect.any(Error)
      );

      getItemSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle clear errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      clearProgressState();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[storage] Failed to clear ProgressState:',
        expect.any(Error)
      );

      removeItemSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('storage isolation', () => {
    it('should keep ActivePlan and ProgressState separate', () => {
      const mockActivePlan: ActivePlan = {
        productType: RetentionProductType.HIGH_YIELD_SAVINGS,
        acceptedAt: '2024-01-15T10:30:00Z',
        initialInputs: {
          monthlyIncome: 2500,
          monthlyDebt: 300,
          creditScore: 580,
          loanAmount: 5000,
          termMonths: 24,
        },
        initialEngineResult: {
          decision: Decision.DECLINED,
          reasonCode: ReasonCode.INSUFFICIENT_INCOME,
          apr: 16.5,
          estimatedPayment: 250.5,
          postLoanDTI: 0.22,
          benchmarkRate: 11.5,
        },
      };

      const mockProgressState: ProgressState = {
        milestones: [
          {
            milestoneId: 'milestone-1',
            label: 'Increase income by $500',
            completed: false,
            completedAt: null,
          },
        ],
        updatedInputs: {
          monthlyIncome: 2500,
          monthlyDebt: 300,
          creditScore: 580,
          loanAmount: 5000,
          termMonths: 24,
        },
        lastUpdated: '2024-02-01T14:00:00Z',
      };

      saveActivePlan(mockActivePlan);
      saveProgressState(mockProgressState);

      const loadedPlan = loadActivePlan();
      const loadedProgress = loadProgressState();

      expect(loadedPlan).toEqual(mockActivePlan);
      expect(loadedProgress).toEqual(mockProgressState);

      clearActivePlan();
      expect(loadActivePlan()).toBeNull();
      expect(loadProgressState()).toEqual(mockProgressState);

      clearProgressState();
      expect(loadProgressState()).toBeNull();
    });
  });
});
