import React, { useEffect, useState } from 'react';
import { NavigationContainer as RNNavigationContainer } from '@react-navigation/native';
import type { NavigationState } from '@react-navigation/native';
import { navigationRef } from './NavigationService';
import { linkingConfig } from './linking';
import { NavigationPersistence } from './NavigationPersistence';
import { RootNavigator } from './RootNavigator';

interface NavigationContainerProps {
  isAuthenticated: boolean;
  isFirstLaunch: boolean;
}

export const NavigationContainer: React.FC<NavigationContainerProps> = ({
  isAuthenticated,
  isFirstLaunch,
}) => {
  const [isReady, setIsReady] = useState(false);
  const [initialState, setInitialState] = useState<NavigationState | undefined>();

  useEffect(() => {
    const restoreState = async () => {
      try {
        // Only restore state if we should and user is authenticated
        if (NavigationPersistence.shouldRestoreState() && isAuthenticated) {
          const savedState = await NavigationPersistence.restoreNavigationState();
          
          if (savedState) {
            setInitialState(savedState);
          }
        }
      } catch (error) {
        console.warn('Failed to restore navigation state:', error);
      } finally {
        setIsReady(true);
      }
    };

    restoreState();
  }, [isAuthenticated]);

  const handleStateChange = (state: NavigationState | undefined) => {
    // Save navigation state when it changes
    if (state && isAuthenticated) {
      NavigationPersistence.saveNavigationState(state);
    }
  };

  const handleReady = () => {
    // Navigation container is ready
    console.log('Navigation container is ready');
  };

  const handleUnhandledAction = (action: any) => {
    // Handle unhandled navigation actions
    console.warn('Unhandled navigation action:', action);
  };

  if (!isReady) {
    // Return loading screen or splash screen while restoring state
    return null;
  }

  return (
    <RNNavigationContainer
      ref={navigationRef}
      linking={linkingConfig}
      initialState={initialState}
      onStateChange={handleStateChange}
      onReady={handleReady}
      onUnhandledAction={handleUnhandledAction}
      fallback={null} // Custom loading component can be added here
    >
      <RootNavigator
        isAuthenticated={isAuthenticated}
        isFirstLaunch={isFirstLaunch}
      />
    </RNNavigationContainer>
  );
};