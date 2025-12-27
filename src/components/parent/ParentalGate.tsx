import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native';
import Button from '@/components/ui/Button';

interface ParentalGateProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ParentalGate({ visible, onSuccess, onCancel }: ParentalGateProps) {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [options, setOptions] = useState<number[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      generateProblem();
    }
  }, [visible]);

  const generateProblem = () => {
    // Generate two 2-digit numbers
    const n1 = Math.floor(Math.random() * 90) + 10; // 10-99
    const n2 = Math.floor(Math.random() * 90) + 10; // 10-99
    const answer = n1 + n2;

    setNum1(n1);
    setNum2(n2);
    setCorrectAnswer(answer);

    // Generate 3 wrong answers
    const wrongAnswers = new Set<number>();
    while (wrongAnswers.size < 3) {
      const wrong = answer + Math.floor(Math.random() * 20) - 10; // ±10 from correct
      if (wrong !== answer && wrong > 0) {
        wrongAnswers.add(wrong);
      }
    }

    // Combine correct and wrong answers, then shuffle
    const allOptions = [answer, ...Array.from(wrongAnswers)];
    const shuffled = allOptions.sort(() => Math.random() - 0.5);
    setOptions(shuffled);
    setError('');
  };

  const handleAnswer = (selected: number) => {
    if (selected === correctAnswer) {
      // Brief delay before unlocking
      setTimeout(() => {
        onSuccess();
      }, 300);
    } else {
      setError('Incorrect. Please try again.');
      // Regenerate problem after a short delay
      setTimeout(() => {
        generateProblem();
      }, 1000);
    }
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
          <Text style={styles.subtitle}>Please solve this to continue</Text>

          <View style={styles.problemContainer}>
            <Text style={styles.problem}>
              {num1} + {num2} = ?
            </Text>
          </View>

          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : null}

          <View style={styles.optionsContainer}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.optionButton}
                onPress={() => handleAnswer(option)}
              >
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button
            title="Cancel"
            onPress={onCancel}
            variant="outline"
            style={styles.cancelButton}
          />
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
  problemContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  problem: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  error: {
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  optionButton: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
  },
  optionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007AFF',
  },
  cancelButton: {
    marginTop: 8,
  },
});













