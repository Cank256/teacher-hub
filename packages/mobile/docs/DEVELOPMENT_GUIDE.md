# Teacher Hub Mobile - Development Guide

## Overview

This guide provides comprehensive information for developers working on the Teacher Hub mobile application. The app is built using React Native with New Architecture (Fabric and TurboModules), TypeScript in strict mode, and follows modern mobile development best practices.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Architecture Overview](#architecture-overview)
3. [Development Workflow](#development-workflow)
4. [Code Standards](#code-standards)
5. [Testing Strategy](#testing-strategy)
6. [Performance Guidelines](#performance-guidelines)
7. [Security Considerations](#security-considerations)
8. [Deployment Process](#deployment-process)
9. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- React Native CLI
- Xcode 14+ (for iOS development)
- Android Studio with SDK 33+ (for Android development)
- EAS CLI for builds and deployments

### Installation

```bash
# Install dependencies
npm install

# iOS setup
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Environment Setup

1. Copy `.env.example` to `.env`
2. Configure environment variables:
   - `API_BASE_URL`: Backend API endpoint
   - `GOOGLE_OAUTH_CLIENT_ID`: Google OAuth configuration
   - `SENTRY_DSN`: Error monitoring configuration

## Architecture Overview

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI components
│   ├── forms/          # Form components
│   └── common/         # Shared components
├── features/           # Feature-based modules
│   ├── auth/           # Authentication
│   ├── posts/          # Posts management
│   ├── communities/    # Community features
│   ├── messaging/      # Real-time messaging
│   ├── resources/      # Resource sharing
│   └── profile/        # User profile
├── navigation/         # Navigation configuration
├── services/           # External service integrations
├── store/              # Global state management
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── types/              # TypeScript definitions
└── constants/          # App constants
```

### Key Technologies

- **React Native**: 0.76+ with New Architecture
- **TypeScript**: Strict mode with path aliases
- **Navigation**: React Navigation 7
- **State Management**: Zustand + React Query
- **Storage**: MMKV + SQLite + Keychain/Keystore
- **Animations**: React Native Reanimated 3
- **Testing**: Jest + React Testing Library + Detox
- **Build**: EAS Build with GitHub Actions

## Development Workflow

### Feature Development

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/feature-name
   ```

2. **Implement Feature**
   - Follow feature-based architecture
   - Write tests alongside implementation
   - Update documentation as needed

3. **Testing**
   ```bash
   # Run unit tests
   npm test
   
   # Run E2E tests
   npm run test:e2e
   
   # Run linting
   npm run lint
   ```

4. **Code Review**
   - Create pull request
   - Ensure CI passes
   - Address review feedback

5. **Merge and Deploy**
   - Merge to main branch
   - Automatic deployment via EAS

### Git Workflow

- Use conventional commits: `feat:`, `fix:`, `docs:`, `test:`
- Keep commits atomic and descriptive
- Rebase feature branches before merging
- Use semantic versioning for releases

## Code Standards

### TypeScript Guidelines

```typescript
// Use strict typing
interface User {
  id: string;
  email: string;
  profile: UserProfile;
}

// Prefer interfaces over types for object shapes
interface ComponentProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

// Use enums for constants
enum UserRole {
  TEACHER = 'teacher',
  ADMIN = 'admin',
}
```

### Component Guidelines

```typescript
// Use functional components with hooks
const MyComponent: React.FC<Props> = ({ title, onPress }) => {
  const [loading, setLoading] = useState(false);
  
  // Use useCallback for event handlers
  const handlePress = useCallback(() => {
    setLoading(true);
    onPress();
  }, [onPress]);
  
  return (
    <TouchableOpacity onPress={handlePress} disabled={loading}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
};

// Export with memo for performance
export default React.memo(MyComponent);
```

### Styling Guidelines

```typescript
// Use StyleSheet.create for performance
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
});

// Use theme system for consistency
const styles = createStyles((theme) => ({
  container: {
    backgroundColor: theme.colors.background,
  },
}));
```

## Testing Strategy

### Unit Tests

```typescript
// Component testing
describe('PostCard', () => {
  it('should render post content', () => {
    const post = createMockPost();
    render(<PostCard post={post} />);
    
    expect(screen.getByText(post.title)).toBeVisible();
  });
  
  it('should handle like action', async () => {
    const onLike = jest.fn();
    const post = createMockPost();
    
    render(<PostCard post={post} onLike={onLike} />);
    
    await user.press(screen.getByRole('button', { name: /like/i }));
    
    expect(onLike).toHaveBeenCalledWith(post.id);
  });
});
```

### Integration Tests

```typescript
// Feature testing
describe('Authentication Flow', () => {
  it('should login successfully', async () => {
    mockApiResponse('/auth/login', { token: 'jwt-token' });
    
    render(<LoginScreen />);
    
    await user.type(screen.getByPlaceholderText('Email'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'password');
    await user.press(screen.getByText('Login'));
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeVisible();
    });
  });
});
```

### E2E Tests

```typescript
// End-to-end testing with Detox
describe('App Navigation', () => {
  beforeAll(async () => {
    await device.launchApp();
  });
  
  it('should navigate through main tabs', async () => {
    await element(by.text('Posts')).tap();
    await expect(element(by.text('Create Post'))).toBeVisible();
    
    await element(by.text('Communities')).tap();
    await expect(element(by.text('Join Community'))).toBeVisible();
  });
});
```

## Performance Guidelines

### Optimization Strategies

1. **Image Optimization**
   ```typescript
   // Use FastImage for caching
   import FastImage from 'react-native-fast-image';
   
   <FastImage
     source={{ uri: imageUrl }}
     style={styles.image}
     resizeMode={FastImage.resizeMode.cover}
   />
   ```

2. **List Performance**
   ```typescript
   // Use FlashList for large lists
   import { FlashList } from '@shopify/flash-list';
   
   <FlashList
     data={posts}
     renderItem={renderPost}
     estimatedItemSize={100}
     keyExtractor={(item) => item.id}
   />
   ```

3. **Memory Management**
   ```typescript
   // Use performance optimizer
   import { performanceOptimizer } from '@/utils/performanceOptimizer';
   
   const endTimer = performanceOptimizer.startRenderTimer();
   // Component rendering
   endTimer();
   ```

### Bundle Optimization

- Use lazy loading for screens
- Implement code splitting
- Optimize imports and dependencies
- Use Hermes precompilation

## Security Considerations

### Data Protection

```typescript
// Use secure storage for sensitive data
import { secureStorage } from '@/services/storage';

await secureStorage.setItem('auth_token', token);
const token = await secureStorage.getItem('auth_token');
```

### Network Security

```typescript
// Implement SSL pinning
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  // SSL pinning configuration
});
```

### Authentication

```typescript
// Implement biometric authentication
import { biometricAuth } from '@/services/auth';

const result = await biometricAuth.authenticate();
if (result.success) {
  // Proceed with secure operation
}
```

## Deployment Process

### Build Configuration

```json
// eas.json
{
  "build": {
    "production": {
      "ios": {
        "buildConfiguration": "Release",
        "scheme": "TeacherHub"
      },
      "android": {
        "buildType": "release"
      }
    }
  }
}
```

### CI/CD Pipeline

```yaml
# .github/workflows/mobile-build.yml
name: Mobile Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Build with EAS
        run: eas build --platform all --non-interactive
```

## Troubleshooting

### Common Issues

1. **Metro bundler issues**
   ```bash
   # Clear Metro cache
   npx react-native start --reset-cache
   ```

2. **iOS build issues**
   ```bash
   # Clean iOS build
   cd ios && xcodebuild clean && cd ..
   rm -rf ios/build
   ```

3. **Android build issues**
   ```bash
   # Clean Android build
   cd android && ./gradlew clean && cd ..
   ```

### Performance Issues

1. **Memory leaks**
   - Use React DevTools Profiler
   - Monitor component re-renders
   - Check for unsubscribed listeners

2. **Slow navigation**
   - Use native stack navigator
   - Implement lazy loading
   - Optimize screen components

### Debugging Tools

- **Flipper**: For debugging and profiling
- **React DevTools**: For component inspection
- **Sentry**: For error monitoring
- **Performance Monitor**: For performance tracking

## Contributing

1. Read the contributing guidelines
2. Follow code standards and conventions
3. Write comprehensive tests
4. Update documentation
5. Submit pull requests for review

## Resources

- [React Native Documentation](https://reactnative.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Navigation](https://reactnavigation.org/)
- [EAS Documentation](https://docs.expo.dev/eas/)
- [Testing Library](https://testing-library.com/docs/react-native-testing-library/intro/)

For additional help, contact the development team or create an issue in the repository.