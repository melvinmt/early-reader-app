import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LogBox } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { initDatabase, clearTestingData } from '@/services/storage';

// Suppress touch-related warnings from gesture handler
LogBox.ignoreLogs([
  'Cannot record touch move without a touch start',
  'Touch Move:',
  'Touch Bank:',
]);

export default function RootLayout() {
  const { initialize, session, initialized } = useAuthStore();

  useEffect(() => {
    // Initialize database
    initDatabase()
      .then(() => {
        // Clear testing data on startup (for testing purposes)
        return clearTestingData();
      })
      .catch(console.error);

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
        <Stack.Screen 
          name="learning" 
          options={{ 
            gestureEnabled: false, // Disable iOS back swipe for learning screen
          }} 
        />
        <Stack.Screen name="settings" />
      </Stack>
    </GestureHandlerRootView>
  );
}








