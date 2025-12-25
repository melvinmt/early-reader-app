import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/stores/authStore';
import { initDatabase } from '@/services/storage';

export default function RootLayout() {
  const { initialize, session, initialized } = useAuthStore();

  useEffect(() => {
    // Initialize database
    initDatabase().catch(console.error);

    // Initialize auth
    if (!initialized) {
      initialize();
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/email-input" />
        <Stack.Screen name="auth/otp-verification" />
        <Stack.Screen name="onboarding/add-children" />
        <Stack.Screen name="onboarding/subscription" />
        <Stack.Screen name="children" />
        <Stack.Screen name="learning" />
        <Stack.Screen name="settings" />
      </Stack>
    </GestureHandlerRootView>
  );
}








