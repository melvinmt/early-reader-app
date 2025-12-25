import { View, Text, StyleSheet, Pressable } from 'react-native';
import { DistarCard } from '@/data/distarCards';
import { audioPlayer } from '@/services/audio/audioPlayer';

interface WordDisplayProps {
  word: string;
  phonemes: string[];
  distarCard?: DistarCard;
  onWordTap?: () => void;
}

export default function WordDisplay({ 
  word, 
  phonemes, 
  distarCard, 
  onWordTap,
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
    <Pressable onPress={handleWordPress} style={styles.wordPressable}>
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wordPressable: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
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
});
