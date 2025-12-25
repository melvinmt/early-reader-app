import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { getChildrenByParentId } from '@/services/storage';
import { useEffect, useState } from 'react';
import { Child } from '@/types/database';

export default function SettingsScreen() {
  const router = useRouter();
  const { session, signOut } = useAuthStore();
  const [children, setChildren] = useState<Child[]>([]);

  useEffect(() => {
    loadChildren();
  }, [session]);

  const loadChildren = async () => {
    if (!session?.user) return;
    try {
      const kids = await getChildrenByParentId(session.user.id);
      setChildren(kids);
    } catch (error) {
      console.error('Error loading children:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth/email-input');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Children</Text>
        {children.map((child) => (
          <View key={child.id} style={styles.childItem}>
            <Text style={styles.childName}>{child.name}</Text>
            <Text style={styles.childDetails}>
              Age {child.age} • Level {child.current_level}
            </Text>
          </View>
        ))}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/onboarding/add-children')}
        >
          <Text style={styles.addButtonText}>+ Add Child</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.button} onPress={handleSignOut}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  childItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  childName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  childDetails: {
    fontSize: 14,
    color: '#666',
  },
  addButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});






