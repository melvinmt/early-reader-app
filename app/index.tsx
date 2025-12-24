import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { getParent } from '@/services/storage';

export default function Index() {
  const router = useRouter();
  const { session, initialized } = useAuthStore();

  useEffect(() => {
    if (!initialized) return;

    const checkAuth = async () => {
      if (session?.user) {
        // Check if parent exists in local database
        const parent = await getParent(session.user.id);
        if (parent) {
          // Navigate to child selection
          router.replace('/children');
        } else {
          // Navigate to onboarding
          router.replace('/onboarding/add-children');
        }
      } else {
        // Navigate to login
        router.replace('/auth/email-input');
      }
    };

    checkAuth();
  }, [session, initialized, router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>InstaReader</Text>
      <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  loader: {
    marginTop: 16,
  },
});




