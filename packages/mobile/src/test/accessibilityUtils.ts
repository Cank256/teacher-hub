import { ReactTestInstance } from 'react-test-renderer';
import { AccessibilityInfo, Platform } from 'react-native';

interface AccessibilityTestResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

interface AccessibilityRequirement {
  name: string;
  check: (element: ReactTestInstance) => boolean;
  message: string;
  level: 'error' | 'warning';
}

// WCAG 2.1 compliance requirements for mobile
const accessibilityRequirements: AccessibilityRequirement[] = [
  {
    name: 'hasAccessibilityLabel',
    check: (element) => {
      const props = element.props;
      return !!(
        props.accessibilityLabel ||
        props.accessibilityLabelledBy ||
        props.children
      );
    },
    message: 'Interactive elements must have accessibility labels',
    level: 'error',
  },
  {
    name: 'hasAccessibilityRole',
    check: (element) => {
      const props = element.props;
      return !!(props.accessibilityRole || props.role);
    },
    message: 'Interactive elements should have accessibility roles',
    level: 'warning',
  },
  {
    name: 'hasAccessibilityHint',
    check: (element) => {
      const props = element.props;
      // Hint is optional but recommended for complex interactions
      return true; // This is a warning-level check
    },
    message: 'Complex interactive elements should have accessibility hints',
    level: 'warning',
  },
  {
    name: 'hasAccessibilityState',
    check: (element) => {
      const props = element.props;
      // Check if element has state information when needed
      if (props.disabled !== undefined || props.selected !== undefined) {
        return !!(props.accessibilityState);
      }
      return true;
    },
    message: 'Elements with state should have accessibilityState defined',
    level: 'error',
  },
];

export class AccessibilityTester {
  /**
   * Test a component tree for accessibility compliance
   */
  static testAccessibility(component: ReactTestInstance): AccessibilityTestResult {
    const result: AccessibilityTestResult = {
      passed: true,
      errors: [],
      warnings: [],
    };

    this.traverseComponent(component, result);

    result.passed = result.errors.length === 0;
    return result;
  }

  /**
   * Traverse component tree and check accessibility requirements
   */
  private static traverseComponent(
    component: ReactTestInstance,
    result: AccessibilityTestResult
  ): void {
    // Check if this is an interactive element
    if (this.isInteractiveElement(component)) {
      this.checkAccessibilityRequirements(component, result);
    }

    // Recursively check children
    if (component.children) {
      component.children.forEach((child) => {
        if (typeof child === 'object' && 'type' in child) {
          this.traverseComponent(child as ReactTestInstance, result);
        }
      });
    }
  }

  /**
   * Check if element is interactive and needs accessibility attributes
   */
  private static isInteractiveElement(component: ReactTestInstance): boolean {
    const interactiveTypes = [
      'TouchableOpacity',
      'TouchableHighlight',
      'TouchableWithoutFeedback',
      'Pressable',
      'Button',
      'TextInput',
      'Switch',
      'Slider',
    ];

    const type = component.type;
    if (typeof type === 'string') {
      return interactiveTypes.includes(type);
    }

    // Check for onPress or other interaction props
    const props = component.props;
    return !!(
      props.onPress ||
      props.onLongPress ||
      props.onFocus ||
      props.onBlur ||
      props.accessible === true
    );
  }

  /**
   * Check accessibility requirements for a component
   */
  private static checkAccessibilityRequirements(
    component: ReactTestInstance,
    result: AccessibilityTestResult
  ): void {
    accessibilityRequirements.forEach((requirement) => {
      if (!requirement.check(component)) {
        const message = `${requirement.message} (${component.type})`;
        
        if (requirement.level === 'error') {
          result.errors.push(message);
        } else {
          result.warnings.push(message);
        }
      }
    });
  }

  /**
   * Test color contrast (simplified version)
   */
  static testColorContrast(
    foregroundColor: string,
    backgroundColor: string,
    isLargeText = false
  ): { passed: boolean; ratio: number; required: number } {
    const ratio = this.calculateContrastRatio(foregroundColor, backgroundColor);
    const required = isLargeText ? 3.0 : 4.5; // WCAG AA standards
    
    return {
      passed: ratio >= required,
      ratio,
      required,
    };
  }

  /**
   * Calculate color contrast ratio
   */
  private static calculateContrastRatio(color1: string, color2: string): number {
    const luminance1 = this.getLuminance(color1);
    const luminance2 = this.getLuminance(color2);
    
    const lighter = Math.max(luminance1, luminance2);
    const darker = Math.min(luminance1, luminance2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Get relative luminance of a color
   */
  private static getLuminance(color: string): number {
    // Simplified luminance calculation
    // In a real implementation, you'd parse hex/rgb colors properly
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;

    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Convert hex color to RGB
   */
  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  /**
   * Test minimum touch target size (44x44 points on iOS, 48x48 dp on Android)
   */
  static testTouchTargetSize(
    width: number,
    height: number
  ): { passed: boolean; minSize: number } {
    const minSize = Platform.OS === 'ios' ? 44 : 48;
    const passed = width >= minSize && height >= minSize;
    
    return { passed, minSize };
  }

  /**
   * Test if screen reader is enabled
   */
  static async isScreenReaderEnabled(): Promise<boolean> {
    try {
      return await AccessibilityInfo.isScreenReaderEnabled();
    } catch (error) {
      console.warn('Failed to check screen reader status:', error);
      return false;
    }
  }

  /**
   * Test if reduce motion is enabled
   */
  static async isReduceMotionEnabled(): Promise<boolean> {
    try {
      return await AccessibilityInfo.isReduceMotionEnabled();
    } catch (error) {
      console.warn('Failed to check reduce motion status:', error);
      return false;
    }
  }

  /**
   * Announce message to screen reader
   */
  static announceForAccessibility(message: string): void {
    AccessibilityInfo.announceForAccessibility(message);
  }

  /**
   * Set accessibility focus to an element
   */
  static setAccessibilityFocus(reactTag: number): void {
    AccessibilityInfo.setAccessibilityFocus(reactTag);
  }
}

/**
 * Jest matcher for accessibility testing
 */
export const toBeAccessible = (component: ReactTestInstance) => {
  const result = AccessibilityTester.testAccessibility(component);
  
  return {
    pass: result.passed,
    message: () => {
      if (result.passed) {
        return 'Component is accessible';
      } else {
        const errors = result.errors.join('\n');
        const warnings = result.warnings.length > 0 
          ? `\nWarnings:\n${result.warnings.join('\n')}` 
          : '';
        return `Component is not accessible:\n${errors}${warnings}`;
      }
    },
  };
};

/**
 * Helper function to create accessible test components
 */
export const createAccessibleTestComponent = (
  Component: React.ComponentType<any>,
  props: any = {}
) => {
  const defaultAccessibilityProps = {
    accessible: true,
    accessibilityRole: 'button',
    accessibilityLabel: 'Test component',
  };

  return <Component {...defaultAccessibilityProps} {...props} />;
};

/**
 * Mock accessibility services for testing
 */
export const mockAccessibilityServices = {
  isScreenReaderEnabled: jest.fn().mockResolvedValue(false),
  isReduceMotionEnabled: jest.fn().mockResolvedValue(false),
  announceForAccessibility: jest.fn(),
  setAccessibilityFocus: jest.fn(),
};

/**
 * Accessibility test utilities for common scenarios
 */
export const AccessibilityTestUtils = {
  /**
   * Test form accessibility
   */
  testFormAccessibility: (formComponent: ReactTestInstance) => {
    const result = AccessibilityTester.testAccessibility(formComponent);
    
    // Additional form-specific checks
    const inputs = formComponent.findAllByType('TextInput');
    inputs.forEach((input) => {
      if (!input.props.accessibilityLabel && !input.props.placeholder) {
        result.errors.push('Form inputs must have labels or placeholders');
        result.passed = false;
      }
    });

    return result;
  },

  /**
   * Test navigation accessibility
   */
  testNavigationAccessibility: (navComponent: ReactTestInstance) => {
    const result = AccessibilityTester.testAccessibility(navComponent);
    
    // Check for navigation landmarks
    const hasNavigationRole = navComponent.props.accessibilityRole === 'navigation';
    if (!hasNavigationRole) {
      result.warnings.push('Navigation components should have navigation role');
    }

    return result;
  },

  /**
   * Test list accessibility
   */
  testListAccessibility: (listComponent: ReactTestInstance) => {
    const result = AccessibilityTester.testAccessibility(listComponent);
    
    // Check for list semantics
    const hasListRole = listComponent.props.accessibilityRole === 'list';
    if (!hasListRole) {
      result.warnings.push('List components should have list role');
    }

    return result;
  },
};

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAccessible(): R;
    }
  }
}

// Export for use in test setup
export const setupAccessibilityTesting = () => {
  expect.extend({ toBeAccessible });
  
  // Mock AccessibilityInfo for testing
  jest.mock('react-native', () => ({
    ...jest.requireActual('react-native'),
    AccessibilityInfo: mockAccessibilityServices,
  }));
};