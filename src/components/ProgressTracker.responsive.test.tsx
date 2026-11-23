import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ProgressTracker } from './ProgressTracker';
import type { ActivePlan, ProgressState } from '../engine/types';

/**
 * Test suite for ProgressTracker responsive layout (Task 27.7)
 * Verifies that responsive Tailwind classes are correctly applied
 * for mobile, tablet, and desktop layouts.
 */
describe('ProgressTracker - Task 27.7: Responsive Layout', () => {
  const mockActivePlan: ActivePlan = {
    productType: 'SECURED_CREDIT_BUILDER',
    initialInputs: {
      monthlyIncome: 3000,
      monthlyDebt: 800,
      creditScore: 580,
      requestedAmount: 10000,
      requestedTerm: 36,
    },
    initialEngineResult: {
      status: 'DECLINED',
      declineReasons: ['CREDIT_SCORE_LOW'],
      postLoanDTI: 0.42,
      estimatedAPR: 16.5,
      estimatedMonthlyPayment: 350,
    },
    acceptedAt: '2024-01-15T10:30:00Z',
  };

  const mockProgressState: ProgressState = {
    milestones: [
      {
        id: 'mile-1',
        title: 'Open Secured Credit Builder Card',
        description: 'Start building payment history',
        estimatedTimeframe: '1-2 weeks',
        completed: false,
      },
      {
        id: 'mile-2',
        title: 'Make 6 consecutive on-time payments',
        description: 'Demonstrate responsible credit use',
        estimatedTimeframe: '6 months',
        completed: false,
      },
    ],
    updatedInputs: null,
  };

  it('applies responsive grid classes to metric cards container', () => {
    const { container } = render(
      <ProgressTracker
        activePlan={mockActivePlan}
        progressState={mockProgressState}
        benchmarkRate={11.5}
        onMilestoneToggle={() => {}}
        onReEvaluate={() => {}}
        onStartOver={() => {}}
      />
    );

    // Find the metric cards grid container
    const metricGrid = container.querySelector('.grid');
    expect(metricGrid).toBeTruthy();
    
    // Verify responsive classes are applied
    const classes = metricGrid?.className || '';
    expect(classes).toContain('grid-cols-1'); // Mobile: single column
    expect(classes).toContain('md:grid-cols-2'); // Tablet: 2 columns
    expect(classes).toContain('lg:grid-cols-4'); // Desktop: 4 columns
  });

  it('applies responsive flex classes to action buttons container', () => {
    const { container } = render(
      <ProgressTracker
        activePlan={mockActivePlan}
        progressState={mockProgressState}
        benchmarkRate={11.5}
        onMilestoneToggle={() => {}}
        onReEvaluate={() => {}}
        onStartOver={() => {}}
      />
    );

    // Find the action buttons container (contains both Re-Evaluate and Start Over)
    const buttons = container.querySelectorAll('button');
    const buttonContainer = buttons[0]?.parentElement;
    
    expect(buttonContainer).toBeTruthy();
    
    const classes = buttonContainer?.className || '';
    expect(classes).toContain('flex'); // Flexbox layout
    expect(classes).toContain('flex-col'); // Mobile: stacked vertically
    expect(classes).toContain('sm:flex-row'); // Desktop: horizontal inline
  });

  it('applies consistent spacing between main sections', () => {
    const { container } = render(
      <ProgressTracker
        activePlan={mockActivePlan}
        progressState={mockProgressState}
        benchmarkRate={11.5}
        onMilestoneToggle={() => {}}
        onReEvaluate={() => {}}
        onStartOver={() => {}}
      />
    );

    // The root container should have space-y-8 for main sections
    const rootDiv = container.firstElementChild;
    expect(rootDiv?.className).toContain('space-y-8');
  });

  it('applies proper gap spacing to metric grid', () => {
    const { container } = render(
      <ProgressTracker
        activePlan={mockActivePlan}
        progressState={mockProgressState}
        benchmarkRate={11.5}
        onMilestoneToggle={() => {}}
        onReEvaluate={() => {}}
        onStartOver={() => {}}
      />
    );

    const metricGrid = container.querySelector('.grid');
    const classes = metricGrid?.className || '';
    expect(classes).toContain('gap-6'); // Consistent grid gap
  });

  it('renders all responsive breakpoint classes correctly', () => {
    const { container } = render(
      <ProgressTracker
        activePlan={mockActivePlan}
        progressState={mockProgressState}
        benchmarkRate={11.5}
        onMilestoneToggle={() => {}}
        onReEvaluate={() => {}}
        onStartOver={() => {}}
      />
    );

    const html = container.innerHTML;
    
    // Verify all required responsive classes are present in the rendered output
    expect(html).toContain('grid-cols-1'); // Mobile base
    expect(html).toContain('md:grid-cols-2'); // Tablet breakpoint (768px)
    expect(html).toContain('lg:grid-cols-4'); // Desktop breakpoint (1024px)
    expect(html).toContain('flex-col'); // Mobile button stack
    expect(html).toContain('sm:flex-row'); // Desktop button inline (640px)
  });

  it('ensures header and progress bar are responsive', () => {
    const { container } = render(
      <ProgressTracker
        activePlan={mockActivePlan}
        progressState={mockProgressState}
        benchmarkRate={11.5}
        onMilestoneToggle={() => {}}
        onReEvaluate={() => {}}
        onStartOver={() => {}}
      />
    );

    // Header should use responsive padding
    const header = container.querySelector('.rounded-lg.border-2.border-indigo-200');
    expect(header?.className).toContain('p-8');
    
    // Progress bar should be full width (w-full)
    const progressBar = container.querySelector('.h-3.w-full.rounded-full');
    expect(progressBar).toBeTruthy();
  });
});
