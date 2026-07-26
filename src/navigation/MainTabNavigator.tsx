import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Calendar, ClipboardList, User } from 'reicon-react-native';

import TimetableScreen from '../screens/TimetableScreen';
import ProfileScreen from '../screens/ProfileScreen';
// We will create this screen next, but let's mock it for the navigator
import { View, Text } from 'react-native';

const AttendanceScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Attendance Tracker Coming Soon</Text>
  </View>
);

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#00A19B', // Updated to match THE_MINT
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingBottom: 5,
          paddingTop: 5,
        },
        tabBarIcon: ({ color, size }) => {
          // Reicon integration based on the active tab
          if (route.name === 'TimetableTab') {
            return <Calendar size={size || 24} color={color} weight="Outline" />;
          } else if (route.name === 'AttendanceTab') {
            return <ClipboardList size={size || 24} color={color} weight="Outline" />;
          } else if (route.name === 'ProfileTab') {
            return <User size={size || 24} color={color} weight="Outline" />;
          }
        },
      })}
    >
      <Tab.Screen 
        name="TimetableTab" 
        component={TimetableScreen} 
        options={{ tabBarLabel: 'Schedule' }} 
      />
      <Tab.Screen 
        name="AttendanceTab" 
        component={AttendanceScreen} 
        options={{ tabBarLabel: 'Attendance' }} 
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{ tabBarLabel: 'Profile' }} 
      />
    </Tab.Navigator>
  );
}