/**
 * MultiSelect Component Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MultiSelect, { MultiSelectOption } from '../MultiSelect';
import { HapticService } from '@/services/haptics';

// Mock dependencies
jest.mock('@/services/haptics');
jest.mock('@/theme/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#2563EB',
        surface: '#F8FAFC',
        border: '#E5E7EB',
        text: '#1F2937',
        textSecondary: '#6B7280',
        background: '#FFFFFF',
        error: '#EF4444',
        highlight: 'rgba(37, 99, 235, 0.08)',
      },
      borderRadius: {
        md: 8,
        lg: 12,
        full: 9999,
      },
      spacing: {
        xs: 4,
        md: 16,
      },
      typography: {
        fontSize: {
          xs: 12,
          sm: 14,
          md: 16,
          lg: 18,
        },
        fontFamily: {
          regular: 'System',
          medium: 'System',
          semibold: 'System',
        },
      },
    },
  }),
}));

const mockHapticService = HapticService as jest.Mocked<typeof HapticService>;

const mockOptions: MultiSelectOption[] = [
  { id: '1', label: 'Mathematics', value: 'math' },
  { id: '2', label: 'English', value: 'english' },
  { id: '3', label: 'Science', value: 'science' },
  { id: '4', label: 'History', value: 'history' },
];

describe('MultiSelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should render with placeholder when no selections', () => {
      const onSelectionChange = jest.fn();
      const { getByText } = render(
        <MultiSelect
          options={mockOptions}
          selectedValues={[]}
          onSelectionChange={onSelectionChange}
          placeholder="Select subjects..."
          testID="multi-select"
        />
      );

      expect(getByText('Select subjects...')).toBeTruthy();
    });

    it('should render with label', () => {
      const onSelectionChange = jest.fn();
      const { getByText } = render(
        <MultiSelect
          options={mockOptions}
          selectedValues={[]}
          onSelectionChange={onSelectionChange}
          label="Subjects"
          testID="multi-select"
        />
      );

      expect(getByText('Subjects')).toBeTruthy();
    });

    it('should show selected count when multiple items selected', () => {
      const onSelectionChange = jest.fn();
      const { getByText } = render(
        <MultiSelect
          options={mockOptions}
          selectedValues={['math', 'english']}
          onSelectionChange={onSelectionChange}
          testID="multi-select"
        />
      );

      expect(getByText('2 selected')).toBeTruthy();
    });

    it('should show single selection label when one item selected', () => {
      const onSelectionChange = jest.fn();
      const { getByText } = render(
        <MultiSelect
          options={mockOptions}
          selectedValues={['math']}
          onSelectionChange={onSelectionChange}
          testID="multi-select"
        />
      );

      expect(getByText('Mathematics')).toBeTruthy();
    });

    it('should display error message', () => {
      const onSelectionChange = jest.fn();
      const { getByText } = render(
        <MultiSelect
          options={mockOptions}
          selectedValues={[]}
          onSelectionChange={onSelectionChange}
          error="Please select at least one subject"
          testID="multi-select"
        />
      );

      expect(getByText('Please select at least one subject')).toBeTruthy();
    });
  });

  describe('Modal interaction', () => {
    it('should open modal when trigger is pressed', async () => {
      const onSelectionChange = jest.fn();
      const { getByTestId, getByText } = render(
        <MultiSelect
          options={mockOptions}
          selectedValues={[]}
          onSelectionChange={onSelectionChange}
          label="Subjects"
          testID="multi-select"
        />
      );

      const trigger = getByTestId('multi-select');
      fireEvent.press(trigger);

      await waitFor(() => {
        expect(mockHapticService.buttonPress).toHaveBeenCalled();
        expect(getByText('Subjects')).toBeTruthy(); // Modal title
      });
    });

    it('should not open modal when disabled', () => {
      const onSelectionChange = jest.fn();
      const { getByTestId } = render(
        <MultiSelect
          options={mockOptions}
          selectedValues={[]}
          onSelectionChange={onSelectionChange}
          disabled={true}
          testID="multi-select"
        />
      );

      const trigger = getByTestId('multi-select');
      fireEvent.press(trigger);

      expect(mockHapticService.buttonPress).not.toHaveBeenCalled();
    });

    it('should display all options in modal', async () => {
      const onSelectionChange = jest.fn();
      const { getByTestId, getByText } = render(
        <MultiSelect
          options={mockOptions}
          selectedValues={[]}
          onSelectionChange={onSelectionChange}
          testID="multi-select"
        />
      );

      const trigger = getByTestId('multi-select');
      fireEvent.press(trigger);

      await waitFor(() => {
        mockOptions.forEach(option => {
          expect(getByText(option.label)).toBeTruthy();
        });
      });
    });
  });

  describe('Selection functionality', () => {
    it('should handle single selection', async () => {
      const onSelectionChange = jest.fn();
      const { getByTestId, getByText } = render(
        <MultiSelect
          options={mockOptions}
          selectedValues={[]}
          onSelectionChange={onSelectionChange}
          testID="multi-select"
        />
      );

      const trigger = getByTestId('multi-select');
      fireEvent.press(trigger);

      await waitFor(() => {
        const mathOption = getByText('Mathematics');
        fireEvent.press(mathOption);
      });

      expect(mockHapticService.selectionChanged).toHaveBeenCalled();
      expect(onSelectionChange).toHaveBeenCalledWith(['math']);
    });

    it('should handle deselection', async () => {
      const onSelectionChange = jest.fn();
      const { getByTestId, getByText } = render(
        <MultiSelect
          options={mockOptions}
          selectedValues={['math']}
          onSelectionChange={onSelectionChange}
          testID="multi-select"
        />
      );

      const trigger = getByTestId('multi-select');
      fireEvent.press(trigger);

      await waitFor(() => {
        const mathOption = getByText('Mathematics');
        fireEvent.press(mathOption);
      });

      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });

    it('should handle multiple selections', async () => {
      const onSelectionChange = jest.fn();
      const { getByTestId, getByText } = render(
        <MultiSelect
          options={mockOptions}
          selectedValues={['math']}
          onSelectionChange={onSelectionChange}
          testID="multi-select"
        />
      );

      const trigger = getByTestId('multi-select');
      fireEvent.press(trigger);

      await waitFor(() => {
        const englishOption = getByText('English');
        fireEvent.press(englishOption);
      });

      expect(onSelectionChange).toHaveBeenCalledWith(['math', 'english']);
    });

    it('should respect max selections limit', async () => {
      const onSelectionChange = jest.fn();
      const { getByTestId, getByText } = render(
        <MultiSelect
          options={mockOptions}
          selectedValues={['math', 'english']}
          onSelectionChange={onSelectionChange}
          maxSelections={2}
          testID="multi-select"
        />
      );

      const trigger = getByTestId('multi-select');
      fireEvent.press(trigger);

      await waitFor(() => {
        const scienceOption = getByText('Science');
        fireEvent.press(scienceOption);
      });

      // Should not call onSelectionChange because limit is reached
      expect(onSelectionChange).not.toHaveBeenCalled();
    });

    it('should show max selections helper text', () => {
      const onSelectionChange = jest.fn();
      const { getByText } = render(
        <MultiSelect
          options={mockOptions}
          selectedValues={[]}
          onSelectionChange={onSelectionChange}
          maxSelections={3}
          testID="multi-select"
        />
      );

      expect(getByText('Maximum 3 selections allowed')).toBeTruthy();
    });
  });

  describe('Search functionality', () => {
    it('should filter options based on search query', async () => {
      const onSelectionChange = jest.fn();
      const { getByTestId, getByPlaceholderText, getByText, queryByText } = render(
        <MultiSelect
          options={mockOptions}
          selectedValues={[]}
          onSelectionChange={onSelectionChange}
          searchable={true}
          testID="multi-select"
        />
      );

      const trigger = getByTestId('multi-select');
      fireEvent.press(trigger);

      await waitFor(() => {
        const searchInput = getByPlaceholderText('Search options...');
        fireEvent.changeText(searchInput, 'math');
      });

      await waitFor(() => {
        expect(getByText('Mathematics')).toBeTruthy();
        expect(queryByText('English')).toBeNull();
        expect(queryByText('Science')).toBeNull();
        expect(queryByText('History')).toBeNull();
      });
    });

    it('should not show search input when searchable is false', async () => {
      const onSelectionChange = jest.fn();
      const { getByTestId, queryByPlaceholderText } = render(
        <MultiSelect
          options={mockOptions}
          selectedValues={[]}
          onSelectionChange={onSelectionChange}
          searchable={false}
          testID="multi-select"
        />
      );

      const trigger = getByTestId('multi-select');
      fireEvent.press(trigger);

      await waitFor(() => {
        expect(queryByPlaceholderText('Search options...')).toBeNull();
      });
    });
  });

  describe('Bulk actions', () => {
    it('should select all filtered options', async () => {
      const onSelectionChange = jest.fn();
      const { getByTestId, getByText } = render(
        <MultiSelect
          options={mockOptions}
          selectedValues={[]}
          onSelectionChange={onSelectionChange}
          testID="multi-select"
        />
      );

      const trigger = getByTestId('multi-select');
      fireEvent.press(trigger);

      await waitFor(() => {
        const selectAllButton = getByText('Select All');
        fireEvent.press(selectAllButton);
      });

      expect(onSelectionChange).toHaveBeenCalledWith(['math', 'english', 'science', 'history']);
    });

    it('should respect max selections when selecting all', async () => {
      const onSelectionChange = jest.fn();
      const { getByTestId, getByText } = render(
        <MultiSelect
          options={mockOptions}
          selectedValues={[]}
          onSelectionChange={onSelectionChange}
          maxSelections={2}
          testID="multi-select"
        />
      );

      const trigger = getByTestId('multi-select');
      fireEvent.press(trigger);

      await waitFor(() => {
        const selectAllButton = getByText('Select All');
        fireEvent.press(selectAllButton);
      });

      expect(onSelectionChange).toHaveBeenCalledWith(['math', 'english']);
    });

    it('should clear all selections', async () => {
      const onSelectionChange = jest.fn();
      const { getByTestId, getByText } = render(
        <MultiSelect
          options={mockOptions}
          selectedValues={['math', 'english']}
          onSelectionChange={onSelectionChange}
          testID="multi-select"
        />
      );

      const trigger = getByTestId('multi-select');
      fireEvent.press(trigger);

      await waitFor(() => {
        const clearAllButton = getByText('Clear All');
        fireEvent.press(clearAllButton);
      });

      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });
  });

  describe('Selected chips', () => {
    it('should display selected items as chips', () => {
      const onSelectionChange = jest.fn();
      const { getByText } = render(
        <MultiSelect
          options={mockOptions}
          selectedValues={['math', 'english']}
          onSelectionChange={onSelectionChange}
          testID="multi-select"
        />
      );

      expect(getByText('Mathematics')).toBeTruthy();
      expect(getByText('English')).toBeTruthy();
    });

    it('should remove item when chip is pressed', () => {
      const onSelectionChange = jest.fn();
      const { getByText } = render(
        <MultiSelect
          options={mockOptions}
          selectedValues={['math', 'english']}
          onSelectionChange={onSelectionChange}
          testID="multi-select"
        />
      );

      const mathChip = getByText('Mathematics');
      fireEvent.press(mathChip);

      expect(onSelectionChange).toHaveBeenCalledWith(['english']);
    });
  });

  describe('Modal controls', () => {
    it('should close modal when Done button is pressed', async () => {
      const onSelectionChange = jest.fn();
      const { getByTestId, getByText, queryByText } = render(
        <MultiSelect
          options={mockOptions}
          selectedValues={[]}
          onSelectionChange={onSelectionChange}
          label="Subjects"
          testID="multi-select"
        />
      );

      const trigger = getByTestId('multi-select');
      fireEvent.press(trigger);

      await waitFor(() => {
        expect(getByText('Subjects')).toBeTruthy();
      });

      const doneButton = getByText('Done');
      fireEvent.press(doneButton);

      await waitFor(() => {
        expect(queryByText('Done')).toBeNull();
      });
    });

    it('should close modal when close button is pressed', async () => {
      const onSelectionChange = jest.fn();
      const { getByTestId, getByText, queryByText } = render(
        <MultiSelect
          options={mockOptions}
          selectedValues={[]}
          onSelectionChange={onSelectionChange}
          label="Subjects"
          testID="multi-select"
        />
      );

      const trigger = getByTestId('multi-select');
      fireEvent.press(trigger);

      await waitFor(() => {
        expect(getByText('Subjects')).toBeTruthy();
      });

      const closeButton = getByText('×');
      fireEvent.press(closeButton);

      await waitFor(() => {
        expect(queryByText('×')).toBeNull();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility properties for trigger', () => {
      const onSelectionChange = jest.fn();
      const { getByTestId } = render(
        <MultiSelect
          options={mockOptions}
          selectedValues={[]}
          onSelectionChange={onSelectionChange}
          label="Subjects"
          testID="multi-select"
        />
      );

      const trigger = getByTestId('multi-select');
      expect(trigger.props.accessibilityRole).toBe('button');
      expect(trigger.props.accessibilityLabel).toBe('Subjects');
      expect(trigger.props.accessibilityHint).toBe('Tap to open selection modal');
    });

    it('should have proper accessibility properties for options', async () => {
      const onSelectionChange = jest.fn();
      const { getByTestId, getByText } = render(
        <MultiSelect
          options={mockOptions}
          selectedValues={['math']}
          onSelectionChange={onSelectionChange}
          testID="multi-select"
        />
      );

      const trigger = getByTestId('multi-select');
      fireEvent.press(trigger);

      await waitFor(() => {
        const mathOption = getByText('Mathematics');
        expect(mathOption.props.accessibilityRole).toBe('checkbox');
        expect(mathOption.props.accessibilityState).toEqual({ checked: true });
      });
    });
  });
});