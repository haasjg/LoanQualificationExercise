import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExampleScenariosModal } from './ExampleScenariosModal';
import { PERSONA_PRESETS } from '../../engine/types';

describe('ExampleScenariosModal - Task 3.3 Requirements', () => {
  const mockOnClose = vi.fn();
  const mockOnSelectScenario = vi.fn();

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <ExampleScenariosModal
        isOpen={false}
        onClose={mockOnClose}
        onSelectScenario={mockOnSelectScenario}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should render modal with 2-3 scenario cards when isOpen is true', () => {
    render(
      <ExampleScenariosModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectScenario={mockOnSelectScenario}
      />
    );

    // Verify modal title
    expect(screen.getByText(/try an example scenario/i)).toBeInTheDocument();

    // Verify all persona presets are displayed (should be 3)
    expect(PERSONA_PRESETS).toHaveLength(3);
    
    PERSONA_PRESETS.forEach(preset => {
      expect(screen.getByText(preset.label)).toBeInTheDocument();
      expect(screen.getByText(preset.description)).toBeInTheDocument();
    });
  });

  it('should display scenario details without navigation controls', () => {
    render(
      <ExampleScenariosModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectScenario={mockOnSelectScenario}
      />
    );

    // Verify all preset details are shown (check that income, debt, credit, loan, term labels exist)
    expect(screen.getAllByText(/Income:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Debt:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Credit:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Loan:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Term:/i).length).toBeGreaterThan(0);

    // Verify no navigation buttons like "Back" or "Next" are present
    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
  });

  it('should call onSelectScenario and onClose when a scenario is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ExampleScenariosModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectScenario={mockOnSelectScenario}
      />
    );

    // Click on the first preset
    const firstPresetButton = screen.getByText(PERSONA_PRESETS[0].label).closest('button');
    expect(firstPresetButton).toBeInTheDocument();
    
    await user.click(firstPresetButton!);

    // Verify callbacks were called
    expect(mockOnSelectScenario).toHaveBeenCalledWith(PERSONA_PRESETS[0].inputs);
    expect(mockOnClose).toHaveBeenCalledOnce();
  });

  it('should call onClose when X button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ExampleScenariosModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectScenario={mockOnSelectScenario}
      />
    );

    // Find and click the close button
    const closeButton = screen.getByRole('button', { name: '' }).closest('button');
    expect(closeButton).toBeInTheDocument();
    
    await user.click(closeButton!);

    expect(mockOnClose).toHaveBeenCalledOnce();
  });

  it('should display expected decision badges for each scenario', () => {
    render(
      <ExampleScenariosModal
        isOpen={true}
        onClose={mockOnClose}
        onSelectScenario={mockOnSelectScenario}
      />
    );

    // Verify decision badges are displayed
    PERSONA_PRESETS.forEach(preset => {
      const badge = screen.getByText(preset.expectedDecision);
      expect(badge).toBeInTheDocument();
      
      // Verify color coding based on decision type
      if (preset.expectedDecision === 'APPROVED') {
        expect(badge.className).toContain('emerald');
      } else if (preset.expectedDecision === 'COUNTER_OFFER') {
        expect(badge.className).toContain('amber');
      } else if (preset.expectedDecision === 'DECLINED') {
        expect(badge.className).toContain('rose');
      }
    });
  });
});
