# Mobile App Testing Guide

This document provides comprehensive information about the testing strategy, setup, and execution for the Teacher Hub mobile application.

## Table of Contents

- [Testing Strategy](#testing-strategy)
- [Test Types](#test-types)
- [Setup and Installation](#setup-and-installation)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [CI/CD Integration](#cicd-integration)
- [Performance Testing](#performance-testing)
- [Visual Regression Testing](#visual-regression-testing)
- [E2E Testing](#e2e-testing)
- [Troubleshooting](#troubleshooting)

## Testing Strategy

Our testing strategy follows the testing pyramid approach with comprehensive coverage across different test types:

```
        /\
       /  \
      / E2E \
     /______\
    /        \
   /Integration\
  /__________\
 /            \
/  Unit Tests  \
/______________\
```

### Coverage Targets

- **Unit Tests**: 70% overall, 80% for services, 75% for components
- **Integration Tests**: Critical user flows and feature interactions
- **E2E Tests**: Core user journeys and critical business flows
- **Contract Tests**: API endpoint contracts and data schemas
- **Performance Tests**: Render times, memory usage, and frame rates
- **Visual Tests**: Component appearance and responsive behavior

## Test Types

### 1. Unit Tests

Test individual components, functions, and services in isolation.

**Location**: `src/**/__tests__/*.test.ts(x)`

**Examples**:
- Component rendering and props
- Service method functionality
- Utility function behavior
- Hook logic and state management

### 2. Integration Tests

Test interactions between multiple components or services.

**Location**: `src/**/*.integration.test.ts(x)`

**Examples**:
- Authentication flow with storage
- API client with network layer
- Component interactions with services

### 3. Contract Tests

Validate API contracts and data schemas.

**Location**: `src/**/*.contract.test.ts(x)`

**Examples**:
- API response structure validation
- Request/response schema compliance
- Error response formats

### 4. Performance Tests

Measure and validate performance metrics.

**Location**: `src/**/*.performance.test.ts(x)`

**Examples**:
- Component render times
- Memory usage patterns
- Bundle size impact
- Frame rate during animations

### 5. Visual Regression Tests

Ensure UI consistency across changes.

**Location**: `src/**/*.visual.test.ts(x)`

**Examples**:
- Component snapshots
- Theme variations
- Responsive breakpoints
- Accessibility states

### 6. End-to-End Tests

Test complete user journeys in a real app environment.

**Location**: `e2e/*.test.js`

**Examples**:
- User registration and login
- Post creation and interaction
- Community joining and participation
- Resource sharing workflows

## Setup and Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- iOS Simulator (for iOS E2E tests)
- Android Emulator (for Android E2E tests)

### Installation

```bash
cd packages/mobile
npm install
```

### Test Dependencies

The following testing libraries are included:

- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing utilities
- **Detox**: E2E testing framework
- **MSW**: API mocking for integration tests
- **Nock**: HTTP request mocking for contract tests

## Running Tests

### All Tests

```bash
npm test
```

### Specific Test Types

```bash
# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Contract tests
npm run test:contract

# Performance tests
npm run test:performance

# Visual regression tests
npm run test:visual

# E2E tests
npm run test:e2e

# E2E tests on specific platforms
npm run test:e2e:ios
npm run test:e2e:android
```

### Watch Mode

```bash
# Watch all tests
npm run test:watch

# Watch specific test file
npm test -- --watch Button.test.tsx
```

### Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

## Writing Tests

### Unit Test Example

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button Component', () => {
  it('should render with title', () => {
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
});
```

### Integration Test Example

```typescript
import { render, waitFor } from '@testing-library/react-native';
import { AuthService } from '../services/auth';
import { LoginScreen } from '../screens/LoginScreen';

describe('Login Integration', () => {
  it('should complete login flow', async () => {
    const mockAuthService = jest.mocked(AuthService);
    mockAuthService.login.mockResolvedValue({
      user: mockUser,
      token: 'jwt-token'
    });

    const { getByTestId } = render(<LoginScreen />);
    
    // Fill form and submit
    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password');
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(mockAuthService.login).toHaveBeenCalled();
    });
  });
});
```

### Contract Test Example

```typescript
import { ContractTester, UserSchema } from '../test/contractUtils';

describe('User API Contract', () => {
  it('should validate user response', async () => {
    const tester = new ContractTester();
    
    tester.mockGetUser('user-123', mockUserResponse);
    
    const response = await apiClient.get('/users/user-123');
    
    tester.validateResponse(UserSchema, response.data);
  });
});
```

### Performance Test Example

```typescript
import { measurePerformance } from '../test/performanceUtils';

describe('Component Performance', () => {
  it('should render within performance threshold', 
    measurePerformance(
      () => {
        render(<ExpensiveComponent data={largeDataSet} />);
      },
      {
        maxRenderTime: 100, // 100ms
        maxMemoryUsage: 5 * 1024 * 1024, // 5MB
        maxReRenders: 1
      }
    )
  );
});
```

### Visual Test Example

```typescript
import { createVisualTest } from '../test/visualUtils';

describe('Button Visual Tests', () => {
  it('should match visual snapshot', 
    createVisualTest(
      <Button title="Visual Test" onPress={() => {}} />,
      'button-default'
    )
  );
});
```

### E2E Test Example

```javascript
describe('Authentication E2E', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should complete login flow', async () => {
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password');
    await element(by.id('login-button')).tap();
    
    await expect(element(by.text('Dashboard'))).toBeVisible();
  });
});
```

## CI/CD Integration

Tests are automatically run in GitHub Actions on:

- Push to main/develop branches
- Pull requests
- Scheduled runs (nightly)

### Test Pipeline

1. **Code Quality**: Linting, type checking, security audit
2. **Unit Tests**: Fast feedback on individual components
3. **Integration Tests**: Feature interaction validation
4. **Contract Tests**: API compatibility verification
5. **Performance Tests**: Performance regression detection
6. **Visual Tests**: UI consistency validation
7. **E2E Tests**: End-to-end user journey validation

### Coverage Requirements

- Pull requests must maintain or improve coverage
- Critical paths require 90%+ coverage
- New features require comprehensive test coverage

## Performance Testing

### Metrics Tracked

- **Render Time**: Component mount and update times
- **Memory Usage**: Heap size and garbage collection
- **Bundle Size**: JavaScript bundle impact
- **Frame Rate**: Animation smoothness
- **Cold Start**: App launch time
- **Time to Interactive**: User interaction readiness

### Performance Thresholds

```typescript
const performanceThresholds = {
  maxRenderTime: 100, // 100ms for component render
  maxMemoryUsage: 50 * 1024 * 1024, // 50MB heap size
  maxBundleSize: 5 * 1024 * 1024, // 5MB bundle size
  minFrameRate: 55, // 55 FPS minimum
  maxColdStart: 2000, // 2s cold start
  maxTimeToInteractive: 3000 // 3s TTI
};
```

### Running Performance Tests

```bash
# Run all performance tests
npm run test:performance

# Run specific performance test
npm test -- --testPathPattern="performance" Button.performance.test.ts

# Generate performance report
npm run test:performance -- --json --outputFile=performance-report.json
```

## Visual Regression Testing

### Screenshot Management

- **Baseline**: Reference screenshots stored in `__screenshots__/baseline/`
- **Output**: Test screenshots in `__screenshots__/output/`
- **Diff**: Difference images in `__screenshots__/diff/`

### Visual Test Configuration

```typescript
const visualConfig = {
  threshold: 0.2, // 20% difference threshold
  pixelThreshold: 0.1, // 10% pixel difference
  allowSizeMismatch: false,
  failureThreshold: 0.01 // 1% failure threshold
};
```

### Updating Baselines

```bash
# Update all visual baselines
npm run test:visual -- --updateSnapshot

# Update specific component baseline
npm run test:visual -- --updateSnapshot Button.visual.test.tsx
```

## E2E Testing

### Test Environment Setup

#### iOS Setup

```bash
# Install iOS dependencies
cd ios && pod install

# Build for testing
npm run detox:build:ios

# Run tests
npm run detox:test:ios
```

#### Android Setup

```bash
# Start emulator
emulator -avd Pixel_3a_API_30_x86

# Build for testing
npm run detox:build:android

# Run tests
npm run detox:test:android
```

### E2E Test Best Practices

1. **Test User Journeys**: Focus on complete workflows
2. **Use Stable Selectors**: Prefer testID over text or accessibility labels
3. **Wait for Elements**: Use `waitFor` for async operations
4. **Clean State**: Reset app state between tests
5. **Mock External Services**: Use mock servers for API calls

### E2E Test Structure

```javascript
describe('Feature E2E', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should complete user journey', async () => {
    // Test implementation
  });
});
```

## Troubleshooting

### Common Issues

#### Jest Configuration Issues

```bash
# Clear Jest cache
npx jest --clearCache

# Run with verbose output
npm test -- --verbose

# Debug specific test
npm test -- --runInBand Button.test.tsx
```

#### React Native Testing Issues

```bash
# Reset Metro cache
npx react-native start --reset-cache

# Clean build
cd ios && xcodebuild clean
cd android && ./gradlew clean
```

#### Detox E2E Issues

```bash
# Rebuild Detox
npx detox clean-framework-cache && npx detox build-framework-cache

# Reset simulator
xcrun simctl erase all

# Check Detox doctor
npx detox doctor
```

### Debug Mode

```bash
# Run tests in debug mode
npm test -- --runInBand --no-cache --no-coverage

# Debug E2E tests
npm run detox:test:ios -- --loglevel verbose
```

### Memory Issues

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Run tests with limited workers
npm test -- --maxWorkers=2
```

## Test Utilities

### Mock Factories

Use provided mock factories for consistent test data:

```typescript
import { 
  createMockUser, 
  createMockPost, 
  createMockCommunity 
} from '../test/testUtils';

const mockUser = createMockUser({ firstName: 'John' });
const mockPost = createMockPost({ title: 'Test Post' });
```

### Custom Render

Use the custom render function for consistent test setup:

```typescript
import { render } from '../test/testUtils';

const { getByText } = render(<Component />);
```

### Performance Monitoring

Use performance utilities for consistent measurements:

```typescript
import { PerformanceMonitor } from '../test/performanceUtils';

const monitor = new PerformanceMonitor();
monitor.start();
// ... test code
const metrics = monitor.getMetrics();
```

## Contributing

When adding new tests:

1. Follow the established patterns and conventions
2. Add appropriate test coverage for new features
3. Update this documentation for new test types or utilities
4. Ensure tests pass in CI/CD pipeline
5. Consider performance impact of test additions

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Detox Documentation](https://github.com/wix/Detox)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)