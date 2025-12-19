import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { createChild } from '@/services/storage';
import { Child } from '@/types/database';
import Button from '@/components/ui/Button';
import { v4 as uuidv4 } from 'uuid';

interface ChildInput {
  id: string;
  name: string;
  age: number | null;
}

const AGES = [3, 4, 5, 6, 7, 8];

export default function AddChildrenScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const [children, setChildren] = useState<ChildInput[]>([
    { id: uuidv4(), name: '', age: null },
  ]);

  const updateChild = (id: string, field: 'name' | 'age', value: string | number) => {
    setChildren((prev) =>
      prev.map((child) => (child.id === id ? { ...child, [field]: value } : child))
    );
  };

  const addChild = () => {
    setChildren((prev) => [...prev, { id: uuidv4(), name: '', age: null }]);
  };

  const removeChild = (id: string) => {
    if (children.length === 1) {
      Alert.alert('Error', 'You must add at least one child');
      return;
    }
    setChildren((prev) => prev.filter((child) => child.id !== id));
  };

  const handleContinue = async () => {
    if (!session?.user) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    // Validate all children have name and age
    const validChildren = children.filter((c) => c.name.trim() && c.age !== null);
    if (validChildren.length === 0) {
      Alert.alert('Error', 'Please add at least one child with a name and age');
      return;
    }

    // Save children to database
    try {
      for (const childInput of validChildren) {
        const child: Child = {
          id: uuidv4(),
          parent_id: session.user.id,
          name: childInput.name.trim(),
          age: childInput.age!,
          created_at: new Date().toISOString(),
          current_level: 1,
          total_cards_completed: 0,
        };
        await createChild(child);
      }

      // Navigate to subscription screen
      router.push('/onboarding/subscription');
    } catch (error) {
      console.error('Error creating children:', error);
      Alert.alert('Error', 'Failed to save children. Please try again.');
    }
  };

  const canContinue = children.some((c) => c.name.trim() && c.age !== null);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Add Your Children</Text>
      <Text style={styles.subtitle}>
        Add one or more children to start their reading journey
      </Text>

      {children.map((child, index) => (
        <View key={child.id} style={styles.childCard}>
          <Text style={styles.cardTitle}>Child {index + 1}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Child's name"
              value={child.name}
              onChangeText={(value) => updateChild(child.id, 'name', value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age</Text>
            <View style={styles.ageContainer}>
              {AGES.map((age) => (
                <TouchableOpacity
                  key={age}
                  style={[
                    styles.ageButton,
                    child.age === age && styles.ageButtonSelected,
                  ]}
                  onPress={() => updateChild(child.id, 'age', age)}
                >
                  <Text
                    style={[
                      styles.ageButtonText,
                      child.age === age && styles.ageButtonTextSelected,
                    ]}
                  >
                    {age}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {children.length > 1 && (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeChild(child.id)}
            >
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <TouchableOpacity style={styles.addButton} onPress={addChild}>
        <Text style={styles.addButtonText}>+ Add Another Child</Text>
      </TouchableOpacity>

      <Button
        title="Continue"
        onPress={handleContinue}
        disabled={!canContinue}
        style={styles.continueButton}
      />
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
  childCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  ageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ageButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  ageButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  ageButtonText: {
    fontSize: 16,
    color: '#333',
  },
  ageButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  removeButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  removeButtonText: {
    color: '#FF3B30',
    fontSize: 14,
  },
  addButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  addButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    marginTop: 8,
  },
});
