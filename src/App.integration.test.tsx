// src/App.integration.test.tsx
/**
 * End-to-end checks (Task 19) for the restored features, driven through the real App
 * with the FRED client mocked offline (11.50%).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import * as fredClient from './services/fredClient';

vi.mock('./services/fredClient', () => ({
  fetchBenchmarkRate: vi.fn(),
}));

interface Persona {
  income: number;
  debt: number;
  score: number;
  amount: number;
  term: number;
}

const COUNTER_OFFER: Persona = { income: 3500, debt: 600, score: 650, amount: 15000, term: 24 };
const DECLINED: Persona = { income: 2800, debt: 200, score: 570, amount: 7000, term: 36 };

async function runWizard(p: Persona): Promise<void> {
  render(<App />);
  fireEvent.change(screen.getByRole('slider'), { target: { value: String(p.amount) } });
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`${p.term} months`, 'i') }));
  fireEvent.click(screen.getByRole('button', { name: /continue/i }));
  await screen.findByText(/a few quick details/i);
  fireEvent.change(screen.getByLabelText(/monthly income/i), { target: { value: String(p.income) } });
  fireEvent.change(screen.getByLabelText(/monthly debt payments/i), { target: { value: String(p.debt) } });
  fireEvent.change(screen.getByLabelText(/credit score/i), { target: { value: String(p.score) } });
  fireEvent.click(screen.getByRole('button', { name: /see my estimate/i }));
}

describe('Task 19 checkpoint: end-to-end flows', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(fredClient.fetchBenchmarkRate).mockResolvedValue({
      value: 11.5,
      source: 'OFFLINE' as const,
      referenceLabel: 'Test benchmark',
      fetchedAt: null,
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('counter-offer persona', () => {
    it('renders multiple lever cards with exactly one Recommended badge', async () => {
      await runWizard(COUNTER_OFFER);

      const cards = await screen.findAllByTestId('lever-option-card');
      expect(cards.length).toBeGreaterThan(1);
      expect(screen.getAllByTestId('lever-recommended-badge')).toHaveLength(1);
    });

    it('opens ComparisonStep with each lever label via "Compare this option"', async () => {
      await runWizard(COUNTER_OFFER);

      const initialCards = await screen.findAllByTestId('lever-option-card');
      const labels = initialCards.map((c) => c.querySelector('h3')!.textContent!);
      expect(new Set(labels).size).toBe(labels.length);

      for (const label of labels) {
        const card = (await screen.findAllByTestId('lever-option-card')).find(
          (c) => c.querySelector('h3')!.textContent === label,
        );
        expect(card).toBeDefined();
        fireEvent.click(within(card!).getByRole('button', { name: /compare this option/i }));

        await screen.findByText(/compare your options/i);
        expect(screen.getByText(label)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /back/i }));
        await screen.findAllByTestId('lever-option-card');
      }
    });
  });

  describe('declined persona', () => {
    it('shows ConversionView with a Secured Credit Builder offer', async () => {
      await runWizard(DECLINED);

      expect(await screen.findByTestId('declined-conversion')).toBeInTheDocument();
      expect(screen.getByText(/secured credit builder/i)).toBeInTheDocument();
    });

    it('accepting the offer shows ProgressTracker and saves pathToYesActivePlan', async () => {
      await runWizard(DECLINED);
      await screen.findByTestId('declined-conversion');

      const offer = screen.getByText(/secured credit builder/i).closest('div[class*="rounded"]');
      expect(offer).not.toBeNull();
      fireEvent.click(within(offer as HTMLElement).getByRole('button', { name: /accept & start plan/i }));

      await waitFor(() => {
        expect(screen.getByText(/your path to yes plan/i)).toBeInTheDocument();
      });

      const saved = localStorage.getItem('pathToYesActivePlan');
      expect(saved).not.toBeNull();
      expect(JSON.parse(saved!).productType).toBe('SECURED_CREDIT_BUILDER');
    });
  });
});
