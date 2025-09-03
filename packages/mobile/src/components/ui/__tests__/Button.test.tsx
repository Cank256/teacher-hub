import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { render, createMockUser } from '../../../test/testUtils';
import { Button } from '../Button/Button';

describe('Button Component', () => {
  describe('Basic functionality', () => {
    it('should render with text', () => {
      const { getByText } = render(
        <Button title="Test Button" onPress={() => {}} />
      );

      expect(getByText('Test Button')).toBeTruthy();
    });

    it('should call onPress when pressed', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(
        <Button title="Test Button" onPress={onPressMock} />
      );

      fireEvent.press(getByText('Test Button'));
      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when disabled', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(
        <Button title="Test Button" onPress={onPressMock} disabled />
      );

      fireEvent.press(getByText('Test Button'));
      expect(onPressMock).not.toHaveBeenCalled();
    });
  });

  describe('Variants', () => {
    it('should render primary variant correctly', () => {
      const { getByTestId } = render(
        <Button 
          title="Primary Button" 
          onPress={() => {}} 
          variant="primary"
          testID="primary-button"
        />
      );

      const button = getByTestId('primary-button');
      expect(button).toBeTruthy();
    });

    it('should render secondary variant correctly', () => {
      const { getByTestId } = render(
        <Button 
          title="Secondary Button" 
          onPress={() => {}} 
          variant="secondary"
          testID="secondary-button"
        />
      );

      const button = getByTestId('secondary-button');
      expect(button).toBeTruthy();
    });

    it('should render outline variant correctly', () => {
      const { getByTestId } = render(
        <Button 
          title="Outline Button" 
          onPress={() => {}} 
          variant="outline"
          testID="outline-button"
        />
      );

      const button = getByTestId('outline-button');
      expect(button).toBeTruthy();
    });

    it('should render ghost variant correctly', () => {
      const { getByTestId } = render(
        <Button 
          title="Ghost Button" 
          onPress={() => {}} 
          variant="ghost"
          testID="ghost-button"
        />
      );

      const button = getByTestId('ghost-button');
      expect(button).toBeTruthy();
    });
  });

  describe('Sizes', () => {
    it('should render small size correctly', () => {
      const { getByTestId } = render(
        <Button 
          title="Small Button" 
          onPress={() => {}} 
          size="small"
          testID="small-button"
        />
      );

      const button = getByTestId('small-button');
      expect(button).toBeTruthy();
    });

    it('should render medium size correctly', () => {
      const { getByTestId } = render(
        <Button 
          title="Medium Button" 
          onPress={() => {}} 
          size="medium"
          testID="medium-button"
        />
      );

      const button = getByTestId('medium-button');
      expect(button).toBeTruthy();
    });

    it('should render large size correctly', () => {
      const { getByTestId } = render(
        <Button 
          title="Large Button" 
          onPress={() => {}} 
          size="large"
          testID="large-button"
        />
      );

      const button = getByTestId('large-button');
      expect(button).toBeTruthy();
    });
  });

  describe('Loading state', () => {
    it('should show loading indicator when loading', () => {
      const { getByTestId, queryByText } = render(
        <Button 
          title="Loading Button" 
          onPress={() => {}} 
          loading
          testID="loading-button"
        />
      );

      expect(getByTestId('loading-indicator')).toBeTruthy();
      expect(queryByText('Loading Button')).toBeNull();
    });

    it('should not call onPress when loading', () => {
      const onPressMock = jest.fn();
      const { getByTestId } = render(
        <Button 
          title="Loading Button" 
          onPress={onPressMock} 
          loading
          testID="loading-button"
        />
      );

      fireEvent.press(getByTestId('loading-button'));
      expect(onPressMock).not.toHaveBeenCalled();
    });

    it('should show custom loading text', () => {
      const { getByText } = render(
        <Button 
          title="Submit" 
          onPress={() => {}} 
          loading
          loadingText="Submitting..."
        />
      );

      expect(getByText('Submitting...')).toBeTruthy();
    });
  });

  describe('Icons', () => {
    it('should render left icon', () => {
      const { getByTestId } = render(
        <Button 
          title="Button with Icon" 
          onPress={() => {}} 
          leftIcon="plus"
          testID="button-with-left-icon"
        />
      );

      expect(getByTestId('left-icon')).toBeTruthy();
    });

    it('should render right icon', () => {
      const { getByTestId } = render(
        <Button 
          title="Button with Icon" 
          onPress={() => {}} 
          rightIcon="arrow-forward"
          testID="button-with-right-icon"
        />
      );

      expect(getByTestId('right-icon')).toBeTruthy();
    });

    it('should render both left and right icons', () => {
      const { getByTestId } = render(
        <Button 
          title="Button with Icons" 
          onPress={() => {}} 
          leftIcon="plus"
          rightIcon="arrow-forward"
        />
      );

      expect(getByTestId('left-icon')).toBeTruthy();
      expect(getByTestId('right-icon')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have correct accessibility role', () => {
      const { getByRole } = render(
        <Button title="Accessible Button" onPress={() => {}} />
      );

      expect(getByRole('button')).toBeTruthy();
    });

    it('should have correct accessibility label', () => {
      const { getByLabelText } = render(
        <Button 
          title="Button" 
          onPress={() => {}} 
          accessibilityLabel="Custom accessibility label"
        />
      );

      expect(getByLabelText('Custom accessibility label')).toBeTruthy();
    });

    it('should have correct accessibility hint', () => {
      const { getByA11yHint } = render(
        <Button 
          title="Submit Form" 
          onPress={() => {}} 
          accessibilityHint="Submits the form data"
        />
      );

      expect(getByA11yHint('Submits the form data')).toBeTruthy();
    });

    it('should be disabled for accessibility when disabled', () => {
      const { getByRole } = render(
        <Button title="Disabled Button" onPress={() => {}} disabled />
      );

      const button = getByRole('button');
      expect(button).toHaveAccessibilityState({ disabled: true });
    });

    it('should indicate loading state for accessibility', () => {
      const { getByRole } = render(
        <Button title="Loading Button" onPress={() => {}} loading />
      );

      const button = getByRole('button');
      expect(button).toHaveAccessibilityState({ busy: true });
    });
  });

  describe('Custom styling', () => {
    it('should apply custom styles', () => {
      const customStyle = { backgroundColor: 'red' };
      const { getByTestId } = render(
        <Button 
          title="Custom Button" 
          onPress={() => {}} 
          style={customStyle}
          testID="custom-button"
        />
      );

      const button = getByTestId('custom-button');
      expect(button).toHaveStyle(customStyle);
    });

    it('should apply custom text styles', () => {
      const customTextStyle = { fontSize: 20, color: 'blue' };
      const { getByText } = render(
        <Button 
          title="Custom Text Button" 
          onPress={() => {}} 
          textStyle={customTextStyle}
        />
      );

      const text = getByText('Custom Text Button');
      expect(text).toHaveStyle(customTextStyle);
    });
  });

  describe('Full width', () => {
    it('should render full width when specified', () => {
      const { getByTestId } = render(
        <Button 
          title="Full Width Button" 
          onPress={() => {}} 
          fullWidth
          testID="full-width-button"
        />
      );

      const button = getByTestId('full-width-button');
      expect(button).toHaveStyle({ width: '100%' });
    });
  });

  describe('Haptic feedback', () => {
    it('should trigger haptic feedback on press', () => {
      const { getByText } = render(
        <Button 
          title="Haptic Button" 
          onPress={() => {}} 
          hapticFeedback
        />
      );

      fireEvent.press(getByText('Haptic Button'));
      // Note: Haptic feedback is mocked in test setup
      // In real implementation, this would trigger device haptics
    });
  });

  describe('Animation', () => {
    it('should animate on press', () => {
      const { getByTestId } = render(
        <Button 
          title="Animated Button" 
          onPress={() => {}} 
          animated
          testID="animated-button"
        />
      );

      const button = getByTestId('animated-button');
      fireEvent.press(button);
      
      // Animation testing would require more complex setup
      // This is a placeholder for animation testing
      expect(button).toBeTruthy();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty title', () => {
      const { queryByText } = render(
        <Button title="" onPress={() => {}} />
      );

      expect(queryByText('')).toBeTruthy();
    });

    it('should handle very long titles', () => {
      const longTitle = 'This is a very long button title that might wrap to multiple lines';
      const { getByText } = render(
        <Button title={longTitle} onPress={() => {}} />
      );

      expect(getByText(longTitle)).toBeTruthy();
    });

    it('should handle rapid consecutive presses', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(
        <Button title="Rapid Press Button" onPress={onPressMock} />
      );

      const button = getByText('Rapid Press Button');
      
      // Simulate rapid presses
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      expect(onPressMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const startTime = Date.now();
      
      render(
        <Button title="Performance Test Button" onPress={() => {}} />
      );
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(50); // Should render within 50ms
    });

    it('should handle many buttons efficiently', () => {
      const startTime = Date.now();
      
      const buttons = Array.from({ length: 100 }, (_, i) => (
        <Button 
          key={i}
          title={`Button ${i}`} 
          onPress={() => {}} 
        />
      ));

      render(<>{buttons}</>);
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(200); // Should render within 200ms
    });
  });
});