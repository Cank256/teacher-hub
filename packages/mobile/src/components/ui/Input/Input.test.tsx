import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ThemeProvider } from '../../../theme/ThemeContext';
import Input from './Input';

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

describe('Input', () => {
  it('renders correctly with placeholder', () => {
    const { getByPlaceholderText } = renderWithTheme(
      <Input placeholder="Enter text" />
    );
    
    expect(getByPlaceholderText('Enter text')).toBeTruthy();
  });

  it('renders with label', () => {
    const { getByText } = renderWithTheme(
      <Input label="Email" placeholder="Enter email" />
    );
    
    expect(getByText('Email')).toBeTruthy();
  });

  it('shows required indicator when required', () => {
    const { getByText } = renderWithTheme(
      <Input label="Email" placeholder="Enter email" required />
    );
    
    expect(getByText('*')).toBeTruthy();
  });

  it('displays error message', () => {
    const { getByText } = renderWithTheme(
      <Input 
        label="Email" 
        placeholder="Enter email" 
        error="Email is required" 
      />
    );
    
    expect(getByText('Email is required')).toBeTruthy();
  });

  it('displays helper text', () => {
    const { getByText } = renderWithTheme(
      <Input 
        label="Password" 
        placeholder="Enter password" 
        helperText="Must be at least 8 characters" 
      />
    );
    
    expect(getByText('Must be at least 8 characters')).toBeTruthy();
  });

  it('shows character count when enabled', () => {
    const { getByText } = renderWithTheme(
      <Input 
        placeholder="Enter text" 
        value="Hello"
        showCharacterCount
        maxLength={100}
      />
    );
    
    expect(getByText('5/100')).toBeTruthy();
  });

  it('calls onChangeText when text changes', () => {
    const onChangeTextMock = jest.fn();
    const { getByPlaceholderText } = renderWithTheme(
      <Input 
        placeholder="Enter text" 
        onChangeText={onChangeTextMock}
      />
    );
    
    const input = getByPlaceholderText('Enter text');
    fireEvent.changeText(input, 'Hello World');
    
    expect(onChangeTextMock).toHaveBeenCalledWith('Hello World');
  });

  it('calls onFocus when focused', () => {
    const onFocusMock = jest.fn();
    const { getByPlaceholderText } = renderWithTheme(
      <Input 
        placeholder="Enter text" 
        onFocus={onFocusMock}
      />
    );
    
    const input = getByPlaceholderText('Enter text');
    fireEvent(input, 'focus');
    
    expect(onFocusMock).toHaveBeenCalled();
  });

  it('calls onBlur when blurred', () => {
    const onBlurMock = jest.fn();
    const { getByPlaceholderText } = renderWithTheme(
      <Input 
        placeholder="Enter text" 
        onBlur={onBlurMock}
      />
    );
    
    const input = getByPlaceholderText('Enter text');
    fireEvent(input, 'blur');
    
    expect(onBlurMock).toHaveBeenCalled();
  });

  it('renders with left icon', () => {
    const MockIcon = () => null;
    const { getByPlaceholderText } = renderWithTheme(
      <Input 
        placeholder="Enter text" 
        leftIcon={<MockIcon />}
      />
    );
    
    expect(getByPlaceholderText('Enter text')).toBeTruthy();
  });

  it('renders with right icon and calls onRightIconPress', () => {
    const MockIcon = () => null;
    const onRightIconPressMock = jest.fn();
    const { getByRole } = renderWithTheme(
      <Input 
        placeholder="Enter text" 
        rightIcon={<MockIcon />}
        onRightIconPress={onRightIconPressMock}
      />
    );
    
    const iconButton = getByRole('button');
    fireEvent.press(iconButton);
    
    expect(onRightIconPressMock).toHaveBeenCalled();
  });

  it('renders with different variants', () => {
    const variants = ['outlined', 'filled'] as const;
    
    variants.forEach(variant => {
      const { getByPlaceholderText } = renderWithTheme(
        <Input placeholder={`${variant} input`} variant={variant} />
      );
      
      expect(getByPlaceholderText(`${variant} input`)).toBeTruthy();
    });
  });

  it('renders with different sizes', () => {
    const sizes = ['small', 'medium', 'large'] as const;
    
    sizes.forEach(size => {
      const { getByPlaceholderText } = renderWithTheme(
        <Input placeholder={`${size} input`} size={size} />
      );
      
      expect(getByPlaceholderText(`${size} input`)).toBeTruthy();
    });
  });

  it('is disabled when editable is false', () => {
    const { getByPlaceholderText } = renderWithTheme(
      <Input placeholder="Disabled input" editable={false} />
    );
    
    const input = getByPlaceholderText('Disabled input');
    expect(input.props.editable).toBe(false);
  });

  it('has correct accessibility properties', () => {
    const { getByPlaceholderText } = renderWithTheme(
      <Input 
        label="Email"
        placeholder="Enter email" 
        helperText="We'll never share your email"
      />
    );
    
    const input = getByPlaceholderText('Enter email');
    expect(input).toHaveAccessibilityState({ disabled: false });
  });
});