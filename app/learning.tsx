import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function LearningScreen() {
  const params = useLocalSearchParams();
  const childId = params.childId as string;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Learning Screen</Text>
      <Text style={styles.subtitle}>Child ID: {childId}</Text>
      <Text style={styles.note}>Card display and voice interaction coming soon...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  note: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
