import { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { DistarCard } from '@/data/distarCards';
import { audioPlayer } from '@/services/audio/audioPlayer';

interface WordSwipeDetectorProps {
  word: string;
  phonemes: string[];
  distarCard?: DistarCard; // Optional DISTAR card with audio paths
  onLetterEnter: (index: number) => void;
  onSwipeComplete: (success: boolean) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WordSwipeDetector({
  word,
  phonemes,
  distarCard,
  onLetterEnter,
  onSwipeComplete,
}: WordSwipeDetectorProps) {
  const [visitedLetters, setVisitedLetters] = useState<Set<number>>(new Set());
  const [currentLetterIndex, setCurrentLetterIndex] = useState<number>(-1);
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);
  const isMountedRef = useRef(true);
  const onSwipeCompleteRef = useRef(onSwipeComplete);
  const onLetterEnterRef = useRef(onLetterEnter);
  
  // Use refs to track state that needs to be accessed in gesture handlers
  const currentLetterIndexRef = useRef(-1);
  const visitedLettersRef = useRef<Set<number>>(new Set());

  // Update refs when callbacks change
  useEffect(() => {
    onSwipeCompleteRef.current = onSwipeComplete;
    onLetterEnterRef.current = onLetterEnter;
  }, [onSwipeComplete, onLetterEnter]);

  // Sync refs with state
  useEffect(() => {
    currentLetterIndexRef.current = currentLetterIndex;
  }, [currentLetterIndex]);

  useEffect(() => {
    visitedLettersRef.current = visitedLetters;
  }, [visitedLetters]);

  // Track mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const letterWidth = SCREEN_WIDTH / (word.length + 2); // Add padding

  // Helper to update letter state (called from gesture handler via runOnJS)
  const updateLetterState = (index: number) => {
    if (!isMountedRef.current) return;
    
    if (index >= currentLetterIndexRef.current) {
      setCurrentLetterIndex(index);
      if (!visitedLettersRef.current.has(index)) {
        setVisitedLetters((prev) => {
          const newSet = new Set([...prev, index]);
          visitedLettersRef.current = newSet;
          return newSet;
        });
        onLetterEnterRef.current?.(index);
        
        // Play phoneme audio if available
        if (distarCard?.phonemeAudioPaths?.[index]) {
          audioPlayer.playSoundFromAsset(distarCard.phonemeAudioPaths[index]).catch(console.error);
        } else if (phonemes[index]) {
          // Fallback: play phoneme by symbol
          audioPlayer.playPhoneme(phonemes[index]).catch(console.error);
        }
      }
    }
  };

  // Deferred callback to avoid crashing during gesture handling
  const handleSwipeComplete = (success: boolean) => {
    if (isMountedRef.current && onSwipeCompleteRef.current) {
      // Defer to next tick to avoid gesture system conflicts
      setTimeout(() => {
        if (isMountedRef.current && onSwipeCompleteRef.current) {
          onSwipeCompleteRef.current(success);
        }
      }, 0);
    }
  };

  // Helper to handle swipe end (called from gesture handler via runOnJS)
  const handleSwipeEnd = () => {
    if (!isMountedRef.current) return;
    
    // Capture values from refs (safe to access in JS context)
    const visitedSet = new Set(visitedLettersRef.current);
    const allVisited = visitedSet.size === word.length;
    const visitedArray = Array.from(visitedSet).sort((a, b) => a - b);
    const inOrder = visitedArray.every((val, idx) => val === idx);
    
    // Play full word audio on successful swipe
    if (allVisited && inOrder) {
      if (distarCard?.audioPath) {
        audioPlayer.playSoundFromAsset(distarCard.audioPath).catch(console.error);
      } else {
        // Fallback: play word
        audioPlayer.playWord(word).catch(console.error);
      }
    }
    
    // Reset state
    setVisitedLetters(new Set());
    setCurrentLetterIndex(-1);
    currentLetterIndexRef.current = -1;
    visitedLettersRef.current = new Set();
    
    // Call completion handler
    handleSwipeComplete(allVisited && inOrder);
  };
  
  // Handle long press for sounded-out version
  const handleLongPress = () => {
    if (distarCard?.soundedOutPath) {
      audioPlayer.playSoundFromAsset(distarCard.soundedOutPath).catch(console.error);
    } else {
      // Fallback: play sounded-out word
      audioPlayer.playWord(word, true).catch(console.error);
    }
  };

  const panGesture = Gesture.Pan()
    .onStart((event) => {
      startX.value = event.x;
      translateX.value = 0;
    })
    .onUpdate((event) => {
      translateX.value = event.x - startX.value;

      // Determine which letter zone we're in based on absolute position
      const letterIndex = Math.floor((event.x - letterWidth) / letterWidth);
      if (letterIndex >= 0 && letterIndex < word.length) {
        if (letterIndex >= currentLetterIndexRef.current) {
          runOnJS(updateLetterState)(letterIndex);
        }
      }
    })
    .onEnd(() => {
      translateX.value = 0;
      runOnJS(handleSwipeEnd)();
    });

  return (
    <View style={styles.container}>
      <View style={styles.wordContainer}>
        {word.split('').map((letter, index) => {
          const isVisited = visitedLetters.has(index);
          const isCurrent = currentLetterIndex === index;

          return (
            <View
              key={index}
              style={[
                styles.letterZone,
                { width: letterWidth },
                isCurrent && styles.letterZoneActive,
                isVisited && styles.letterZoneVisited,
              ]}
            >
              <Text style={[styles.letter, isVisited && styles.letterVisited]}>
                {letter}
              </Text>
              <View style={styles.guide}>
                <Text style={styles.guideDot}>●</Text>
                <Text style={styles.guideArrow}>→</Text>
              </View>
            </View>
          );
        })}
      </View>

      <GestureDetector gesture={panGesture}>
        <TouchableOpacity
          style={styles.swipeArea}
          onLongPress={handleLongPress}
          delayLongPress={500}
          activeOpacity={0.8}
        >
          <Text style={styles.swipeHint}>👆 Swipe under the letters</Text>
          <Text style={styles.swipeSubHint}>Long press to hear it sounded out</Text>
        </TouchableOpacity>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 16,
  },
  wordContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  letterZone: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  letterZoneActive: {
    backgroundColor: 'rgba(33, 150, 243, 0.3)',
  },
  letterZoneVisited: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  letter: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  letterVisited: {
    color: '#2E7D32',
  },
  guide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guideDot: {
    fontSize: 10,
    color: '#999',
  },
  guideArrow: {
    fontSize: 10,
    color: '#999',
    marginLeft: 2,
  },
  swipeArea: {
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  swipeHint: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
  swipeSubHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});
