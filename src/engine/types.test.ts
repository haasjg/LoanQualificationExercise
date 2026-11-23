// src/engine/types.test.ts
import { describe, it, expect } from 'vitest'
import {
  ApplicantInputs,
  ApplicantPersonaPreset,
  DEFAULT_INPUTS,
  VALID_TERM_MONTHS,
  PERSONA_PRESETS,
  Decision,
  ReasonCode,
  LeverType,
  LeverOutcome,
  RateSource,
} from './types'
import * as fc from 'fast-check'
import * as engine from './index'

// Feature: path-to-yes, Property 11: Input range finiteness
describe('Property 11: Input range finiteness', () => {
  it('DEFAULT_INPUTS values should be finite numbers', () => {
    fc.assert(
      fc.property(
        fc.constant(DEFAULT_INPUTS),
        (inputs) => {
          // Verify all fields in DEFAULT_INPUTS are finite numbers
          expect(Number.isFinite(inputs.monthlyIncome)).toBe(true)
          expect(Number.isFinite(inputs.monthlyDebt)).toBe(true)
          expect(Number.isFinite(inputs.creditScore)).toBe(true)
          expect(Number.isFinite(inputs.loanAmount)).toBe(true)
          expect(Number.isFinite(inputs.termMonths)).toBe(true)
          
          // Verify no NaN or Infinity values
          expect(Number.isNaN(inputs.monthlyIncome)).toBe(false)
          expect(Number.isNaN(inputs.monthlyDebt)).toBe(false)
          expect(Number.isNaN(inputs.creditScore)).toBe(false)
          expect(Number.isNaN(inputs.loanAmount)).toBe(false)
          expect(Number.isNaN(inputs.termMonths)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('ApplicantInputs', () => {
  it('should have correct structure', () => {
    const inputs: ApplicantInputs = {
      monthlyIncome: 5000,
      monthlyDebt: 1000,
      creditScore: 700,
      loanAmount: 10000,
      termMonths: 36,
    }

    expect(inputs).toMatchObject({
      monthlyIncome: 5000,
      monthlyDebt: 1000,
      creditScore: 700,
      loanAmount: 10000,
      termMonths: 36,
    })
  })
})

describe('DEFAULT_INPUTS', () => {
  it('should have correct values for COUNTER_OFFER at 11.50% benchmark', () => {
    expect(DEFAULT_INPUTS.monthlyIncome).toBe(3500)
    expect(DEFAULT_INPUTS.monthlyDebt).toBe(600)
    expect(DEFAULT_INPUTS.creditScore).toBe(650)
    expect(DEFAULT_INPUTS.loanAmount).toBe(15000)
    expect(DEFAULT_INPUTS.termMonths).toBe(24)
  })

  it('should have all finite numbers', () => {
    expect(Number.isFinite(DEFAULT_INPUTS.monthlyIncome)).toBe(true)
    expect(Number.isFinite(DEFAULT_INPUTS.monthlyDebt)).toBe(true)
    expect(Number.isFinite(DEFAULT_INPUTS.creditScore)).toBe(true)
    expect(Number.isFinite(DEFAULT_INPUTS.loanAmount)).toBe(true)
    expect(Number.isFinite(DEFAULT_INPUTS.termMonths)).toBe(true)
    expect(Number.isNaN(DEFAULT_INPUTS.monthlyIncome)).toBe(false)
  })
})

describe('VALID_TERM_MONTHS', () => {
  it('should be the correct discrete set', () => {
    expect(VALID_TERM_MONTHS).toEqual([12, 24, 36, 48, 60])
  })

  it('should be readonly', () => {
    // TypeScript compile-time check - this won't compile if modified
    const validTerms: readonly number[] = VALID_TERM_MONTHS
    expect(validTerms).toEqual([12, 24, 36, 48, 60])
  })
})

describe('Input validations', () => {
  it('should validate monthlyIncome range ($1,800 - $25,000, step $100)', () => {
    const { monthlyIncome } = DEFAULT_INPUTS
    expect(monthlyIncome).toBeGreaterThanOrEqual(1800)
    expect(monthlyIncome).toBeLessThanOrEqual(25000)
    expect(monthlyIncome % 100).toBe(0)
  })

  it('should validate monthlyDebt range ($0 - $15,000, step $50)', () => {
    const { monthlyDebt } = DEFAULT_INPUTS
    expect(monthlyDebt).toBeGreaterThanOrEqual(0)
    expect(monthlyDebt).toBeLessThanOrEqual(15000)
    expect(monthlyDebt % 50).toBe(0)
  })

  it('should validate creditScore range (500 - 850, step 5)', () => {
    const { creditScore } = DEFAULT_INPUTS
    expect(creditScore).toBeGreaterThanOrEqual(500)
    expect(creditScore).toBeLessThanOrEqual(850)
    expect(creditScore % 5).toBe(0)
  })

  it('should validate loanAmount range ($2,000 - $25,000, step $500)', () => {
    const { loanAmount } = DEFAULT_INPUTS
    expect(loanAmount).toBeGreaterThanOrEqual(2000)
    expect(loanAmount).toBeLessThanOrEqual(25000)
    expect(loanAmount % 500).toBe(0)
  })

  it('should validate termMonths is in VALID_TERM_MONTHS', () => {
    const { termMonths } = DEFAULT_INPUTS
    expect(VALID_TERM_MONTHS).toContain(termMonths)
  })
})

// ============================================================================
// Feature: path-to-yes, Property 12: Enum integrity
// ============================================================================

describe('Decision enum', () => {
  it('should have exactly 3 values', () => {
    expect(Object.keys(Decision)).toHaveLength(3)
  })

  it('should have correct values', () => {
    expect(Decision.APPROVED).toBe('APPROVED')
    expect(Decision.COUNTER_OFFER).toBe('COUNTER_OFFER')
    expect(Decision.DECLINED).toBe('DECLINED')
  })
})

describe('ReasonCode enum', () => {
  it('should have exactly 7 values', () => {
    expect(Object.keys(ReasonCode)).toHaveLength(7)
  })

  it('should have correct values', () => {
    expect(ReasonCode.HIGH_RISK_SCORE).toBe('HIGH_RISK_SCORE')
    expect(ReasonCode.INSUFFICIENT_INCOME).toBe('INSUFFICIENT_INCOME')
    expect(ReasonCode.EXCESSIVE_DEBT).toBe('EXCESSIVE_DEBT')
    expect(ReasonCode.HIGH_DTI).toBe('HIGH_DTI')
    expect(ReasonCode.LOAN_CAP_EXCEEDED).toBe('LOAN_CAP_EXCEEDED')
    expect(ReasonCode.INVALID_TERM).toBe('INVALID_TERM')
    expect(ReasonCode.INVALID_INPUT).toBe('INVALID_INPUT')
  })
})

describe('LeverType enum', () => {
  it('should have exactly 4 values', () => {
    expect(Object.keys(LeverType)).toHaveLength(4)
  })

  it('should have correct values', () => {
    expect(LeverType.EXTEND_TERM).toBe('EXTEND_TERM')
    expect(LeverType.REDUCE_AMOUNT).toBe('REDUCE_AMOUNT')
    expect(LeverType.PAY_DOWN_DEBT).toBe('PAY_DOWN_DEBT')
    expect(LeverType.CREDIT_SCORE_MILESTONE).toBe('CREDIT_SCORE_MILESTONE')
  })
})

describe('LeverOutcome enum', () => {
  it('should have exactly 2 values', () => {
    expect(Object.keys(LeverOutcome)).toHaveLength(2)
  })

  it('should have correct values', () => {
    expect(LeverOutcome.APPROVED).toBe('APPROVED')
    expect(LeverOutcome.COUNTER_OFFER).toBe('COUNTER_OFFER')
  })
})

describe('RateSource enum', () => {
  it('should have exactly 3 values', () => {
    expect(Object.keys(RateSource)).toHaveLength(3)
  })

  it('should have correct values', () => {
    expect(RateSource.LIVE).toBe('LIVE')
    expect(RateSource.CACHED).toBe('CACHED')
    expect(RateSource.OFFLINE).toBe('OFFLINE')
  })
})

// ============================================================================
// Feature: path-to-yes, Property 13: Persona presets validation
// ============================================================================

describe('PERSONA_PRESETS', () => {
  it('should have exactly 3 presets', () => {
    expect(PERSONA_PRESETS).toHaveLength(3)
  })

  it('should have correct preset structure', () => {
    PERSONA_PRESETS.forEach((preset) => {
      expect(preset).toHaveProperty('label')
      expect(preset).toHaveProperty('description')
      expect(preset).toHaveProperty('inputs')
      expect(preset).toHaveProperty('expectedDecision')
    })
  })

  it('should contain all required preset labels', () => {
    const labels = PERSONA_PRESETS.map((p) => p.label)
    expect(labels).toContain('Prime Borrower')
    expect(labels).toContain('Near-Prime High DTI')
    expect(labels).toContain('Credit-Thin')
  })

  it('Prime Borrower should have APPROVED as expected decision', () => {
    const primePreset = PERSONA_PRESETS.find((p) => p.label === 'Prime Borrower')
    expect(primePreset?.expectedDecision).toBe(Decision.APPROVED)
  })

  it('Near-Prime High DTI should have COUNTER_OFFER as expected decision', () => {
    const nearPrimePreset = PERSONA_PRESETS.find((p) => p.label === 'Near-Prime High DTI')
    expect(nearPrimePreset?.expectedDecision).toBe(Decision.COUNTER_OFFER)
  })

  it('Credit-Thin should have DECLINED as expected decision', () => {
    const creditThinPreset = PERSONA_PRESETS.find((p) => p.label === 'Credit-Thin')
    expect(creditThinPreset?.expectedDecision).toBe(Decision.DECLINED)
  })

  it('Prime Borrower inputs should be finite numbers', () => {
    const primePreset = PERSONA_PRESETS.find((p) => p.label === 'Prime Borrower')
    const inputs = primePreset?.inputs
    
    expect(Number.isFinite(inputs?.monthlyIncome ?? NaN)).toBe(true)
    expect(Number.isFinite(inputs?.monthlyDebt ?? NaN)).toBe(true)
    expect(Number.isFinite(inputs?.creditScore ?? NaN)).toBe(true)
    expect(Number.isFinite(inputs?.loanAmount ?? NaN)).toBe(true)
    expect(Number.isFinite(inputs?.termMonths ?? NaN)).toBe(true)
  })

  it('Near-Prime High DTI inputs should be finite numbers', () => {
    const nearPrimePreset = PERSONA_PRESETS.find((p) => p.label === 'Near-Prime High DTI')
    const inputs = nearPrimePreset?.inputs
    
    expect(Number.isFinite(inputs?.monthlyIncome ?? NaN)).toBe(true)
    expect(Number.isFinite(inputs?.monthlyDebt ?? NaN)).toBe(true)
    expect(Number.isFinite(inputs?.creditScore ?? NaN)).toBe(true)
    expect(Number.isFinite(inputs?.loanAmount ?? NaN)).toBe(true)
    expect(Number.isFinite(inputs?.termMonths ?? NaN)).toBe(true)
  })

  it('Credit-Thin inputs should be finite numbers', () => {
    const creditThinPreset = PERSONA_PRESETS.find((p) => p.label === 'Credit-Thin')
    const inputs = creditThinPreset?.inputs
    
    expect(Number.isFinite(inputs?.monthlyIncome ?? NaN)).toBe(true)
    expect(Number.isFinite(inputs?.monthlyDebt ?? NaN)).toBe(true)
    expect(Number.isFinite(inputs?.creditScore ?? NaN)).toBe(true)
    expect(Number.isFinite(inputs?.loanAmount ?? NaN)).toBe(true)
    expect(Number.isFinite(inputs?.termMonths ?? NaN)).toBe(true)
  })
})

// ============================================================================
// Feature: path-to-yes, Property 14: Persona preset APR calculations (offline verification)
// ============================================================================

describe('Persona preset APR calculations at 11.50% benchmark', () => {
  it('Prime Borrower should get APR = 10.00% (benchmark - 1.50%, tier 720+)', () => {
    const primePreset = PERSONA_PRESETS.find((p) => p.label === 'Prime Borrower')
    const inputs = primePreset?.inputs
    
    if (inputs) {
      const apr = engine.computeAPR(inputs.creditScore, 11.50)
      expect(apr).toBe(10.00)
    }
  })

  it('Near-Prime High DTI should get APR = 16.50% (benchmark + 5.00%, tier 600-659)', () => {
    const nearPrimePreset = PERSONA_PRESETS.find((p) => p.label === 'Near-Prime High DTI')
    const inputs = nearPrimePreset?.inputs
    
    if (inputs) {
      const apr = engine.computeAPR(inputs.creditScore, 11.50)
      expect(apr).toBe(16.50)
    }
  })

  it('Credit-Thin should get APR = null (score 570 < 600, ineligible)', () => {
    const creditThinPreset = PERSONA_PRESETS.find((p) => p.label === 'Credit-Thin')
    const inputs = creditThinPreset?.inputs
    
    if (inputs) {
      const apr = engine.computeAPR(inputs.creditScore, 11.50)
      expect(apr).toBeNull()
    }
  })
})
