import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AccessibleButton } from '../AccessibleButton';

// Mock dependencies
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn(),
    set: jest.fn(),
  })),
}));

jest.mock('react-native-localize', () => ({
  getLocales: jest.fn(() => [
    {
      languageCode: 'en',
      countryCode: 'US',
      languageTag: 'en-US',
      isRTL: false,
    },
  ]),
  getNumberFormatSettings: jest.fn(() => ({
    decimalSeparator: '.',
    groupingSeparator: ',',
  })),
  getCalendar: jest.fn(() => ({
    calendar: 'gregorian',
    uses24HourClock: false,
    firstDayOfWeek: 'sunday',
  })),
}));

jest.mock('@/contexts/AccessibilityContext', () => ({
  useAccessibility: () => ({
    getScaledFontSize: (size: number) => size,
    getAnimationDuration: (duration: number) => duration,
    getContrastRatio: () => 1,
    isScreenReaderEnabled: false,
    isHighContrastEnabled: false,
    settings: {
      isBoldTextEnabled: false,
    },
  }),
}));

jest.mock('@/contexts/InternationalizationContext', () => ({
  useInternationalization: () => ({
    isRTL: false,
    getFlexDirection: () => 'row',
    t: (key: string) => key,
  }),
}));

jest.mock('@/services/accessibility/AccessibilityService', () => ({
  getInstance: () => ({
    getMinimumTouchTargetSize: () => 44,
    generateAccessibilityHint: () => 'Double tap to activate',
    getAccessibilityRole: () => 'button',
    getAccessibilityState: () => ({}),
    provideAccessibilityFeedback: jest.fn(),
  }),
}));

describe('AccessibleButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should render with title', () => {
      const { getByText } = render(
        <AccessibleButton title="Test Button" onPress={mockOnPress} />
      );

      expect(getByText('Test Button')).toBeTruthy();
    });

    it('should call onPress when pressed', () => {
      const { getByText } = render(
        <AccessibleButton title="Test Button" onPress={mockOnPress} />
      );

      fireEvent.press(getByText('Test Button'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when disabled', () => {
      const { getByText } = render(
        <AccessibleButton title="Test Button" onPress={mockOnPress} disabled />
      );

      fireEvent.press(getByText('Test Button'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should not call onPress when loading', () => {
      const { getByText } = render(
        <AccessibleButton title="Test Button" onPress={mockOnPress} loading />
      );

      fireEvent.press(getByText('Test Button'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility Properties', () => {
    it('should have accessibility role', () => {
      const { getByRole } = render(
        <AccessibleButton title="Test Button" onPress={mockOnPress} />
      );

      expect(getByRole('button')).toBeTruthy();
    });

    it('should have accessibility label', () => {
      const { getByLabelText } = render(
        <AccessibleButton 
          title="Test Button" 
          onPress={mockOnPress}
          accessibilityLabel="Custom Label"
        />
      );

      expect(getByLabelText('Custom Label')).toBeTruthy();
    });

    it('should use title as accessibility label when no custom label provided', () => {
      const { getByLabelText } = render(
        <AccessibleButton title="Test Button" onPress={mockOnPress} />
      );

      expect(getByLabelText('Test Button')).toBeTruthy();
    });
  });

  describe('Visual Variants', () => {
    it('should render primary variant', () => {
      const { getByText } = render(
        <AccessibleButton title="Primary" onPress={mockOnPress} variant="primary" />
      );

      expect(getByText('Primary')).toBeTruthy();
    });

    it('should render secondary variant', () => {
      const { getByText } = render(
        <AccessibleButton title="Secondary" onPress={mockOnPress} variant="secondary" />
      );

      expect(getByText('Secondary')).toBeTruthy();
    });
  });

  describe('Size Variants', () => {
    it('should render small size', () => {
      const { getByText } = render(
        <AccessibleButton title="Small" onPress={mockOnPress} size="small" />
      );

      expect(getByText('Small')).toBeTruthy();
    });

    it('should render large size', () => {
      const { getByText } = render(
        <AccessibleButton title="Large" onPress={mockOnPress} size="large" />
      );

      expect(getByText('Large')).toBeTruthy();
    });
  });

  describe('Test ID', () => {
    it('should accept testID prop', () => {
      const { getByTestId } = render(
        <AccessibleButton 
          title="Test ID" 
          onPress={mockOnPress} 
          testID="test-button"
        />
      );

      expect(getByTestId('test-button')).toBeTruthy();
    });
  });
});