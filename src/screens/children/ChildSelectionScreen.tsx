import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { getAllChildren } from '@/services/storage';
import { Child } from '@/types/database';
import ParentalGate from '@/components/parent/ParentalGate';
import AddChildrenScreen from '@/screens/onboarding/AddChildrenScreen';

export default function ChildSelectionScreen() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showParentalGate, setShowParentalGate] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [gatePassed, setGatePassed] = useState(false);

  useEffect(() => {
    loadChildren();
  }, []);

  // Reload when returning from add child screen
  useEffect(() => {
    const unsubscribe = router.addListener?.('focus', () => {
      loadChildren();
      // Reset gate when screen comes into focus (so it shows again)
      setGatePassed(false);
    });
    return unsubscribe;
  }, [router]);

  // Show parental gate when screen loads if there are children (not on first signup)
  useEffect(() => {
    if (!loading && children.length > 0 && !gatePassed) {
      setShowParentalGate(true);
    }
  }, [loading, children.length, gatePassed]);

  const loadChildren = async () => {
    try {
      const kids = await getAllChildren();
      setChildren(kids);
      setShowAddChild(kids.length === 0);
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

  const handleAddChild = () => {
    // No parental gate - always allow adding children
    setShowAddChild(true);
  };

  const handleGateSuccess = () => {
    setShowParentalGate(false);
    setGatePassed(true);
  };

  const handleAddChildComplete = () => {
    setShowAddChild(false);
    loadChildren();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Show add child screen if no children (first signup - no gate needed)
  if (showAddChild && children.length === 0) {
    return <AddChildrenScreen onComplete={handleAddChildComplete} />;
  }

  // Show parental gate if there are children and gate hasn't been passed
  if (children.length > 0 && !gatePassed) {
    return (
      <View style={styles.container}>
        <ParentalGate
          visible={showParentalGate}
          onSuccess={handleGateSuccess}
          onCancel={() => router.back()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select a Child</Text>
        <TouchableOpacity onPress={handleAddChild} style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {children.map((child) => (
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
        ))}
      </ScrollView>

      {showAddChild && children.length > 0 && (
        <AddChildrenScreen onComplete={handleAddChildComplete} asModal={true} />
      )}
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '600',
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














