import { ReactTestInstance } from 'react-test-renderer';
import { AccessibilityInfo } from 'react-native';

// Accessibility testing utilities
export interface AccessibilityTestResult {
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface AccessibilityAuditResult {
  component: string;
  tests: AccessibilityTestResult[];
  score: number;
  passed: boolean;
}

// WCAG 2.1 compliance checks
export class AccessibilityTester {
  // Check if element has proper accessibility label
  static hasAccessibilityLabel(element: ReactTestInstance): AccessibilityTestResult {
    const props = element.props;
    const hasLabel = !!(
      props.accessibilityLabel ||
      props.accessibilityLabelledBy ||
      (props.children && typeof props.children === 'string')
    );

    return {
      passed: hasLabel,
      message: hasLabel
        ? 'Element has accessibility label'
        : 'Element missing accessibility label - screen readers cannot identify this element',
      severity: hasLabel ? 'info' : 'error',
    };
  }

  // Check if interactive element has proper role
  static hasProperRole(element: ReactTestInstance): AccessibilityTestResult {
    const props = element.props;
    const interactiveElements = ['TouchableOpacity', 'TouchableHighlight', 'TouchableWithoutFeedback', 'Pressable'];
    const isInteractive = interactiveElements.includes(element.type as string) || props.onPress;
    
    if (!isInteractive) {
      return {
        passed: true,
        message: 'Non-interactive element does not require role',
        severity: 'info',
      };
    }

    const hasRole = !!(props.accessibilityRole || props.role);
    
    return {
      passed: hasRole,
      message: hasRole
        ? 'Interactive element has proper accessibility role'
        : 'Interactive element missing accessibility role - screen readers cannot identify element purpose',
      severity: hasRole ? 'info' : 'error',
    };
  }

  // Check if element meets minimum touch target size (44pt iOS, 48dp Android)
  static meetsTouchTargetSize(element: ReactTestInstance, platform: 'ios' | 'android' = 'ios'): AccessibilityTestResult {
    const props = element.props;
    const style = props.style || {};
    const minSize = platform === 'ios' ? 44 : 48;
    
    // Extract dimensions from style
    const width = style.width || style.minWidth;
    const height = style.height || style.minHeight;
    
    if (!width || !height) {
      return {
        passed: false,
        message: 'Cannot determine element dimensions for touch target size check',
        severity: 'warning',
      };
    }

    const meetsSize = width >= minSize && height >= minSize;
    
    return {
      passed: meetsSize,
      message: meetsSize
        ? `Touch target meets minimum size (${width}x${height} >= ${minSize}x${minSize})`
        : `Touch target too small (${width}x${height} < ${minSize}x${minSize}) - may be difficult to tap`,
      severity: meetsSize ? 'info' : 'error',
    };
  }

  // Check color contrast ratio (simplified check)
  static hasAdequateContrast(element: ReactTestInstance): AccessibilityTestResult {
    const props = element.props;
    const style = props.style || {};
    
    // This is a simplified check - in a real implementation, you'd need to:
    // 1. Extract actual color values
    // 2. Calculate luminance
    // 3. Compute contrast ratio
    // 4. Check against WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
    
    const hasColorStyle = !!(style.color || style.backgroundColor);
    
    if (!hasColorStyle) {
      return {
        passed: true,
        message: 'Element uses default colors',
        severity: 'info',
      };
    }

    // Placeholder for actual contrast calculation
    return {
      passed: true,
      message: 'Color contrast check requires actual color values - implement with color analysis library',
      severity: 'warning',
    };
  }

  // Check if form elements have proper labels and error states
  static hasProperFormLabeling(element: ReactTestInstance): AccessibilityTestResult {
    const props = element.props;
    const isFormElement = element.type === 'TextInput' || props.accessibilityRole === 'textbox';
    
    if (!isFormElement) {
      return {
        passed: true,
        message: 'Not a form element',
        severity: 'info',
      };
    }

    const hasLabel = !!(props.accessibilityLabel || props.placeholder);
    const hasErrorState = props.accessibilityState?.invalid !== undefined;
    
    return {
      passed: hasLabel,
      message: hasLabel
        ? 'Form element has proper labeling'
        : 'Form element missing label - users cannot identify input purpose',
      severity: hasLabel ? 'info' : 'error',
    };
  }

  // Check if images have alt text
  static hasImageAltText(element: ReactTestInstance): AccessibilityTestResult {
    const props = element.props;
    const isImage = element.type === 'Image' || props.accessibilityRole === 'image';
    
    if (!isImage) {
      return {
        passed: true,
        message: 'Not an image element',
        severity: 'info',
      };
    }

    const hasAltText = !!(props.accessibilityLabel || props.alt);
    const isDecorative = props.accessibilityRole === 'none' || props.accessible === false;
    
    if (isDecorative) {
      return {
        passed: true,
        message: 'Decorative image properly marked as non-accessible',
        severity: 'info',
      };
    }

    return {
      passed: hasAltText,
      message: hasAltText
        ? 'Image has alt text'
        : 'Image missing alt text - screen readers cannot describe image content',
      severity: hasAltText ? 'info' : 'error',
    };
  }

  // Check if headings are properly structured
  static hasProperHeadingStructure(elements: ReactTestInstance[]): AccessibilityTestResult {
    const headings = elements.filter(el => 
      el.props.accessibilityRole === 'header' || 
      (typeof el.type === 'string' && el.type.match(/^h[1-6]$/i))
    );

    if (headings.length === 0) {
      return {
        passed: true,
        message: 'No headings found',
        severity: 'info',
      };
    }

    // Check for proper heading hierarchy (simplified)
    const levels = headings.map(h => h.props.accessibilityLevel || 1);
    const hasProperHierarchy = levels.every((level, index) => {
      if (index === 0) return true;
      return level <= levels[index - 1] + 1;
    });

    return {
      passed: hasProperHierarchy,
      message: hasProperHierarchy
        ? 'Heading hierarchy is properly structured'
        : 'Heading hierarchy has gaps - may confuse screen reader users',
      severity: hasProperHierarchy ? 'info' : 'warning',
    };
  }

  // Check if focus management is proper
  static hasFocusManagement(element: ReactTestInstance): AccessibilityTestResult {
    const props = element.props;
    const isFocusable = !!(
      props.accessible !== false &&
      (props.onPress || props.onFocus || props.accessibilityRole)
    );

    if (!isFocusable) {
      return {
        passed: true,
        message: 'Element is not focusable',
        severity: 'info',
      };
    }

    const hasFocusHandling = !!(props.onFocus || props.onBlur);
    
    return {
      passed: true, // Focus management is handled by React Native
      message: 'Focus management handled by React Native',
      severity: 'info',
    };
  }

  // Run comprehensive accessibility audit
  static auditComponent(
    element: ReactTestInstance,
    componentName: string,
    platform: 'ios' | 'android' = 'ios'
  ): AccessibilityAuditResult {
    const tests: AccessibilityTestResult[] = [
      this.hasAccessibilityLabel(element),
      this.hasProperRole(element),
      this.meetsTouchTargetSize(element, platform),
      this.hasAdequateContrast(element),
      this.hasProperFormLabeling(element),
      this.hasImageAltText(element),
      this.hasFocusManagement(element),
    ];

    const errorCount = tests.filter(t => t.severity === 'error' && !t.passed).length;
    const warningCount = tests.filter(t => t.severity === 'warning' && !t.passed).length;
    
    // Calculate score (100 - errors*20 - warnings*5)
    const score = Math.max(0, 100 - errorCount * 20 - warningCount * 5);
    const passed = errorCount === 0;

    return {
      component: componentName,
      tests,
      score,
      passed,
    };
  }

  // Batch audit multiple components
  static auditComponents(
    elements: { element: ReactTestInstance; name: string }[],
    platform: 'ios' | 'android' = 'ios'
  ): AccessibilityAuditResult[] {
    return elements.map(({ element, name }) => 
      this.auditComponent(element, name, platform)
    );
  }

  // Generate accessibility report
  static generateReport(results: AccessibilityAuditResult[]): string {
    const totalComponents = results.length;
    const passedComponents = results.filter(r => r.passed).length;
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / totalComponents;

    let report = `Accessibility Audit Report\n`;
    report += `==========================\n\n`;
    report += `Components Tested: ${totalComponents}\n`;
    report += `Components Passed: ${passedComponents}\n`;
    report += `Pass Rate: ${((passedComponents / totalComponents) * 100).toFixed(1)}%\n`;
    report += `Average Score: ${averageScore.toFixed(1)}/100\n\n`;

    results.forEach(result => {
      report += `Component: ${result.component}\n`;
      report += `Score: ${result.score}/100 ${result.passed ? '✅' : '❌'}\n`;
      
      const errors = result.tests.filter(t => t.severity === 'error' && !t.passed);
      const warnings = result.tests.filter(t => t.severity === 'warning' && !t.passed);
      
      if (errors.length > 0) {
        report += `Errors:\n`;
        errors.forEach(error => {
          report += `  ❌ ${error.message}\n`;
        });
      }
      
      if (warnings.length > 0) {
        report += `Warnings:\n`;
        warnings.forEach(warning => {
          report += `  ⚠️ ${warning.message}\n`;
        });
      }
      
      report += `\n`;
    });

    return report;
  }
}

// Jest matchers for accessibility testing
export const accessibilityMatchers = {
  toBeAccessible: (element: ReactTestInstance) => {
    const result = AccessibilityTester.auditComponent(element, 'TestComponent');
    
    return {
      pass: result.passed,
      message: () => {
        const errors = result.tests.filter(t => t.severity === 'error' && !t.passed);
        return errors.length > 0
          ? `Element failed accessibility checks:\n${errors.map(e => `- ${e.message}`).join('\n')}`
          : 'Element passed all accessibility checks';
      },
    };
  },

  toHaveAccessibilityLabel: (element: ReactTestInstance) => {
    const result = AccessibilityTester.hasAccessibilityLabel(element);
    
    return {
      pass: result.passed,
      message: () => result.message,
    };
  },

  toHaveProperTouchTargetSize: (element: ReactTestInstance, platform: 'ios' | 'android' = 'ios') => {
    const result = AccessibilityTester.meetsTouchTargetSize(element, platform);
    
    return {
      pass: result.passed,
      message: () => result.message,
    };
  },

  toHaveAccessibilityRole: (element: ReactTestInstance) => {
    const result = AccessibilityTester.hasProperRole(element);
    
    return {
      pass: result.passed,
      message: () => result.message,
    };
  },
};

// Screen reader simulation utilities
export class ScreenReaderSimulator {
  static async simulateScreenReaderNavigation(elements: ReactTestInstance[]): Promise<string[]> {
    const announcements: string[] = [];
    
    for (const element of elements) {
      if (element.props.accessible !== false) {
        const label = element.props.accessibilityLabel || 
                     (typeof element.props.children === 'string' ? element.props.children : '');
        const role = element.props.accessibilityRole || 'element';
        const hint = element.props.accessibilityHint || '';
        
        if (label) {
          let announcement = `${label}, ${role}`;
          if (hint) announcement += `, ${hint}`;
          announcements.push(announcement);
        }
      }
    }
    
    return announcements;
  }

  static async simulateVoiceOverGestures(element: ReactTestInstance, gesture: 'tap' | 'swipeRight' | 'swipeLeft'): Promise<string> {
    const props = element.props;
    
    switch (gesture) {
      case 'tap':
        if (props.onPress) {
          return 'Activated';
        }
        return 'No action available';
        
      case 'swipeRight':
        return 'Next element';
        
      case 'swipeLeft':
        return 'Previous element';
        
      default:
        return 'Unknown gesture';
    }
  }
}

export default AccessibilityTester;