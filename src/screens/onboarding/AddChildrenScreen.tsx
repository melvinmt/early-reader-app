import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { createChild } from '@/services/storage';
import { Child } from '@/types/database';
import Button from '@/components/ui/Button';

interface ChildForm {
  id: string;
  name: string;
  age: number | null;
}

interface AddChildrenScreenProps {
  onComplete?: () => void;
  asModal?: boolean;
}

const AGE_OPTIONS = [3, 4, 5, 6, 7, 8];

export default function AddChildrenScreen({ onComplete, asModal = false }: AddChildrenScreenProps) {
  const [children, setChildren] = useState<ChildForm[]>([
    { id: generateId(), name: '', age: null },
  ]);
  const [saving, setSaving] = useState(false);

  function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  const handleAddChild = () => {
    setChildren([...children, { id: generateId(), name: '', age: null }]);
  };

  const handleRemoveChild = (id: string) => {
    if (children.length > 1) {
      setChildren(children.filter((child) => child.id !== id));
    }
  };

  const handleNameChange = (id: string, name: string) => {
    setChildren(
      children.map((child) => (child.id === id ? { ...child, name } : child))
    );
  };

  const handleAgeChange = (id: string, age: number) => {
    setChildren(
      children.map((child) => (child.id === id ? { ...child, age } : child))
    );
  };

  const canContinue = () => {
    return children.some((child) => child.name.trim() && child.age !== null);
  };

  const handleContinue = async () => {
    if (!canContinue()) {
      Alert.alert('Error', 'Please add at least one child with a name and age');
      return;
    }

    setSaving(true);
    try {
      // Save all children with valid names
      // Use a default parent_id since we're not using auth anymore
      const defaultParentId = 'default-parent';
      const validChildren = children.filter(
        (child) => child.name.trim() && child.age !== null
      );

      for (const childForm of validChildren) {
        const child: Child = {
          id: generateId(),
          parent_id: defaultParentId,
          name: childForm.name.trim(),
          age: childForm.age!,
          created_at: new Date().toISOString(),
          current_level: 1,
          total_cards_completed: 0,
        };

        await createChild(child);
      }

      // Call onComplete callback if provided
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error saving children:', error);
      Alert.alert('Error', 'Failed to save children. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Your Children</Text>
        {asModal && (
          <TouchableOpacity onPress={() => onComplete?.()} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.subtitle}>
        Add one or more children to get started with Early Reader
      </Text>

      {children.map((child, index) => (
        <View key={child.id} style={styles.childForm}>
          <View style={styles.childHeader}>
            <Text style={styles.childLabel}>Child {index + 1}</Text>
            {children.length > 1 && (
              <TouchableOpacity
                onPress={() => handleRemoveChild(child.id)}
                style={styles.removeButton}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Child's name"
            placeholderTextColor="#999"
            value={child.name}
            onChangeText={(name) => handleNameChange(child.id, name)}
            autoCapitalize="words"
          />

          <Text style={styles.ageLabel}>Age</Text>
          <View style={styles.ageContainer}>
            {AGE_OPTIONS.map((age) => (
              <TouchableOpacity
                key={age}
                style={[
                  styles.ageButton,
                  child.age === age && styles.ageButtonSelected,
                ]}
                onPress={() => handleAgeChange(child.id, age)}
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
      ))}

      <TouchableOpacity style={styles.addButton} onPress={handleAddChild}>
        <Text style={styles.addButtonText}>+ Add Another Child</Text>
      </TouchableOpacity>

      <Button
        title="Continue"
        onPress={handleContinue}
        variant="primary"
        style={styles.continueButton}
        disabled={!canContinue() || saving}
      />
    </ScrollView>
  );

  if (asModal) {
    return (
      <Modal
        visible={true}
        transparent
        animationType="slide"
        onRequestClose={() => onComplete?.()}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {content}
          </View>
        </View>
      </Modal>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxHeight: '90%',
    overflow: 'hidden',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  childForm: {
    marginBottom: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
  },
  childHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  childLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  removeButtonText: {
    color: '#FF3B30',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  ageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  ageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ageButton: {
    minWidth: 50,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  ageButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  ageButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  ageButtonTextSelected: {
    color: '#fff',
  },
  addButton: {
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
    marginBottom: 16,
  },
});









