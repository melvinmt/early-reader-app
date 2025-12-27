import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity } from 'react-native';
import Button from '@/components/ui/Button';

interface ParentalGateProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ParentalGate({ visible, onSuccess, onCancel }: ParentalGateProps) {
  const [birthYear, setBirthYear] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setBirthYear('');
      setError('');
    }
  }, [visible]);

  const handleSubmit = () => {
    const year = parseInt(birthYear, 10);
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 100; // Allow up to 100 years old
    const maxYear = currentYear - 18; // Must be at least 18 years old

    if (!birthYear.trim()) {
      setError('Please enter your birth year');
      return;
    }

    if (isNaN(year) || year < minYear || year > maxYear) {
      setError('Please enter a valid birth year');
      return;
    }

    // If we get here, the birth year is valid
    setTimeout(() => {
      onSuccess();
    }, 300);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Parental Gate</Text>
          <Text style={styles.subtitle}>Please enter your birth year to continue</Text>

          <TextInput
            style={styles.input}
            placeholder="YYYY"
            placeholderTextColor="#999"
            value={birthYear}
            onChangeText={(text) => {
              setBirthYear(text.replace(/\D/g, '').slice(0, 4));
              setError('');
            }}
            keyboardType="numeric"
            maxLength={4}
            autoFocus
          />

          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : null}

          <View style={styles.buttonContainer}>
            <Button
              title="Continue"
              onPress={handleSubmit}
              variant="primary"
              style={styles.submitButton}
            />
            <Button
              title="Cancel"
              onPress={onCancel}
              variant="outline"
              style={styles.cancelButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: '#fff',
    fontWeight: '600',
  },
  error: {
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  },
  buttonContainer: {
    gap: 12,
  },
  submitButton: {
    marginBottom: 0,
  },
  cancelButton: {
    marginTop: 0,
  },
});














