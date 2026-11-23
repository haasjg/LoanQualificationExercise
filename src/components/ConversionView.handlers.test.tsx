import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ConversionView } from './ConversionView';
import { Decision, ReasonCode, DEFAULT_INPUTS, type ProductRecommendation } from '../engine/types';

describe('ConversionView - Handler Integration (Task 24.3)', () => {
  const mockInputs = { ...DEFAULT_INPUTS, creditScore: 580, loanAmount: 10000 };
  
  const mockEngineResult = {
    decision: Decision.DECLINED,
    reasonCode: ReasonCode.HIGH_RISK_SCORE,
    apr: 15.5,
    estimatedPayment: 500,
    postLoanDTI: 0.42,
    benchmarkRate: 11.5,
  };

  it('should call onAcceptProduct when product offer card "Accept & Start Plan" is clicked', async () => {
    const user = userEvent.setup();
    const mockOnAcceptProduct = vi.fn();
    const mockOnReturnToSimulator = vi.fn();

    render(
      <ConversionView
        engineResult={mockEngineResult}
        inputs={mockInputs}
        onAcceptProduct={mockOnAcceptProduct}
        onReturnToSimulator={mockOnReturnToSimulator}
      />
    );

    // Find and click the "Accept & Start Plan" button
    const acceptButton = screen.getByRole('button', { name: /Accept & Start Plan/i });
    await user.click(acceptButton);

    // Verify onAcceptProduct was called with the recommendation object
    expect(mockOnAcceptProduct).toHaveBeenCalledOnce();
    
    const callArg = mockOnAcceptProduct.mock.calls[0][0] as ProductRecommendation;
    expect(callArg).toMatchObject({
      productType: expect.any(String),
      productName: expect.any(String),
      qualificationGap: expect.any(String),
    });
  });

  it('should call onReturnToSimulator when "Return to Simulator" button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnAcceptProduct = vi.fn();
    const mockOnReturnToSimulator = vi.fn();

    render(
      <ConversionView
        engineResult={mockEngineResult}
        inputs={mockInputs}
        onAcceptProduct={mockOnAcceptProduct}
        onReturnToSimulator={mockOnReturnToSimulator}
      />
    );

    // Find and click the "Return to Simulator" button
    const returnButton = screen.getByRole('button', { name: /Return to Simulator/i });
    await user.click(returnButton);

    // Verify onReturnToSimulator was called
    expect(mockOnReturnToSimulator).toHaveBeenCalledOnce();
  });

  it('should not call onReturnToSimulator when accepting a product', async () => {
    const user = userEvent.setup();
    const mockOnAcceptProduct = vi.fn();
    const mockOnReturnToSimulator = vi.fn();

    render(
      <ConversionView
        engineResult={mockEngineResult}
        inputs={mockInputs}
        onAcceptProduct={mockOnAcceptProduct}
        onReturnToSimulator={mockOnReturnToSimulator}
      />
    );

    const acceptButton = screen.getByRole('button', { name: /Accept & Start Plan/i });
    await user.click(acceptButton);

    // Verify only onAcceptProduct was called, not onReturnToSimulator
    expect(mockOnAcceptProduct).toHaveBeenCalledOnce();
    expect(mockOnReturnToSimulator).not.toHaveBeenCalled();
  });
});
