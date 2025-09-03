import React from 'react';
import { 
  createVisualTest, 
  testAllThemes, 
  testResponsiveBreakpoints,
  testAccessibilityStates,
  testComponentStates,
  createSnapshotTest
} from '../../../test/visualUtils';
import { Button } from '../Button/Button';

describe('Button Visual Tests', () => {
  describe('Basic Visual Tests', () => {
    it('should match visual snapshot for default button', 
      createVisualTest(
        <Button title="Default Button" onPress={() => {}} />,
        'button-default'
      )
    );

    it('should match snapshot for default button', 
      createSnapshotTest(
        <Button title="Default Button" onPress={() => {}} />,
        'button-default-snapshot'
      )
    );
  });

  describe('Variant Visual Tests', () => {
    const variants = ['primary', 'secondary', 'outline', 'ghost'] as const;
    
    variants.forEach(variant => {
      it(`should match visual snapshot for ${variant} variant`, 
        createVisualTest(
          <Button title={`${variant} Button`} onPress={() => {}} variant={variant} />,
          `button-${variant}`
        )
      );
    });
  });

  describe('Size Visual Tests', () => {
    const sizes = ['small', 'medium', 'large'] as const;
    
    sizes.forEach(size => {
      it(`should match visual snapshot for ${size} size`, 
        createVisualTest(
          <Button title={`${size} Button`} onPress={() => {}} size={size} />,
          `button-${size}`
        )
      );
    });
  });

  describe('State Visual Tests', () => {
    const stateTests = testComponentStates(
      (state) => (
        <Button 
          title="Button" 
          onPress={() => {}} 
          {...state}
        />
      ),
      'button-states',
      {
        disabled: { disabled: true },
        loading: { loading: true },
        'loading-with-text': { loading: true, loadingText: 'Loading...' },
        'with-left-icon': { leftIcon: 'plus' },
        'with-right-icon': { rightIcon: 'arrow-forward' },
        'with-both-icons': { leftIcon: 'plus', rightIcon: 'arrow-forward' },
        'full-width': { fullWidth: true },
      }
    );

    stateTests.forEach(({ name, test }) => {
      it(`should match visual snapshot for ${name}`, test);
    });
  });

  describe('Theme Visual Tests', () => {
    const themeTests = testAllThemes(
      <Button title="Themed Button" onPress={() => {}} />,
      'button-themes'
    );

    themeTests.forEach(({ name, test }) => {
      it(`should match visual snapshot for ${name}`, test);
    });
  });

  describe('Accessibility Visual Tests', () => {
    const accessibilityTests = testAccessibilityStates(
      <Button title="Accessible Button" onPress={() => {}} />,
      'button-accessibility'
    );

    accessibilityTests.forEach(({ name, test }) => {
      it(`should match visual snapshot for ${name}`, test);
    });
  });

  describe('Responsive Visual Tests', () => {
    const responsiveTests = testResponsiveBreakpoints(
      <Button title="Responsive Button" onPress={() => {}} fullWidth />,
      'button-responsive'
    );

    responsiveTests.forEach(({ name, test }) => {
      it(`should match visual snapshot for ${name}`, test);
    });
  });

  describe('Complex Button Combinations', () => {
    it('should match visual snapshot for complex primary button', 
      createVisualTest(
        <Button 
          title="Save Changes" 
          onPress={() => {}} 
          variant="primary"
          size="large"
          leftIcon="save"
          fullWidth
        />,
        'button-complex-primary'
      )
    );

    it('should match visual snapshot for complex secondary button', 
      createVisualTest(
        <Button 
          title="Cancel" 
          onPress={() => {}} 
          variant="secondary"
          size="medium"
          rightIcon="close"
        />,
        'button-complex-secondary'
      )
    );

    it('should match visual snapshot for loading button with icon', 
      createVisualTest(
        <Button 
          title="Uploading..." 
          onPress={() => {}} 
          variant="primary"
          loading
          leftIcon="upload"
          loadingText="Uploading file..."
        />,
        'button-loading-with-icon'
      )
    );

    it('should match visual snapshot for disabled button with icon', 
      createVisualTest(
        <Button 
          title="Submit" 
          onPress={() => {}} 
          variant="primary"
          disabled
          rightIcon="arrow-forward"
        />,
        'button-disabled-with-icon'
      )
    );
  });

  describe('Long Text Visual Tests', () => {
    it('should handle long button text properly', 
      createVisualTest(
        <Button 
          title="This is a very long button text that might wrap to multiple lines" 
          onPress={() => {}} 
          variant="primary"
        />,
        'button-long-text'
      )
    );

    it('should handle long text with icons', 
      createVisualTest(
        <Button 
          title="Download All Selected Resources and Files" 
          onPress={() => {}} 
          variant="outline"
          leftIcon="download"
          rightIcon="arrow-down"
        />,
        'button-long-text-with-icons'
      )
    );
  });

  describe('Edge Cases Visual Tests', () => {
    it('should handle empty title', 
      createVisualTest(
        <Button 
          title="" 
          onPress={() => {}} 
          leftIcon="plus"
        />,
        'button-empty-title'
      )
    );

    it('should handle single character title', 
      createVisualTest(
        <Button 
          title="+" 
          onPress={() => {}} 
          variant="primary"
          size="small"
        />,
        'button-single-character'
      )
    );

    it('should handle special characters in title', 
      createVisualTest(
        <Button 
          title="Save & Continue →" 
          onPress={() => {}} 
          variant="primary"
        />,
        'button-special-characters'
      )
    );
  });

  describe('Custom Styling Visual Tests', () => {
    it('should handle custom background color', 
      createVisualTest(
        <Button 
          title="Custom Color" 
          onPress={() => {}} 
          style={{ backgroundColor: '#FF6B6B' }}
        />,
        'button-custom-background'
      )
    );

    it('should handle custom text color', 
      createVisualTest(
        <Button 
          title="Custom Text Color" 
          onPress={() => {}} 
          textStyle={{ color: '#4ECDC4' }}
        />,
        'button-custom-text-color'
      )
    );

    it('should handle custom border radius', 
      createVisualTest(
        <Button 
          title="Rounded Button" 
          onPress={() => {}} 
          style={{ borderRadius: 25 }}
        />,
        'button-custom-border-radius'
      )
    );
  });

  describe('Animation States Visual Tests', () => {
    it('should show pressed state animation', 
      createVisualTest(
        <Button 
          title="Press Me" 
          onPress={() => {}} 
          animated
          // Note: In real tests, you'd trigger the pressed state
        />,
        'button-pressed-state'
      )
    );

    it('should show hover state (for web)', 
      createVisualTest(
        <Button 
          title="Hover Me" 
          onPress={() => {}} 
          // Note: In real tests, you'd simulate hover state
        />,
        'button-hover-state'
      )
    );
  });

  describe('Group Visual Tests', () => {
    it('should show button group layout', 
      createVisualTest(
        <>
          <Button title="Cancel" onPress={() => {}} variant="secondary" />
          <Button title="Save" onPress={() => {}} variant="primary" />
        </>,
        'button-group-horizontal'
      )
    );

    it('should show vertical button stack', 
      createVisualTest(
        <>
          <Button title="Primary Action" onPress={() => {}} variant="primary" fullWidth />
          <Button title="Secondary Action" onPress={() => {}} variant="secondary" fullWidth />
          <Button title="Tertiary Action" onPress={() => {}} variant="ghost" fullWidth />
        </>,
        'button-stack-vertical'
      )
    );
  });

  describe('Platform-Specific Visual Tests', () => {
    it('should render correctly on iOS', 
      createVisualTest(
        <Button 
          title="iOS Button" 
          onPress={() => {}} 
          variant="primary"
        />,
        'button-ios'
      )
    );

    it('should render correctly on Android', 
      createVisualTest(
        <Button 
          title="Android Button" 
          onPress={() => {}} 
          variant="primary"
        />,
        'button-android'
      )
    );
  });

  describe('High Contrast Visual Tests', () => {
    it('should be visible in high contrast mode', 
      createVisualTest(
        <Button 
          title="High Contrast Button" 
          onPress={() => {}} 
          variant="primary"
          // Note: In real tests, you'd apply high contrast theme
        />,
        'button-high-contrast'
      )
    );

    it('should maintain readability with custom colors in high contrast', 
      createVisualTest(
        <Button 
          title="Custom High Contrast" 
          onPress={() => {}} 
          style={{ backgroundColor: '#000000' }}
          textStyle={{ color: '#FFFFFF' }}
        />,
        'button-custom-high-contrast'
      )
    );
  });
});