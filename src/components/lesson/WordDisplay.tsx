import { View, Text, StyleSheet } from 'react-native';

interface WordDisplayProps {
  word: string;
  phonemes: string[];
}

export default function WordDisplay({ word, phonemes }: WordDisplayProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.word}>{word}</Text>
      <View style={styles.phonemesContainer}>
        {phonemes.map((phoneme, index) => (
          <View key={index} style={styles.phoneme}>
            <Text style={styles.phonemeText}>{phoneme}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 24,
  },
  word: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  phonemesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  phoneme: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  phonemeText: {
    fontSize: 16,
    color: '#666',
  },
});




