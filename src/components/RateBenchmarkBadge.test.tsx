// src/components/RateBenchmarkBadge.test.tsx
/**
 * Property-based tests for RateBenchmarkBadge component.
 * Validates rendering for all RateSource states.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import RateBenchmarkBadge from './RateBenchmarkBadge';
import { RateSource } from '../engine/types';

// ============================================================================
// Property 10: RateBenchmarkBadge renders for all RateSource states
// ============================================================================

/**
 * Property 10: For all RateSource values (LIVE, CACHED, OFFLINE),
 * the RateBenchmarkBadge component renders without throwing an unhandled exception.
 */
describe('RateBenchmarkBadge', () => {
  it('Property 10: renders without exception for all RateSource values', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(RateSource.LIVE),
          fc.constant(RateSource.CACHED),
          fc.constant(RateSource.OFFLINE),
        ),
        (source: RateSource) => {
          // This should not throw
          render(
            <RateBenchmarkBadge
              source={source}
              benchmarkRate={11.5}
              referenceLabel="Test Label"
            />,
          );
          
          // Verify the component renders without throwing (getByText will throw if not found)
          const rateElements = screen.getAllByText(/11\.50% - Test Label/);
          expect(rateElements.length).toBeGreaterThanOrEqual(1);
          
          // Clean up after each property iteration
          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('renders LIVE source correctly', () => {
    render(
      <RateBenchmarkBadge
        source={RateSource.LIVE}
        benchmarkRate={11.5}
        referenceLabel="2024-01"
      />,
    );

    expect(screen.getByText('Live FRED Rate')).toBeInTheDocument();
    expect(screen.getByText('11.50% - 2024-01')).toBeInTheDocument();
  });

  it('renders CACHED source correctly', () => {
    render(
      <RateBenchmarkBadge
        source={RateSource.CACHED}
        benchmarkRate={11.5}
        referenceLabel="2024-01"
      />,
    );

    expect(screen.getByText('Cached Benchmark')).toBeInTheDocument();
    expect(screen.getByText('11.50% - 2024-01')).toBeInTheDocument();
  });

  it('renders OFFLINE source correctly', () => {
    render(
      <RateBenchmarkBadge
        source={RateSource.OFFLINE}
        benchmarkRate={11.5}
        referenceLabel="2024-01"
      />,
    );

    expect(screen.getByText('Offline Benchmark')).toBeInTheDocument();
    expect(screen.getByText('11.50% - 2024-01')).toBeInTheDocument();
  });

  it('displays different benchmark rates correctly', () => {
    render(
      <RateBenchmarkBadge
        source={RateSource.LIVE}
        benchmarkRate={10.25}
        referenceLabel="Reference period: Nov 2023"
      />,
    );

    expect(screen.getByText('10.25% - Reference period: Nov 2023')).toBeInTheDocument();
  });

  it('applies correct styling classes for each source', () => {
    // Test LIVE styling
    const { rerender } = render(
      <RateBenchmarkBadge
        source={RateSource.LIVE}
        benchmarkRate={11.5}
        referenceLabel="Test"
      />,
    );
    const liveBadge = screen.getByText('Live FRED Rate').parentElement!;
    expect(liveBadge.className).toContain('bg-emerald-50');
    expect(liveBadge.className).toContain('text-emerald-800');

    // Test CACHED styling
    rerender(
      <RateBenchmarkBadge
        source={RateSource.CACHED}
        benchmarkRate={11.5}
        referenceLabel="Test"
      />,
    );
    const cachedBadge = screen.getByText('Cached Benchmark').parentElement!;
    expect(cachedBadge.className).toContain('bg-blue-50');
    expect(cachedBadge.className).toContain('text-blue-800');

    // Test OFFLINE styling
    rerender(
      <RateBenchmarkBadge
        source={RateSource.OFFLINE}
        benchmarkRate={11.5}
        referenceLabel="Test"
      />,
    );
    const offlineBadge = screen.getByText('Offline Benchmark').parentElement!;
    expect(offlineBadge.className).toContain('bg-slate-100');
    expect(offlineBadge.className).toContain('text-slate-700');
  });
});
