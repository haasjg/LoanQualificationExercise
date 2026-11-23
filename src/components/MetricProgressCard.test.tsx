import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MetricProgressCard } from './MetricProgressCard';

describe('MetricProgressCard', () => {
  describe('Value Formatting', () => {
    it('formats currency values with dollar sign and commas', () => {
      render(
        <MetricProgressCard
          label="Monthly Income"
          current={5000}
          target={6000}
          unit="currency"
        />
      );

      expect(screen.getByText('$5,000')).toBeInTheDocument();
      expect(screen.getByText('$6,000')).toBeInTheDocument();
    });

    it('formats percentage values with one decimal place', () => {
      render(
        <MetricProgressCard
          label="DTI Ratio"
          current={42.5}
          target={36.0}
          unit="percentage"
          isInverse
        />
      );

      expect(screen.getByText('42.5%')).toBeInTheDocument();
      expect(screen.getByText('36.0%')).toBeInTheDocument();
    });

    it('formats score values as plain numbers', () => {
      render(
        <MetricProgressCard
          label="Credit Score"
          current={620}
          target={640}
          unit="score"
        />
      );

      expect(screen.getByText('620')).toBeInTheDocument();
      expect(screen.getByText('640')).toBeInTheDocument();
    });
  });

  describe('Progress Calculation - Normal Metrics', () => {
    it('calculates 100% progress when current >= target', () => {
      render(
        <MetricProgressCard
          label="Credit Score"
          current={650}
          target={640}
          unit="score"
        />
      );

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('calculates partial progress when current < target', () => {
      render(
        <MetricProgressCard
          label="Credit Score"
          current={620}
          target={640}
          unit="score"
        />
      );

      // 620 / 640 = 0.96875 = 96.875% -> rounds to 97%
      expect(screen.getByText('97%')).toBeInTheDocument();
    });

    it('calculates 50% progress for halfway values', () => {
      render(
        <MetricProgressCard
          label="Monthly Income"
          current={3000}
          target={6000}
          unit="currency"
        />
      );

      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  describe('Progress Calculation - Inverse Metrics', () => {
    it('calculates 100% progress when current <= target (inverse)', () => {
      render(
        <MetricProgressCard
          label="DTI Ratio"
          current={30.0}
          target={36.0}
          unit="percentage"
          isInverse
        />
      );

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('calculates partial progress when current > target (inverse)', () => {
      render(
        <MetricProgressCard
          label="DTI Ratio"
          current={42.0}
          target={36.0}
          unit="percentage"
          isInverse
        />
      );

      // For inverse: (42 - 36) / 42 = 6 / 42 = 0.1428... = 14.28% -> rounds to 14%
      expect(screen.getByText('14%')).toBeInTheDocument();
    });

    it('calculates progress for debt reduction (inverse)', () => {
      render(
        <MetricProgressCard
          label="Monthly Debt"
          current={1500}
          target={1000}
          unit="currency"
          isInverse
        />
      );

      // For inverse: (1500 - 1000) / 1500 = 500 / 1500 = 0.3333... = 33.33% -> rounds to 33%
      expect(screen.getByText('33%')).toBeInTheDocument();
    });
  });

  describe('Color Styling', () => {
    it('uses emerald colors for normal metrics', () => {
      const { container } = render(
        <MetricProgressCard
          label="Credit Score"
          current={620}
          target={640}
          unit="score"
        />
      );

      const progressBar = container.querySelector('.bg-emerald-500');
      expect(progressBar).toBeInTheDocument();
    });

    it('uses rose colors for inverse metrics', () => {
      const { container } = render(
        <MetricProgressCard
          label="DTI Ratio"
          current={42.0}
          target={36.0}
          unit="percentage"
          isInverse
        />
      );

      const progressBar = container.querySelector('.bg-rose-500');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('UI Structure', () => {
    it('renders metric label as heading', () => {
      render(
        <MetricProgressCard
          label="Credit Score"
          current={620}
          target={640}
          unit="score"
        />
      );

      expect(screen.getByRole('heading', { name: 'Credit Score' })).toBeInTheDocument();
    });

    it('displays Current and Target labels', () => {
      render(
        <MetricProgressCard
          label="Credit Score"
          current={620}
          target={640}
          unit="score"
        />
      );

      expect(screen.getByText('Current:')).toBeInTheDocument();
      expect(screen.getByText('Target:')).toBeInTheDocument();
    });

    it('displays Progress label', () => {
      render(
        <MetricProgressCard
          label="Credit Score"
          current={620}
          target={640}
          unit="score"
        />
      );

      expect(screen.getByText('Progress')).toBeInTheDocument();
    });
  });

  describe('Progress Bar Width Styling', () => {
    it('sets progress bar width style to match calculated percentage', () => {
      const { container } = render(
        <MetricProgressCard
          label="Credit Score"
          current={620}
          target={640}
          unit="score"
          min={500}
        />
      );

      // (620 - 500) / (640 - 500) = 120 / 140 = 85.71% -> rounds to 86%
      const progressBar = container.querySelector('.bg-emerald-500');
      expect(progressBar).toHaveStyle({ width: '85.71428571428571%' });
    });

    it('sets progress bar width to 100% when target is achieved', () => {
      const { container } = render(
        <MetricProgressCard
          label="Credit Score"
          current={650}
          target={640}
          unit="score"
        />
      );

      const progressBar = container.querySelector('.bg-emerald-500');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });

    it('sets progress bar width to 0% when no progress made', () => {
      const { container } = render(
        <MetricProgressCard
          label="Credit Score"
          current={500}
          target={640}
          unit="score"
          min={500}
        />
      );

      const progressBar = container.querySelector('.bg-emerald-500');
      expect(progressBar).toHaveStyle({ width: '0%' });
    });

    it('sets correct width for inverse metric progress', () => {
      const { container } = render(
        <MetricProgressCard
          label="DTI Ratio"
          current={42.0}
          target={36.0}
          unit="percentage"
          isInverse
          max={48.0}
        />
      );

      // (48 - 42) / (48 - 36) = 6 / 12 = 50%
      const progressBar = container.querySelector('.bg-rose-500');
      expect(progressBar).toHaveStyle({ width: '50%' });
    });
  });

  describe('Animated Transitions', () => {
    it('applies transition classes to progress bar', () => {
      const { container } = render(
        <MetricProgressCard
          label="Credit Score"
          current={620}
          target={640}
          unit="score"
        />
      );

      const progressBar = container.querySelector('.bg-emerald-500');
      expect(progressBar).toHaveClass('transition-all');
      expect(progressBar).toHaveClass('duration-300');
    });

    it('applies transition classes to inverse metric progress bar', () => {
      const { container } = render(
        <MetricProgressCard
          label="DTI Ratio"
          current={42.0}
          target={36.0}
          unit="percentage"
          isInverse
        />
      );

      const progressBar = container.querySelector('.bg-rose-500');
      expect(progressBar).toHaveClass('transition-all');
      expect(progressBar).toHaveClass('duration-300');
    });
  });

  describe('Edge Cases', () => {
    it('handles zero current value for normal metrics', () => {
      render(
        <MetricProgressCard
          label="Credit Score"
          current={0}
          target={640}
          unit="score"
        />
      );

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('handles zero target value for inverse metrics', () => {
      render(
        <MetricProgressCard
          label="Monthly Debt"
          current={1500}
          target={0}
          unit="currency"
          isInverse
        />
      );

      // (1500 - 0) / 1500 = 100%
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('handles equal current and target values', () => {
      render(
        <MetricProgressCard
          label="Credit Score"
          current={640}
          target={640}
          unit="score"
        />
      );

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('handles current below min for normal metrics', () => {
      render(
        <MetricProgressCard
          label="Credit Score"
          current={450}
          target={640}
          unit="score"
          min={500}
        />
      );

      // Current below min should result in 0% progress
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('handles current above max for inverse metrics', () => {
      render(
        <MetricProgressCard
          label="DTI Ratio"
          current={50.0}
          target={36.0}
          unit="percentage"
          isInverse
          max={45.0}
        />
      );

      // Current above max should result in 0% progress (no improvement)
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('handles target equal to min for normal metrics', () => {
      render(
        <MetricProgressCard
          label="Credit Score"
          current={500}
          target={500}
          unit="score"
          min={500}
        />
      );

      // Target equals min -> target achieved -> 100%
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('handles target equal to max for inverse metrics', () => {
      render(
        <MetricProgressCard
          label="DTI Ratio"
          current={42.0}
          target={45.0}
          unit="percentage"
          isInverse
          max={45.0}
        />
      );

      // For inverse: current (42) < target (45) means goal achieved -> 100%
      // (Target equals max means no room for starting improvement, but if current < target, goal is met)
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('clamps progress above 100% to 100%', () => {
      render(
        <MetricProgressCard
          label="Credit Score"
          current={700}
          target={640}
          unit="score"
          min={500}
        />
      );

      // Even though current > target, should cap at 100%
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('clamps progress below 0% to 0%', () => {
      render(
        <MetricProgressCard
          label="Credit Score"
          current={400}
          target={640}
          unit="score"
          min={500}
        />
      );

      // Even though current < min, should floor at 0%
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('formats large currency values with proper comma separators', () => {
      render(
        <MetricProgressCard
          label="Monthly Income"
          current={15000}
          target={20000}
          unit="currency"
        />
      );

      expect(screen.getByText('$15,000')).toBeInTheDocument();
      expect(screen.getByText('$20,000')).toBeInTheDocument();
    });

    it('formats percentage values with exactly one decimal place', () => {
      render(
        <MetricProgressCard
          label="DTI Ratio"
          current={42}
          target={36}
          unit="percentage"
          isInverse
        />
      );

      // Should show .0 even for whole numbers
      expect(screen.getByText('42.0%')).toBeInTheDocument();
      expect(screen.getByText('36.0%')).toBeInTheDocument();
    });
  });

  describe('Real-World Scenarios', () => {
    it('renders credit score progress correctly', () => {
      render(
        <MetricProgressCard
          label="Credit Score"
          current={620}
          target={640}
          unit="score"
          min={500}
        />
      );

      // (620 - 500) / (640 - 500) = 120 / 140 = 85.71% -> rounds to 86%
      expect(screen.getByText('86%')).toBeInTheDocument();
      expect(screen.getByText('620')).toBeInTheDocument();
      expect(screen.getByText('640')).toBeInTheDocument();
    });

    it('renders income progress correctly', () => {
      render(
        <MetricProgressCard
          label="Monthly Income"
          current={2500}
          target={3000}
          unit="currency"
          min={0}
        />
      );

      // (2500 - 0) / (3000 - 0) = 2500 / 3000 = 83.33% -> rounds to 83%
      expect(screen.getByText('83%')).toBeInTheDocument();
      expect(screen.getByText('$2,500')).toBeInTheDocument();
      expect(screen.getByText('$3,000')).toBeInTheDocument();
    });

    it('renders DTI progress correctly with inverse logic', () => {
      render(
        <MetricProgressCard
          label="DTI Ratio"
          current={42.0}
          target={36.0}
          unit="percentage"
          isInverse
          max={48.0}
        />
      );

      // (48 - 42) / (48 - 36) = 6 / 12 = 50%
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('42.0%')).toBeInTheDocument();
      expect(screen.getByText('36.0%')).toBeInTheDocument();
    });

    it('renders debt reduction progress correctly with inverse logic', () => {
      render(
        <MetricProgressCard
          label="Monthly Debt"
          current={1200}
          target={1000}
          unit="currency"
          isInverse
          max={1500}
        />
      );

      // (1500 - 1200) / (1500 - 1000) = 300 / 500 = 60%
      expect(screen.getByText('60%')).toBeInTheDocument();
      expect(screen.getByText('$1,200')).toBeInTheDocument();
      expect(screen.getByText('$1,000')).toBeInTheDocument();
    });
  });
});
