import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DistarCard } from '@/data/distarCards';
import { audioPlayer } from '@/services/audio/audioPlayer';

interface WordDisplayProps {
  word: string;
  phonemes: string[];
  distarCard?: DistarCard; // Optional DISTAR card with orthography data
  onPhonemeTap?: (index: number, phoneme: string) => void;
}

export default function WordDisplay({ word, phonemes, distarCard, onPhonemeTap }: WordDisplayProps) {
  const displayText = distarCard?.display || word;
  const orthography = distarCard?.orthography || {
    macrons: [],
    small: [],
    balls: [],
    arrows: [],
  };

  // Render word with DISTAR orthography
  const renderWordWithOrthography = () => {
    const elements: JSX.Element[] = [];
    let charIndex = 0;

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
    <View style={styles.container}>
      <View style={styles.wordContainer}>
        {renderWordWithOrthography()}
      </View>
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








