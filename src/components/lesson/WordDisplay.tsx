import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { DistarCard } from '@/data/distarCards';
import { audioPlayer } from '@/services/audio/audioPlayer';

interface WordDisplayProps {
  word: string;
  phonemes: string[];
  distarCard?: DistarCard; // Optional DISTAR card with orthography data
  onPhonemeTap?: (index: number, phoneme: string) => void;
  onWordTap?: () => void; // Called when tapping on the word to hear audio
  style?: object; // Additional container styles
}

export default function WordDisplay({ 
  word, 
  phonemes, 
  distarCard, 
  onPhonemeTap,
  onWordTap,
  style,
}: WordDisplayProps) {
  const displayText = distarCard?.display || word;
  const orthography = distarCard?.orthography || {
    macrons: [],
    small: [],
    balls: [],
    arrows: [],
  };

  const handleWordPress = () => {
    if (onWordTap) {
      onWordTap();
    } else if (distarCard?.audioPath) {
      // Default: play the word audio
      audioPlayer.playSoundFromAsset(distarCard.audioPath).catch(console.error);
    }
  };

  // Render word with DISTAR orthography
  const renderWordWithOrthography = () => {
    const elements: JSX.Element[] = [];

    // Split display text into characters, handling multi-character phonemes
    const chars = displayText.split('');
    
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const isSmall = orthography.small.includes(i);
      const hasMacron = orthography.macrons.includes(i);
      const hasBall = orthography.balls.includes(i);
      const hasArrow = orthography.arrows.includes(i);
      
      // Find corresponding phoneme for this character
      const phonemeIndex = phonemes.findIndex((p, idx) => {
        // Simple matching - in production, use proper phoneme-to-character mapping
        return displayText.substring(0, i + 1).includes(p);
      });
      const phoneme = phonemeIndex >= 0 ? phonemes[phonemeIndex] : char;
      
      elements.push(
        <TouchableOpacity
          key={i}
          style={styles.letterContainer}
          onPress={() => {
            if (onPhonemeTap) {
              onPhonemeTap(phonemeIndex >= 0 ? phonemeIndex : i, phoneme);
            } else if (distarCard?.phonemeAudioPaths?.[phonemeIndex]) {
              // Play phoneme audio
              audioPlayer.playSoundFromAsset(distarCard.phonemeAudioPaths[phonemeIndex]);
            }
          }}
        >
          <View style={styles.letterWrapper}>
            <Text style={[
              styles.letter,
              isSmall && styles.smallLetter,
            ]}>
              {char}
            </Text>
            {hasMacron && (
              <View style={styles.macronLine} />
            )}
          </View>
          <View style={styles.indicators}>
            {hasBall && <Text style={styles.ball}>●</Text>}
            {hasArrow && <Text style={styles.arrow}>→</Text>}
          </View>
        </TouchableOpacity>
      );
    }

    return elements;
  };

  return (
    <View style={[styles.container, style]}>
      <Pressable onPress={handleWordPress}>
        <View style={styles.wordContainer}>
          {renderWordWithOrthography()}
        </View>
      </Pressable>
      {phonemes.length > 0 && (
        <View style={styles.phonemesContainer}>
          {phonemes.map((phoneme, index) => (
            <View key={index} style={styles.phoneme}>
              <Text style={styles.phonemeText}>{phoneme}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 24,
  },
  wordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  letterContainer: {
    alignItems: 'center',
    marginHorizontal: 4,
    padding: 8,
  },
  letterWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
  },
  smallLetter: {
    fontSize: 24,
    opacity: 0.6,
  },
  macronLine: {
    position: 'absolute',
    top: -4,
    left: -2,
    right: -2,
    height: 2,
    backgroundColor: '#333',
  },
  indicators: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    minHeight: 16,
  },
  ball: {
    fontSize: 12,
    color: '#666',
    marginRight: 2,
  },
  arrow: {
    fontSize: 12,
    color: '#666',
  },
  phonemesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  phoneme: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
