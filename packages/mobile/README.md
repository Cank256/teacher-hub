# Teacher Hub Mobile App

A React Native mobile application for the Teacher Hub platform, built with New Architecture (Fabric and TurboModules), Hermes engine, and TypeScript in strict mode.

## Features

- **Modern Architecture**: Built with React Native New Architecture for optimal performance
- **TypeScript**: Strict mode TypeScript with comprehensive type safety
- **Performance Optimized**: Hermes JavaScript engine with bundle optimization
- **Feature-Based Structure**: Organized by features for better maintainability
- **Path Aliases**: Clean imports using TypeScript path mapping
- **Testing Ready**: Jest and React Testing Library setup with coverage reporting
- **Code Quality**: ESLint, Prettier, and pre-commit hooks configured

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Basic UI components (Button, Input, etc.)
│   ├── forms/           # Form-specific components
│   └── common/          # Shared components
├── features/            # Feature-based modules
│   ├── auth/            # Authentication feature
│   ├── posts/           # Posts management
│   ├── communities/     # Community features
│   ├── messaging/       # Real-time messaging
│   ├── resources/       # Resource sharing
│   └── profile/         # User profile management
├── navigation/          # Navigation configuration
├── services/            # External service integrations
│   ├── api/             # Backend API client
│   ├── storage/         # Local storage services
│   ├── auth/            # Authentication services
│   └── sync/            # Offline synchronization
├── store/               # Global state management
├── hooks/               # Custom React hooks
├── utils/               # Utility functions
├── types/               # TypeScript type definitions
├── constants/           # App constants and configuration
└── test/                # Test utilities and setup
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio and Android SDK (for Android development)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Run on specific platforms:
   ```bash
   npm run ios      # Run on iOS simulator
   npm run android  # Run on Android emulator
   npm run web      # Run on web browser
   ```

## Development

### Available Scripts

- `npm start` - Start the Expo development server
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm run web` - Run on web browser
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

### Code Quality

This project enforces code quality through:

- **ESLint**: Configured with React Native, TypeScript, and Prettier rules
- **Prettier**: Consistent code formatting
- **TypeScript**: Strict mode with comprehensive type checking
- **Jest**: Unit testing with coverage reporting
- **Pre-commit hooks**: Automatic linting and formatting on commit

### Path Aliases

The project uses path aliases for clean imports:

```typescript
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ApiClient } from '@/services/api/ApiClient';
```

Available aliases:
- `@/*` - src/*
- `@/components/*` - src/components/*
- `@/features/*` - src/features/*
- `@/services/*` - src/services/*
- `@/hooks/*` - src/hooks/*
- `@/utils/*` - src/utils/*
- `@/types/*` - src/types/*
- `@/constants/*` - src/constants/*
- `@/store/*` - src/store/*
- `@/navigation/*` - src/navigation/*

## Architecture

### New Architecture

This app is built with React Native's New Architecture, which includes:

- **Fabric**: New rendering system for better performance
- **TurboModules**: Improved native module system
- **Hermes**: Optimized JavaScript engine

### Performance Optimizations

- Hermes JavaScript engine with precompilation
- Bundle optimization with Metro
- RAM bundles for faster startup
- Image optimization and caching
- Efficient list rendering with FlashList

### Type Safety

The project uses TypeScript in strict mode with:

- `noImplicitAny: true`
- `noImplicitReturns: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `exactOptionalPropertyTypes: true`
- `noUncheckedIndexedAccess: true`

## Testing

The project includes comprehensive testing setup:

- **Unit Tests**: Jest with React Testing Library
- **Coverage**: 70% threshold for branches, functions, lines, and statements
- **Mocking**: Pre-configured mocks for React Native modules
- **Test Utilities**: Custom test setup and utilities

Run tests:
```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
```

## Contributing

1. Follow the established code style and conventions
2. Write tests for new features and bug fixes
3. Ensure all tests pass and coverage meets requirements
4. Use conventional commit messages
5. Update documentation as needed

## License

This project is part of the Teacher Hub platform and is proprietary software.