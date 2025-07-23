import React, {useEffect} from 'react';
import {createStackNavigator, CardStyleInterpolators} from '@react-navigation/stack';
import {useDispatch, useSelector} from 'react-redux';
import {Platform} from 'react-native';

import {LoginScreen} from '../screens/auth/LoginScreen';
import {RegisterScreen} from '../screens/auth/RegisterScreen';
import {ForgotPasswordScreen} from '../screens/auth/ForgotPasswordScreen';
import {checkBiometricAvailability} from '../store/slices/authSlice';
import {RootState, AppDispatch} from '../store';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

const Stack = createStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {biometric} = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Check biometric availability when auth navigator mounts
    dispatch(checkBiometricAvailability());
  }, [dispatch]);

  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        cardStyleInterpolator: Platform.OS === 'ios' 
          ? CardStyleInterpolators.forHorizontalIOS
          : CardStyleInterpolators.forFadeFromBottomAndroid,
        cardStyle: {
          backgroundColor: 'transparent',
        },
        cardOverlayEnabled: true,
        animationEnabled: true,
        presentation: 'card',
      }}>
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{
          animationTypeForReplace: 'push',
          cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
        }}
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen}
        options={{
          gestureDirection: 'horizontal',
          cardStyleInterpolator: Platform.OS === 'ios' 
            ? CardStyleInterpolators.forHorizontalIOS
            : CardStyleInterpolators.forRevealFromBottomAndroid,
        }}
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen}
        options={{
          gestureDirection: 'vertical',
          cardStyleInterpolator: CardStyleInterpolators.forModalPresentationIOS,
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};