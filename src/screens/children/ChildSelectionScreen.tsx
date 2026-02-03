import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import { getAllChildren, deleteChild } from '@/services/storage';
import { Child } from '@/types/database';
import ParentalGate from '@/components/parent/ParentalGate';
import AddChildrenScreen from '@/screens/onboarding/AddChildrenScreen';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DELETE_THRESHOLD = -80; // Swipe left threshold to reveal delete button
const DELETE_BUTTON_WIDTH = 80;

// Swipeable child card component
function SwipeableChildCard({ 
  child, 
  onSelect, 
  onDeleteRequest 
}: { 
  child: Child; 
  onSelect: (child: Child) => void;
  onDeleteRequest: (child: Child) => void;
}) {
  const translateX = useSharedValue(0);
  const isSwipeOpen = useSharedValue(false);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      // Only allow swiping left (negative values)
      if (isSwipeOpen.value) {
        // If already open, allow swiping back
        translateX.value = Math.min(0, Math.max(-DELETE_BUTTON_WIDTH, -DELETE_BUTTON_WIDTH + event.translationX));
      } else {
        translateX.value = Math.min(0, Math.max(-DELETE_BUTTON_WIDTH, event.translationX));
      }
    })
    .onEnd((event) => {
      if (translateX.value < DELETE_THRESHOLD / 2) {
        // Snap open
        translateX.value = withSpring(-DELETE_BUTTON_WIDTH, { damping: 20 });
        isSwipeOpen.value = true;
      } else {
        // Snap closed
        translateX.value = withSpring(0, { damping: 20 });
        isSwipeOpen.value = false;
      }
    });

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleDelete = () => {
    translateX.value = withSpring(0, { damping: 20 });
    isSwipeOpen.value = false;
    onDeleteRequest(child);
  };

  return (
    <View style={styles.swipeContainer}>
      {/* Delete button behind the card */}
      <TouchableOpacity 
        style={styles.deleteButton} 
        onPress={handleDelete}
        activeOpacity={0.8}
      >
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
      
      {/* Swipeable card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.childCard, animatedCardStyle]}>
          <TouchableOpacity
            style={styles.childCardInner}
            onPress={() => onSelect(child)}
            activeOpacity={0.7}
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
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default function ChildSelectionScreen() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showParentalGate, setShowParentalGate] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [childToDelete, setChildToDelete] = useState<Child | null>(null);
  const [showDeleteGate, setShowDeleteGate] = useState(false);

  useEffect(() => {
    loadChildren();
  }, []);

  // Reload when returning from add child screen
  useEffect(() => {
    const unsubscribe = router.addListener?.('focus', () => {
      loadChildren();
    });
    return unsubscribe;
  }, [router]);

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
    // Show parental gate before allowing to add children
    setShowParentalGate(true);
  };

  const handleGateSuccess = () => {
    setShowParentalGate(false);
    setShowAddChild(true);
  };

  const handleAddChildComplete = () => {
    setShowAddChild(false);
    loadChildren();
  };

  // Delete flow handlers
  const handleDeleteRequest = useCallback((child: Child) => {
    setChildToDelete(child);
    setShowDeleteGate(true);
  }, []);

  const handleDeleteGateSuccess = useCallback(() => {
    setShowDeleteGate(false);
    // Show confirmation dialog after parental gate passes
    if (childToDelete) {
      Alert.alert(
        'Delete Profile',
        `Delete ${childToDelete.name}'s profile? All learning progress will be permanently lost.`,
        [
          { 
            text: 'Cancel', 
            style: 'cancel', 
            onPress: () => setChildToDelete(null) 
          },
          { 
            text: 'Delete', 
            style: 'destructive', 
            onPress: handleConfirmDelete 
          },
        ]
      );
    }
  }, [childToDelete]);

  const handleConfirmDelete = useCallback(async () => {
    if (childToDelete) {
      try {
        await deleteChild(childToDelete.id);
        setChildToDelete(null);
        loadChildren();
      } catch (error) {
        console.error('Error deleting child:', error);
        Alert.alert('Error', 'Failed to delete profile. Please try again.');
      }
    }
  }, [childToDelete]);

  const handleDeleteGateCancel = useCallback(() => {
    setShowDeleteGate(false);
    setChildToDelete(null);
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <Text>Loading...</Text>
      </View>
    );
  }

  // Show add child screen if no children (first signup - no gate needed)
  if (showAddChild && children.length === 0) {
    return <AddChildrenScreen onComplete={handleAddChildComplete} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Select a Child</Text>
        <TouchableOpacity onPress={handleAddChild} style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {children.map((child) => (
          <SwipeableChildCard
            key={child.id}
            child={child}
            onSelect={handleSelectChild}
            onDeleteRequest={handleDeleteRequest}
          />
        ))}
      </ScrollView>

      {showAddChild && children.length > 0 && (
        <AddChildrenScreen onComplete={handleAddChildComplete} asModal={true} />
      )}

      <ParentalGate
        visible={showParentalGate}
        onSuccess={handleGateSuccess}
        onCancel={() => setShowParentalGate(false)}
      />

      {/* Parental gate for delete action */}
      <ParentalGate
        visible={showDeleteGate}
        onSuccess={handleDeleteGateSuccess}
        onCancel={handleDeleteGateCancel}
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
  swipeContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  deleteButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_BUTTON_WIDTH,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  childCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  childCardInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
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














