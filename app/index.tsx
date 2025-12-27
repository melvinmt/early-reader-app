import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Start directly at children screen (no auth)
    router.replace('/children');
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Early Reader</Text>
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














