import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { Decision } from './engine/types';

/**
 * Integration tests for the complete conversion UX flow
 * **Validates: Requirements 13.6**
 * 
 * Tests the end-to-end flow:
 * 1. User gets DECLINED decision in simulator
 * 2. ConversionView displays with decline reasons and product recommendations
 * 3. User clicks "Accept & Start Plan" on a product
 * 4. ProgressTracker displays with milestones and metrics
 * 5. User can toggle milestones
 * 6. User can re-evaluate when ready
 * 7. User can start over to reset everything
 */
describe('Conversion UX Flow Integration', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Mock FRED API to return a stable benchmark rate
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          observations: [{ value: '11.50' }]
        })
      })
    ));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('completes the full conversion flow from DECLINED to ProgressTracker and back', async () => {
    const user = userEvent.setup();
    
    // Step 1: Render App and set inputs to trigger DECLINED decision
    render(<App />);
    
    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('Path to Yes')).toBeInTheDocument();
    });

    // Set inputs that will result in DECLINED decision:
    // - Low credit score (< 600) OR high DTI
    // Let's use the "Credit-Thin" preset which should be DECLINED
    const creditThinButton = screen.getByRole('button', { name: /Credit-Thin/i });
    await user.click(creditThinButton);

    // Wait for decision to update
    await waitFor(() => {
      // Should show DECLINED status
      expect(screen.getByText(/Application Could Not Be Approved/i)).toBeInTheDocument();
    });

    // Step 2: Verify ConversionView is displayed with decline reasons and product recommendations
    // Should show decline reasons
    expect(screen.getByText(/Why Was I Declined\?/i)).toBeInTheDocument();
    
    // Should show product recommendations
    expect(screen.getByText(/Build Your Path to Yes/i)).toBeInTheDocument();
    
    // Should have at least one product card with "Accept & Start Plan" button
    const acceptButtons = screen.getAllByRole('button', { name: /Accept & Start Plan/i });
    expect(acceptButtons.length).toBeGreaterThan(0);

    // Step 3: Click "Accept & Start Plan" on the first product
    await user.click(acceptButtons[0]);

    // Step 4: Verify ProgressTracker is displayed
    await waitFor(() => {
      expect(screen.getByText(/Your Path to Yes Plan/i)).toBeInTheDocument();
    });

    // Should show progress bar
    expect(screen.getByText(/milestones completed/i)).toBeInTheDocument();

    // Should show metric progress cards
    expect(screen.getAllByText(/Credit Score/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Debt-to-Income Ratio/i)).toBeInTheDocument();

    // Should show milestone checklist
    // Milestones are dynamically generated, so just check for the section
    const milestoneCheckboxes = screen.getAllByRole('checkbox');
    expect(milestoneCheckboxes.length).toBeGreaterThan(0);

    // Should show "Re-Evaluate My Application" button (initially disabled)
    const reEvaluateButton = screen.getByRole('button', { name: /Re-Evaluate My Application/i });
    expect(reEvaluateButton).toBeInTheDocument();
    expect(reEvaluateButton).toBeDisabled(); // Disabled until all milestones complete

    // Should show "Start Over" button
    const startOverButton = screen.getByRole('button', { name: /Start Over/i });
    expect(startOverButton).toBeInTheDocument();

    // Step 5: Toggle milestones to completion
    const checkboxes = screen.getAllByRole('checkbox');
    
    // Complete all milestones
    for (const checkbox of checkboxes) {
      if (!checkbox.getAttribute('checked')) {
        await user.click(checkbox);
      }
    }

    // Wait for all milestones to be marked complete
    await waitFor(() => {
      const updatedCheckboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      const allChecked = updatedCheckboxes.every(cb => cb.checked);
      expect(allChecked).toBe(true);
    });

    // Should show completion message
    await waitFor(() => {
      expect(screen.getByText(/All milestones complete!/i)).toBeInTheDocument();
    });

    // Re-Evaluate button should now be enabled
    await waitFor(() => {
      expect(reEvaluateButton).not.toBeDisabled();
    });

    // Step 6: Test "Start Over" functionality
    await user.click(startOverButton);

    // Should return to main simulator view
    await waitFor(() => {
      // Should see the applicant input panel
      expect(screen.getByText(/Monthly Gross Income/i)).toBeInTheDocument();
      
      // Should NOT see ProgressTracker elements
      expect(screen.queryByText(/Your Path to Yes Plan/i)).not.toBeInTheDocument();
      
      // Should NOT see ConversionView elements (since we reset to default inputs)
      expect(screen.queryByText(/Build Your Path to Yes/i)).not.toBeInTheDocument();
    });

    // Verify localStorage was cleared
    expect(localStorage.getItem('pathToYesActivePlan')).toBeNull();
    expect(localStorage.getItem('pathToYesProgressState')).toBeNull();
  }, 30000); // Increase timeout for this long integration test

  it('persists state across page reloads', async () => {
    const user = userEvent.setup();
    
    // Step 1: Set up DECLINED scenario and accept a product
    const { unmount } = render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Path to Yes')).toBeInTheDocument();
    });

    // Use preset to get DECLINED
    const creditThinButton = screen.getByRole('button', { name: /Credit-Thin/i });
    await user.click(creditThinButton);

    await waitFor(() => {
      expect(screen.getByText(/Application Could Not Be Approved/i)).toBeInTheDocument();
    });

    // Accept a product
    const acceptButtons = screen.getAllByRole('button', { name: /Accept & Start Plan/i });
    await user.click(acceptButtons[0]);

    // Wait for ProgressTracker
    await waitFor(() => {
      expect(screen.getByText(/Your Path to Yes Plan/i)).toBeInTheDocument();
    }, { timeout: 5000 });

    // Now check for the checkbox AFTER ProgressTracker is visible
    await waitFor(() => {
      const checkboxes = screen.queryAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    // Toggle one milestone
    const firstCheckbox = screen.getAllByRole('checkbox')[0] as HTMLInputElement;
    await user.click(firstCheckbox);

    await waitFor(() => {
      expect(firstCheckbox.checked).toBe(true);
    });

    // Verify state is in localStorage (wait for it to be saved)
    await waitFor(() => {
      expect(localStorage.getItem('pathToYesActivePlan')).not.toBeNull();
      expect(localStorage.getItem('pathToYesProgressState')).not.toBeNull();
    });

    // Step 2: Unmount and remount (simulate page reload)
    unmount();
    render(<App />);

    // Step 3: Verify ProgressTracker is restored with the toggled milestone
    await waitFor(() => {
      expect(screen.getByText(/Your Path to Yes Plan/i)).toBeInTheDocument();
    });

    // Check that the first milestone is still checked
    await waitFor(() => {
      const restoredCheckboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      expect(restoredCheckboxes[0].checked).toBe(true);
    });
  }, 30000);

  it('handles re-evaluate flow correctly', async () => {
    const user = userEvent.setup();
    
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Path to Yes')).toBeInTheDocument();
    });

    // Get to DECLINED state
    const creditThinButton = screen.getByRole('button', { name: /Credit-Thin/i });
    await user.click(creditThinButton);

    await waitFor(() => {
      expect(screen.getByText(/Application Could Not Be Approved/i)).toBeInTheDocument();
    });

    // Accept a product
    const acceptButtons = screen.getAllByRole('button', { name: /Accept & Start Plan/i });
    await user.click(acceptButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Your Path to Yes Plan/i)).toBeInTheDocument();
    });

    // Complete all milestones
    const checkboxes = screen.getAllByRole('checkbox');
    for (const checkbox of checkboxes) {
      await user.click(checkbox);
    }

    await waitFor(() => {
      expect(screen.getByText(/All milestones complete!/i)).toBeInTheDocument();
    });

    // Click Re-Evaluate
    const reEvaluateButton = screen.getByRole('button', { name: /Re-Evaluate My Application/i });
    await user.click(reEvaluateButton);

    // Should return to simulator view (but will still show ConversionView if inputs haven't changed)
    // Since we didn't actually change the inputs, it will still be DECLINED
    await waitFor(() => {
      // State should be cleared
      expect(localStorage.getItem('pathToYesActivePlan')).toBeNull();
      expect(localStorage.getItem('pathToYesProgressState')).toBeNull();
      
      // Should show ConversionView again since inputs still result in DECLINED
      expect(screen.getByText(/Application Could Not Be Approved/i)).toBeInTheDocument();
    });
  }, 30000);

  it('handles return to simulator from ConversionView', async () => {
    const user = userEvent.setup();
    
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Path to Yes')).toBeInTheDocument();
    });

    // Get to DECLINED state
    const creditThinButton = screen.getByRole('button', { name: /Credit-Thin/i });
    await user.click(creditThinButton);

    await waitFor(() => {
      expect(screen.getByText(/Application Could Not Be Approved/i)).toBeInTheDocument();
    });

    // Should show "Return to Simulator" button in ConversionView
    const returnButton = screen.getByRole('button', { name: /Return to Simulator/i });
    await user.click(returnButton);

    // Should remain in ConversionView but can interact with inputs
    // The button doesn't actually change views, just allows interaction
    // Verify we're still seeing the ConversionView content
    expect(screen.getByText(/Why Was I Declined\?/i)).toBeInTheDocument();
    
    // Can change inputs via preset buttons
    const primeBorrowerButton = screen.getByRole('button', { name: /Prime Borrower/i });
    await user.click(primeBorrowerButton);

    // Should update to new decision (Prime Borrower is APPROVED)
    await waitFor(() => {
      expect(screen.getByText(/Approved/i)).toBeInTheDocument();
      // Should no longer show ConversionView
      expect(screen.queryByText(/Build Your Path to Yes/i)).not.toBeInTheDocument();
    });
  }, 30000);
});
