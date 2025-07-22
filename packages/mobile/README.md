# Teacher Hub Mobile App

React Native mobile application for the Teacher Hub platform.

## Features

- User authentication (login, register, password reset)
- Offline-first architecture with SQLite storage
- Redux state management with persistence
- Navigation with React Navigation
- Material Design icons
- Secure token storage with Keychain

## Getting Started

### Prerequisites

- Node.js >= 16
- React Native development environment
- iOS Simulator or Android Emulator

### Installation

```bash
# Install dependencies
npm install

# iOS setup (macOS only)
cd ios && pod install && cd ..

# Start Metro bundler
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## Project Structure

```
src/
├── components/          # Reusable UI components
├── navigation/          # Navigation configuration
├── screens/            # Screen components
├── services/           # API and database services
├── store/              # Redux store and slices
├── styles/             # Theme and styling
└── App.tsx             # Root component
```

## Architecture

- **State Management**: Redux Toolkit with Redux Persist
- **Navigation**: React Navigation v6
- **Database**: SQLite with react-native-sqlite-storage
- **Security**: React Native Keychain for secure storage
- **Offline Support**: Built-in offline queue and sync mechanisms