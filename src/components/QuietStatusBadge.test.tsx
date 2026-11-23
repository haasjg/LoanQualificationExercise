import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuietStatusBadge } from './QuietStatusBadge';
import { Decision, ReasonCode } from '../engine/types';

describe('QuietStatusBadge', () => {
  describe('APPROVED decision', () => {
    it('renders with emerald background and correct label', () => {
      const { container } = render(
        <QuietStatusBadge decision={Decision.APPROVED} reasonCode={null} />
      );

      const badge = screen.getByText('You may qualify');
      expect(badge).toBeInTheDocument();
      
      // Verify emerald color classes
      const badgeElement = container.querySelector('span');
      expect(badgeElement).toHaveClass('bg-emerald-100');
      expect(badgeElement).toHaveClass('text-emerald-800');
      expect(badgeElement).toHaveClass('border-emerald-200');
    });
  });

  describe('COUNTER_OFFER decision', () => {
    it('renders with amber background and DTI reason', () => {
      const { container } = render(
        <QuietStatusBadge decision={Decision.COUNTER_OFFER} reasonCode={null} />
      );

      const badge = screen.getByText('DTI slightly elevated');
      expect(badge).toBeInTheDocument();
      
      // Verify amber color classes
      const badgeElement = container.querySelector('span');
      expect(badgeElement).toHaveClass('bg-amber-100');
      expect(badgeElement).toHaveClass('text-amber-800');
      expect(badgeElement).toHaveClass('border-amber-200');
    });

    it('renders loan cap exceeded reason when applicable', () => {
      render(
        <QuietStatusBadge 
          decision={Decision.COUNTER_OFFER} 
          reasonCode={ReasonCode.LOAN_CAP_EXCEEDED} 
        />
      );

      expect(screen.getByText('Amount exceeds tier limit')).toBeInTheDocument();
    });
  });

  describe('DECLINED decision', () => {
    it('renders with rose background for high risk score', () => {
      const { container } = render(
        <QuietStatusBadge 
          decision={Decision.DECLINED} 
          reasonCode={ReasonCode.HIGH_RISK_SCORE} 
        />
      );

      const badge = screen.getByText('Credit score below minimum');
      expect(badge).toBeInTheDocument();
      
      // Verify rose color classes
      const badgeElement = container.querySelector('span');
      expect(badgeElement).toHaveClass('bg-rose-100');
      expect(badgeElement).toHaveClass('text-rose-800');
      expect(badgeElement).toHaveClass('border-rose-200');
    });

    it('renders insufficient income reason', () => {
      render(
        <QuietStatusBadge 
          decision={Decision.DECLINED} 
          reasonCode={ReasonCode.INSUFFICIENT_INCOME} 
        />
      );

      expect(screen.getByText('Income below threshold')).toBeInTheDocument();
    });

    it('renders excessive debt reason', () => {
      render(
        <QuietStatusBadge 
          decision={Decision.DECLINED} 
          reasonCode={ReasonCode.EXCESSIVE_DEBT} 
        />
      );

      expect(screen.getByText('Debt exceeds income')).toBeInTheDocument();
    });

    it('renders high DTI reason', () => {
      render(
        <QuietStatusBadge 
          decision={Decision.DECLINED} 
          reasonCode={ReasonCode.HIGH_DTI} 
        />
      );

      expect(screen.getByText('DTI too high')).toBeInTheDocument();
    });

    it('renders generic message when reason code is unknown', () => {
      render(
        <QuietStatusBadge 
          decision={Decision.DECLINED} 
          reasonCode={null} 
        />
      );

      expect(screen.getByText('Does not meet criteria')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies correct pill styling with rounded-full', () => {
      const { container } = render(
        <QuietStatusBadge decision={Decision.APPROVED} reasonCode={null} />
      );

      const badge = container.querySelector('span');
      expect(badge).toHaveClass('rounded-full');
      expect(badge).toHaveClass('px-3');
      expect(badge).toHaveClass('py-1.5');
      expect(badge).toHaveClass('text-sm');
      expect(badge).toHaveClass('font-semibold');
      expect(badge).toHaveClass('border');
    });
  });
});
