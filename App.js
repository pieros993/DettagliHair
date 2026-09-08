import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { supabase } from './src/lib/supabase';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import BookingScreen from './src/screens/BookingScreen';
import MyBookingsScreen from './src/screens/MyBookingsScreen';

import AdminDashboard from './src/screens/admin/AdminDashboard';
import AdminOperators from './src/screens/admin/AdminOperators';
import AdminServices from './src/screens/admin/AdminServices';
import AdminNotifications from './src/screens/admin/AdminNotifications';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications } from './src/lib/notifications';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function UserTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F0F0F0',
          borderTopWidth: 1,
          paddingBottom: insets.bottom || 6,
          paddingTop: 6,
          height: 52 + (insets.bottom || 0),
        },
        tabBarActiveTintColor: '#1A1A1A',
        tabBarInactiveTintColor: '#AAAAAA',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'cut' : 'cut-outline';
          else if (route.name === 'LePrenotazioni')
            iconName = focused ? 'calendar' : 'calendar-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Prenota' }}
      />
      <Tab.Screen
        name="LePrenotazioni"
        component={MyBookingsScreen}
        options={{ tabBarLabel: 'Le mie' }}
      />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1A1A1A',
          borderTopColor: '#333333',
          borderTopWidth: 1,
          paddingBottom: insets.bottom || 6,
          paddingTop: 6,
          height: 52 + (insets.bottom || 0),
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#666666',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard')
            iconName = focused ? 'grid' : 'grid-outline';
          else if (route.name === 'Operatori')
            iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Servizi')
            iconName = focused ? 'cut' : 'cut-outline';
          else if (route.name === 'Notifiche')
            iconName = focused ? 'notifications' : 'notifications-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}>
      <Tab.Screen
        name="Dashboard"
        component={AdminDashboard}
        options={{ tabBarLabel: 'Dashboard' }}
      />
      <Tab.Screen
        name="Operatori"
        component={AdminOperators}
        options={{ tabBarLabel: 'Operatori' }}
      />
      <Tab.Screen
        name="Servizi"
        component={AdminServices}
        options={{ tabBarLabel: 'Servizi' }}
      />
      <Tab.Screen
        name="Notifiche"
        component={AdminNotifications}
        options={{ tabBarLabel: 'Notifiche' }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkAdmin(session.user.id);
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkAdmin(session.user.id);
      else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    const notifListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notifica ricevuta:', notification);
      }
    );

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const bookingId = response.notification.request.content.data?.bookingId;
        console.log('Tap su notifica, bookingId:', bookingId);
      });

    return () => {
      subscription.unsubscribe();
      notifListener.remove();
      responseListener.remove();
    };
  }, []);

  async function checkAdmin(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    setIsAdmin(data?.role === 'admin');
    setLoading(false);

    // Registra push token
    await registerForPushNotifications();
  }

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : isAdmin ? (
          <Stack.Screen name="AdminMain" component={AdminTabs} />
        ) : (
          <>
            <Stack.Screen name="Main" component={UserTabs} />
            <Stack.Screen name="Booking" component={BookingScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
