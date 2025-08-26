import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../../theme/ThemeContext';
import Button from './Button';

// Mock haptic service
jest.mock('../../../services/haptics', () => ({
  HapticService: {
    buttonPress: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

describe('Button', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with title', () => {
    const { getByText } = renderWithTheme(
      <Button title="Test Button" onPress={() => {}} />
    );
    
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', async () => {
    const onPressMock = jest.fn();
    const { getByRole } = renderWithTheme(
      <Button title="Test Button" onPress={onPressMock} />
    );
    
    const button = getByRole('button');
    fireEvent.press(button);
    
    await waitFor(() => {
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });
  });

  it('shows loading indicator when loading', () => {
    const { getByTestId } = renderWithTheme(
      <Button title="Test Button" onPress={() => {}} loading testID="test-button" />
    );
    
    expect(getByTestId('test-button-loading')).toBeTruthy();
  });

  it('is disabled when disabled prop is true', () => {
    const onPressMock = jest.fn();
    const { getByRole } = renderWithTheme(
      <Button title="Test Button" onPress={onPressMock} disabled />
    );
    
    const button = getByRole('button');
    fireEvent.press(button);
    
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const onPressMock = jest.fn();
    const { getByRole } = renderWithTheme(
      <Button title="Test Button" onPress={onPressMock} loading />
    );
    
    const button = getByRole('button');
    fireEvent.press(button);
    
    expect(onPressMock).not.toHaveBeenCalled();
  });

  it('renders with different variants', () => {
    const variants = ['primary', 'secondary', 'outline', 'ghost'] as const;
    
    variants.forEach(variant => {
      const { getByText } = renderWithTheme(
        <Button title={`${variant} Button`} onPress={() => {}} variant={variant} />
      );
      
      expect(getByText(`${variant} Button`)).toBeTruthy();
    });
  });

  it('renders with different sizes', () => {
    const sizes = ['small', 'medium', 'large'] as const;
    
    sizes.forEach(size => {
      const { getByText } = renderWithTheme(
        <Button title={`${size} Button`} onPress={() => {}} size={size} />
      );
      
      expect(getByText(`${size} Button`)).toBeTruthy();
    });
  });

  it('renders with icon on left', () => {
    const MockIcon = () => null;
    const { getByText } = renderWithTheme(
      <Button 
        title="Button with Icon" 
        onPress={() => {}} 
        icon={<MockIcon />}
        iconPosition="left"
      />
    );
    
    expect(getByText('Button with Icon')).toBeTruthy();
  });

  it('renders with icon on right', () => {
    const MockIcon = () => null;
    const { getByText } = renderWithTheme(
      <Button 
        title="Button with Icon" 
        onPress={() => {}} 
        icon={<MockIcon />}
        iconPosition="right"
      />
    );
    
    expect(getByText('Button with Icon')).toBeTruthy();
  });

  it('has correct accessibility properties', () => {
    const { getByRole } = renderWithTheme(
      <Button 
        title="Accessible Button" 
        onPress={() => {}} 
        accessibilityLabel="Custom Label"
        accessibilityHint="Custom Hint"
      />
    );
    
    const button = getByRole('button');
    expect(button).toHaveAccessibilityState({ disabled: false, busy: false });
  });

  it('has correct accessibility state when disabled', () => {
    const { getByRole } = renderWithTheme(
      <Button title="Disabled Button" onPress={() => {}} disabled />
    );
    
    const button = getByRole('button');
    expect(button).toHaveAccessibilityState({ disabled: true, busy: false });
  });

  it('has correct accessibility state when loading', () => {
    const { getByRole } = renderWithTheme(
      <Button title="Loading Button" onPress={() => {}} loading />
    );
    
    const button = getByRole('button');
    expect(button).toHaveAccessibilityState({ disabled: true, busy: true });
  });

  it('can disable haptic feedback', async () => {
    const { HapticService } = require('../../../services/haptics');
    const onPressMock = jest.fn();
    
    const { getByRole } = renderWithTheme(
      <Button title="No Haptic" onPress={onPressMock} hapticFeedback={false} />
    );
    
    const button = getByRole('button');
    fireEvent.press(button);
    
    await waitFor(() => {
      expect(onPressMock).toHaveBeenCalledTimes(1);
      expect(HapticService.buttonPress).not.toHaveBeenCalled();
    });
  });
});