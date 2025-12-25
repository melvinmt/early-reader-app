import { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface WordSwipeDetectorProps {
  word: string;
  phonemes: string[];
  onLetterEnter: (index: number) => void;
  onSwipeComplete: (success: boolean) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WordSwipeDetector({
  word,
  phonemes,
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

  const panGesture = Gesture.Pan()
    .onStart((event) => {
      startX.value = event.x;
      translateX.value = event.x;
    })
    .onUpdate((event) => {
      translateX.value = event.x;

      // Determine which letter zone we're in
      const letterIndex = Math.floor((event.x - letterWidth) / letterWidth);
      if (letterIndex >= 0 && letterIndex < word.length) {
        // Use runOnJS to safely update React state from gesture handler
        // Check against ref value (not React state) to avoid crashes
        if (letterIndex >= currentLetterIndexRef.current) {
          runOnJS(updateLetterState)(letterIndex);
        }
      }
    })
    .onEnd(() => {
      // Reset animation first
      translateX.value = withSpring(0);
      
      // Use runOnJS to safely access refs and call callbacks
      runOnJS(() => {
        // Capture values from refs (safe to access in JS context)
        const visitedSet = new Set(visitedLettersRef.current);
        const allVisited = visitedSet.size === word.length;
        const visitedArray = Array.from(visitedSet).sort((a, b) => a - b);
        const inOrder = visitedArray.every((val, idx) => val === idx);
        
        // Reset state
        setVisitedLetters(new Set());
        setCurrentLetterIndex(-1);
        currentLetterIndexRef.current = -1;
        visitedLettersRef.current = new Set();
        
        // Call completion handler
        handleSwipeComplete(allVisited && inOrder);
      })();
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value - startX.value }],
    };
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
        <Animated.View style={[styles.swipeArea, animatedStyle]}>
          <Text style={styles.swipeHint}>Swipe under the word</Text>
        </Animated.View>
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
  },
  letterZone: {
    alignItems: 'center',
    padding: 8,
  },
  letterZoneActive: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  letterZoneVisited: {
    backgroundColor: '#C8E6C9',
    borderRadius: 8,
  },
  letter: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  letterVisited: {
    color: '#4CAF50',
  },
  guide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guideDot: {
    fontSize: 12,
    color: '#666',
  },
  guideArrow: {
    fontSize: 12,
    color: '#666',
  },
  swipeArea: {
    height: 60,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeHint: {
    fontSize: 14,
    color: '#666',
  },
});








