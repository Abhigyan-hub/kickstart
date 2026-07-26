import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import MainTabNavigator from './src/navigation/MainTabNavigator';

export type RootStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  MainTabs: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  // Use keyof RootStackParamList to keep TypeScript happy
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    const checkLoginState = async () => {
      try {
        const user = await AsyncStorage.getItem('@cascade_user');
        if (user) {
          // User is logged in, skip Login
          setInitialRoute('MainTabs');
        } else {
          // No user found, go to Login
          setInitialRoute('Login');
        }
      } catch (error) {
        setInitialRoute('Login');
      }
    };

    checkLoginState();
  }, []);

  // Show a loading spinner while we check AsyncStorage
  if (initialRoute === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
        <ActivityIndicator size="large" color="#00A19B" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }} 
        />
        {/* The new Forgot Password Screen */}
        <Stack.Screen 
          name="ForgotPassword" 
          component={ForgotPasswordScreen} 
          options={{ headerShown: false }} 
        />
        {/* After login, route to the tabs instead of a single screen */}
        <Stack.Screen 
          name="MainTabs" 
          component={MainTabNavigator} 
          options={{ headerShown: false }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}