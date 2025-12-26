import { View, Text, StyleSheet, Pressable } from 'react-native';
import { DistarCard } from '@/data/distarCards';
import { audioPlayer } from '@/services/audio/audioPlayer';
import { isTablet, responsiveFontSize, responsiveSpacing } from '@/utils/responsive';

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
  const isTabletDevice = isTablet();

  const handleWordPress = () => {
    if (onWordTap) {
      onWordTap();
    } else if (distarCard?.audioPath) {
      audioPlayer.playSoundFromAsset(distarCard.audioPath).catch(console.error);
    }
  };

  // Dynamic font sizes based on device
  const wordFontSize = isTabletDevice ? 96 : 72;
  const sentenceFontSize = isTabletDevice ? 48 : 36;

  return (
    <Pressable onPress={handleWordPress} style={styles.wordPressable}>
      {isSentence ? (
        // Sentence display - show words with proper spacing
        <View style={styles.sentenceContainer}>
          {words.map((w, index) => (
            <Text 
              key={index} 
              style={[styles.sentenceWord, { fontSize: sentenceFontSize }]}
            >
              {w}{index < words.length - 1 ? ' ' : ''}
            </Text>
          ))}
        </View>
      ) : (
        // Single word/letter display - large centered
        <Text style={[styles.wordText, { fontSize: wordFontSize }]}>{displayText}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wordPressable: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: responsiveSpacing(24),
    minHeight: isTablet() ? 150 : 100,
  },
  wordText: {
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
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginHorizontal: isTablet() ? 8 : 4,
    marginVertical: isTablet() ? 8 : 4,
  },
});
