import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {Provider, useDispatch} from 'react-redux';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

import {store, AppDispatch} from './store';
import {AppNavigator} from './navigation/AppNavigator';
import {DatabaseProvider} from './services/database/DatabaseProvider';
import {checkAuthStatus} from './store/slices/authSlice';
import {StyleSheet} from 'react-native';

const AppContent: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

  return (
    <DatabaseProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </DatabaseProvider>
  );
};

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <Provider store={store}>
          <AppContent />
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;