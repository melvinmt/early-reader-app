import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { DistarCard } from '@/data/distarCards';
import { audioPlayer } from '@/services/audio/audioPlayer';

interface WordDisplayProps {
  word: string;
  phonemes: string[];
  distarCard?: DistarCard;
  onWordTap?: () => void;
  style?: object;
}

export default function WordDisplay({ 
  word, 
  phonemes, 
  distarCard, 
  onWordTap,
  style,
}: WordDisplayProps) {
  const displayText = distarCard?.display || word;
  const isSentence = displayText.includes(' ');
  const words = isSentence ? displayText.split(' ') : [displayText];

  const handleWordPress = () => {
    if (onWordTap) {
      onWordTap();
    } else if (distarCard?.audioPath) {
      audioPlayer.playSoundFromAsset(distarCard.audioPath).catch(console.error);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <Pressable onPress={handleWordPress} style={styles.pressable}>
        <View style={styles.card}>
          {isSentence ? (
            // Sentence display - show words with proper spacing
            <View style={styles.sentenceContainer}>
              {words.map((w, index) => (
                <Text key={index} style={styles.sentenceWord}>
                  {w}{index < words.length - 1 ? ' ' : ''}
                </Text>
              ))}
            </View>
          ) : (
            // Single word/letter display - large centered
            <Text style={styles.wordText}>{displayText}</Text>
          )}
          
          <Text style={styles.tapHint}>👆 Tap to hear</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  pressable: {
    width: '100%',
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  wordText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#1a1a1a',
    letterSpacing: 4,
  },
  sentenceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sentenceWord: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginHorizontal: 4,
    marginVertical: 4,
  },
  tapHint: {
    marginTop: 16,
    fontSize: 14,
    color: '#888',
  },
});
