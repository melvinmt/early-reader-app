import { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { DistarCard } from '@/data/distarCards';

interface WordSwipeDetectorProps {
  word: string;
  phonemes: string[];
  distarCard?: DistarCard;
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
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const isMountedRef = useRef(true);
  const onSwipeCompleteRef = useRef(onSwipeComplete);
  const startX = useSharedValue(0);

  useEffect(() => {
    onSwipeCompleteRef.current = onSwipeComplete;
  }, [onSwipeComplete]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const updateProgress = (progress: number) => {
    if (!isMountedRef.current) return;
    setSwipeProgress(Math.min(1, Math.max(0, progress)));
  };

  const handleSwipeStart = () => {
    if (!isMountedRef.current) return;
    setIsActive(true);
  };

  const handleSwipeEnd = (finalProgress: number) => {
    if (!isMountedRef.current) return;
    
    const success = finalProgress >= 0.8; // 80% swipe = success
    
    setIsActive(false);
    setSwipeProgress(0);
    
    setTimeout(() => {
      if (isMountedRef.current && onSwipeCompleteRef.current) {
        onSwipeCompleteRef.current(success);
      }
    }, 0);
  };

  const panGesture = Gesture.Pan()
    .minPointers(1) // Allow single finger
    .maxPointers(10) // Allow up to 10 fingers (for kids with multiple fingers on screen)
    .activeOffsetX(10) // Start after 10px horizontal movement
    .failOffsetY(50) // Fail if vertical movement exceeds 50px
    .onStart((event) => {
      startX.value = event.absoluteX;
      runOnJS(handleSwipeStart)();
    })
    .onUpdate((event) => {
      const distance = event.absoluteX - startX.value;
      const maxDistance = SCREEN_WIDTH - 80; // Account for padding
      const progress = distance / maxDistance;
      runOnJS(updateProgress)(progress);
    })
    .onEnd(() => {
      runOnJS(handleSwipeEnd)(swipeProgress);
    });

  // Calculate progress bar width
  const progressWidth = `${Math.min(100, swipeProgress * 100)}%`;

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <View style={styles.swipeArea}>
          {/* Progress track */}
          <View style={styles.progressTrack}>
            <View 
              style={[
                styles.progressFill, 
                { width: progressWidth as any },
                isActive && styles.progressFillActive
              ]} 
            />
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  swipeArea: {
    width: '100%',
    minHeight: 40,
    paddingVertical: 8,
  },
  progressTrack: {
    height: 40,
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressFillActive: {
    backgroundColor: '#2E7D32',
  },
});
