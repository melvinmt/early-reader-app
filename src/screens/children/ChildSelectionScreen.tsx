import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { getChildrenByParentId } from '@/services/storage';
import { Child } from '@/types/database';
import ParentalGate from '@/components/parent/ParentalGate';

export default function ChildSelectionScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showParentalGate, setShowParentalGate] = useState(false);

  useEffect(() => {
    loadChildren();
  }, [session]);

  const loadChildren = async () => {
    if (!session?.user) {
      return;
    }

    try {
      const kids = await getChildrenByParentId(session.user.id);
      setChildren(kids);
    } catch (error) {
      console.error('Error loading children:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChild = (child: Child) => {
    router.push({
      pathname: '/learning',
      params: { childId: child.id },
    });
  };

  const handleSettings = () => {
    setShowParentalGate(true);
  };

  const handleGateSuccess = () => {
    setShowParentalGate(false);
    router.push('/settings');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select a Child</Text>
        <TouchableOpacity onPress={handleSettings} style={styles.settingsButton}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {children.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No children added yet</Text>
            <Text style={styles.emptySubtext}>Add a child to get started</Text>
          </View>
        ) : (
          children.map((child) => (
            <TouchableOpacity
              key={child.id}
              style={styles.childCard}
              onPress={() => handleSelectChild(child)}
            >
              <View style={styles.childInfo}>
                <Text style={styles.childName}>{child.name}</Text>
                <Text style={styles.childDetails}>
                  Age {child.age} • Level {child.current_level}
                </Text>
                <Text style={styles.childProgress}>
                  {child.total_cards_completed} cards completed
                </Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <ParentalGate
        visible={showParentalGate}
        onSuccess={handleGateSuccess}
        onCancel={() => setShowParentalGate(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 0,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
  },
  childCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  childDetails: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  childProgress: {
    fontSize: 14,
    color: '#999',
  },
  arrow: {
    fontSize: 24,
    color: '#007AFF',
  },
});













