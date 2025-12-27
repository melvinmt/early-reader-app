import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, FlatList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createChild, createParent, getParent } from '@/services/storage';
import { Child, Parent } from '@/types/database';
import Button from '@/components/ui/Button';

interface ChildForm {
  id: string;
  name: string;
  birthMonth: number | null;
  birthYear: number | null;
}

interface AddChildrenScreenProps {
  onComplete?: () => void;
  asModal?: boolean;
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

// Generate year options (current year back to 10 years ago)
const getYearOptions = (): { value: number; label: string }[] => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i <= 10; i++) {
    years.push({ value: currentYear - i, label: (currentYear - i).toString() });
  }
  return years;
};

// Calculate age from birth month and year
const calculateAge = (birthMonth: number, birthYear: number): number => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // getMonth() returns 0-11
  
  let age = currentYear - birthYear;
  
  // If birthday hasn't occurred this year yet (current month is before birth month), subtract 1
  if (currentMonth < birthMonth) {
    age--;
  }
  
  return age;
};

// Dropdown component for month/year selection
interface DropdownProps {
  value: number | null;
  options: { value: number; label: string }[];
  placeholder: string;
  onSelect: (value: number) => void;
}

function Dropdown({ value, options, placeholder, onSelect }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setIsOpen(true)}
      >
        <Text style={[styles.dropdownButtonText, !value && styles.dropdownPlaceholder]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.dropdownModal}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    value === item.value && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    onSelect(item.value);
                    setIsOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      value === item.value && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export default function AddChildrenScreen({ onComplete, asModal = false }: AddChildrenScreenProps) {
  const [children, setChildren] = useState<ChildForm[]>([
    { id: generateId(), name: '', birthMonth: null, birthYear: null },
  ]);
  const [saving, setSaving] = useState(false);
  const yearOptions = getYearOptions();

  function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  const handleAddChild = () => {
    setChildren([...children, { id: generateId(), name: '', birthMonth: null, birthYear: null }]);
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

  const handleBirthMonthChange = (id: string, month: number) => {
    setChildren(
      children.map((child) => (child.id === id ? { ...child, birthMonth: month } : child))
    );
  };

  const handleBirthYearChange = (id: string, year: number) => {
    setChildren(
      children.map((child) => (child.id === id ? { ...child, birthYear: year } : child))
    );
  };

  const canContinue = () => {
    return children.some((child) => 
      child.name.trim() && child.birthMonth !== null && child.birthYear !== null
    );
  };

  const handleContinue = async () => {
    if (!canContinue()) {
      Alert.alert('Error', 'Please add at least one child with a name, birth month, and birth year');
      return;
    }

    setSaving(true);
    try {
      // Ensure default parent exists before creating children
      const defaultParentId = 'default-parent';
      const existingParent = await getParent(defaultParentId);
      
      if (!existingParent) {
        const defaultParent: Parent = {
          id: defaultParentId,
          email: 'default@earlyreader.app',
          created_at: new Date().toISOString(),
          subscription_status: 'none',
          settings: '{}',
        };
        await createParent(defaultParent);
      }

      const validChildren = children.filter(
        (child) => child.name.trim() && child.birthMonth !== null && child.birthYear !== null
      );

      for (const childForm of validChildren) {
        // Calculate age from birth month and year
        const age = calculateAge(childForm.birthMonth!, childForm.birthYear!);
        
        const child: Child = {
          id: generateId(),
          parent_id: defaultParentId,
          name: childForm.name.trim(),
          age: age,
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

  const scrollContent = (
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

          <Text style={styles.birthLabel}>Birth Month</Text>
          <Dropdown
            value={child.birthMonth}
            options={MONTHS}
            placeholder="Select month"
            onSelect={(month) => handleBirthMonthChange(child.id, month)}
          />

          <Text style={styles.birthLabel}>Birth Year</Text>
          <Dropdown
            value={child.birthYear}
            options={yearOptions}
            placeholder="Select year"
            onSelect={(year) => handleBirthYearChange(child.id, year)}
          />
          
          {child.birthMonth !== null && child.birthYear !== null && (
            <Text style={styles.calculatedAge}>
              Age: {calculateAge(child.birthMonth, child.birthYear)} years old
            </Text>
          )}
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
        <SafeAreaView style={styles.modalOverlay} edges={['top', 'bottom']}>
          <View style={styles.modalContent}>
            {scrollContent}
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {scrollContent}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
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
    maxHeight: '85%',
    flex: 0,
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
  birthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownPlaceholder: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '80%',
    maxHeight: '60%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  calculatedAge: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
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









