// src/components/MilestoneChecklist.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MilestoneChecklist } from './MilestoneChecklist';
import type { MilestoneStatus } from '../engine/types';

describe('MilestoneChecklist', () => {
  describe('Basic rendering', () => {
    it('renders milestone timeline title', () => {
      const milestones: MilestoneStatus[] = [
        {
          milestoneId: 'm1',
          label: 'First milestone',
          completed: false,
          completedAt: null,
        },
      ];

      render(<MilestoneChecklist milestones={milestones} onToggle={vi.fn()} />);

      expect(screen.getByText('Milestone Timeline')).toBeInTheDocument();
    });

    it('renders all milestone labels', () => {
      const milestones: MilestoneStatus[] = [
        {
          milestoneId: 'm1',
          label: 'Make first payment',
          completed: true,
          completedAt: '2024-01-15T10:00:00Z',
        },
        {
          milestoneId: 'm2',
          label: 'Make second payment',
          completed: false,
          completedAt: null,
        },
        {
          milestoneId: 'm3',
          label: 'Complete credit builder term',
          completed: false,
          completedAt: null,
        },
      ];

      render(<MilestoneChecklist milestones={milestones} onToggle={vi.fn()} />);

      expect(screen.getByText('Make first payment')).toBeInTheDocument();
      expect(screen.getByText('Make second payment')).toBeInTheDocument();
      expect(screen.getByText('Complete credit builder term')).toBeInTheDocument();
    });
  });

  describe('Completed milestone rendering', () => {
    it('renders completed milestone with checked checkbox and strikethrough', () => {
      const milestones: MilestoneStatus[] = [
        {
          milestoneId: 'm1',
          label: 'Completed milestone',
          completed: true,
          completedAt: '2024-01-15T10:00:00Z',
        },
      ];

      render(<MilestoneChecklist milestones={milestones} onToggle={vi.fn()} />);

      const checkbox = screen.getByRole('checkbox', { name: /Completed milestone/i });
      expect(checkbox).toBeChecked();

      const label = screen.getByText('Completed milestone');
      expect(label).toHaveClass('line-through', 'text-slate-500');
    });

    it('displays formatted completion date for completed milestone', () => {
      const milestones: MilestoneStatus[] = [
        {
          milestoneId: 'm1',
          label: 'Completed milestone',
          completed: true,
          completedAt: '2024-01-15T10:00:00Z',
        },
      ];

      render(<MilestoneChecklist milestones={milestones} onToggle={vi.fn()} />);

      // Should format as "Jan 15, 2024"
      expect(screen.getByText(/Jan 15, 2024/i)).toBeInTheDocument();
    });

    it('handles missing completedAt gracefully', () => {
      const milestones: MilestoneStatus[] = [
        {
          milestoneId: 'm1',
          label: 'Completed milestone',
          completed: true,
          completedAt: null,
        },
      ];

      render(<MilestoneChecklist milestones={milestones} onToggle={vi.fn()} />);

      // Should not crash, checkbox should still be checked
      const checkbox = screen.getByRole('checkbox', { name: /Completed milestone/i });
      expect(checkbox).toBeChecked();
    });
  });

  describe('In-progress milestone rendering', () => {
    it('renders first uncompleted milestone as in-progress', () => {
      const milestones: MilestoneStatus[] = [
        {
          milestoneId: 'm1',
          label: 'Already done',
          completed: true,
          completedAt: '2024-01-15T10:00:00Z',
        },
        {
          milestoneId: 'm2',
          label: 'Working on this',
          completed: false,
          completedAt: null,
        },
        {
          milestoneId: 'm3',
          label: 'Not started yet',
          completed: false,
          completedAt: null,
        },
      ];

      render(<MilestoneChecklist milestones={milestones} onToggle={vi.fn()} />);

      // "Working on this" should have "In Progress" badge
      expect(screen.getByText('In Progress')).toBeInTheDocument();

      // Label should have blue styling (not strikethrough)
      const currentLabel = screen.getByText('Working on this');
      expect(currentLabel).toHaveClass('text-blue-900');
      expect(currentLabel).not.toHaveClass('line-through');
    });

    it('shows "In Progress" badge only on current milestone', () => {
      const milestones: MilestoneStatus[] = [
        {
          milestoneId: 'm1',
          label: 'First uncompleted',
          completed: false,
          completedAt: null,
        },
        {
          milestoneId: 'm2',
          label: 'Second uncompleted',
          completed: false,
          completedAt: null,
        },
      ];

      render(<MilestoneChecklist milestones={milestones} onToggle={vi.fn()} />);

      // Should only show one "In Progress" badge
      const badges = screen.getAllByText('In Progress');
      expect(badges).toHaveLength(1);
    });
  });

  describe('Upcoming milestone rendering', () => {
    it('renders future milestones as upcoming', () => {
      const milestones: MilestoneStatus[] = [
        {
          milestoneId: 'm1',
          label: 'Current task',
          completed: false,
          completedAt: null,
        },
        {
          milestoneId: 'm2',
          label: 'Future task',
          completed: false,
          completedAt: null,
        },
      ];

      render(<MilestoneChecklist milestones={milestones} onToggle={vi.fn()} />);

      expect(screen.getByText('Upcoming')).toBeInTheDocument();

      const futureLabel = screen.getByText('Future task');
      expect(futureLabel).toHaveClass('text-slate-700');
      expect(futureLabel).not.toHaveClass('line-through');
    });
  });

  describe('Checkbox toggle behavior', () => {
    it('calls onToggle with correct milestoneId when checkbox clicked', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      const milestones: MilestoneStatus[] = [
        {
          milestoneId: 'm1',
          label: 'First milestone',
          completed: false,
          completedAt: null,
        },
        {
          milestoneId: 'm2',
          label: 'Second milestone',
          completed: false,
          completedAt: null,
        },
      ];

      render(<MilestoneChecklist milestones={milestones} onToggle={onToggle} />);

      const checkbox = screen.getByRole('checkbox', { name: /Second milestone/i });
      await user.click(checkbox);

      expect(onToggle).toHaveBeenCalledWith('m2');
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('calls onToggle when clicking completed milestone', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      const milestones: MilestoneStatus[] = [
        {
          milestoneId: 'm1',
          label: 'Completed milestone',
          completed: true,
          completedAt: '2024-01-15T10:00:00Z',
        },
      ];

      render(<MilestoneChecklist milestones={milestones} onToggle={onToggle} />);

      const checkbox = screen.getByRole('checkbox', { name: /Completed milestone/i });
      await user.click(checkbox);

      expect(onToggle).toHaveBeenCalledWith('m1');
    });
  });

  describe('Timeline visual states', () => {
    it('displays completed, in-progress, and upcoming milestones distinctly', () => {
      const milestones: MilestoneStatus[] = [
        {
          milestoneId: 'm1',
          label: 'Completed Task',
          completed: true,
          completedAt: '2024-01-15T10:00:00Z',
        },
        {
          milestoneId: 'm2',
          label: 'Current Task',
          completed: false,
          completedAt: null,
        },
        {
          milestoneId: 'm3',
          label: 'Future Task',
          completed: false,
          completedAt: null,
        },
      ];

      render(<MilestoneChecklist milestones={milestones} onToggle={vi.fn()} />);

      // Completed: has date, strikethrough
      expect(screen.getByText(/Jan 15, 2024/i)).toBeInTheDocument();
      expect(screen.getByText('Completed Task')).toHaveClass('line-through');

      // In Progress: has badge (use getAllByText since text appears twice: label + badge)
      const inProgressElements = screen.getAllByText('In Progress');
      expect(inProgressElements.length).toBeGreaterThan(0);

      // Upcoming: has text (use getAllByText since text appears twice: label + status)
      const upcomingElements = screen.getAllByText('Upcoming');
      expect(upcomingElements.length).toBeGreaterThan(0);
    });

    it('handles all milestones completed', () => {
      const milestones: MilestoneStatus[] = [
        {
          milestoneId: 'm1',
          label: 'First',
          completed: true,
          completedAt: '2024-01-15T10:00:00Z',
        },
        {
          milestoneId: 'm2',
          label: 'Second',
          completed: true,
          completedAt: '2024-01-20T10:00:00Z',
        },
      ];

      render(<MilestoneChecklist milestones={milestones} onToggle={vi.fn()} />);

      // No "In Progress" badge should be shown
      expect(screen.queryByText('In Progress')).not.toBeInTheDocument();

      // Both should have completion dates
      expect(screen.getByText(/Jan 15, 2024/i)).toBeInTheDocument();
      expect(screen.getByText(/Jan 20, 2024/i)).toBeInTheDocument();
    });

    it('handles no milestones completed (all upcoming)', () => {
      const milestones: MilestoneStatus[] = [
        {
          milestoneId: 'm1',
          label: 'First',
          completed: false,
          completedAt: null,
        },
        {
          milestoneId: 'm2',
          label: 'Second',
          completed: false,
          completedAt: null,
        },
      ];

      render(<MilestoneChecklist milestones={milestones} onToggle={vi.fn()} />);

      // First should be "In Progress"
      expect(screen.getByText('In Progress')).toBeInTheDocument();

      // Second should be "Upcoming"
      expect(screen.getByText('Upcoming')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('renders empty milestone list without crashing', () => {
      render(<MilestoneChecklist milestones={[]} onToggle={vi.fn()} />);

      expect(screen.getByText('Milestone Timeline')).toBeInTheDocument();
    });

    it('handles single milestone', () => {
      const milestones: MilestoneStatus[] = [
        {
          milestoneId: 'm1',
          label: 'Only milestone',
          completed: false,
          completedAt: null,
        },
      ];

      render(<MilestoneChecklist milestones={milestones} onToggle={vi.fn()} />);

      expect(screen.getByText('Only milestone')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });

    it('formats invalid date gracefully', () => {
      const milestones: MilestoneStatus[] = [
        {
          milestoneId: 'm1',
          label: 'Completed',
          completed: true,
          completedAt: 'invalid-date',
        },
      ];

      render(<MilestoneChecklist milestones={milestones} onToggle={vi.fn()} />);

      // Should not crash and should display "Invalid Date" (browser default for invalid Date objects)
      expect(screen.getByText('Invalid Date')).toBeInTheDocument();
    });
  });
});
