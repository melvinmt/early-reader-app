import { useRef, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { DistarCard } from '@/data/distarCards';

interface WordSwipeDetectorProps {
  word: string;
  phonemes: string[];
  distarCard?: DistarCard;
  onLetterEnter: (index: number) => void;
  onSwipeComplete: (success: boolean) => void;
}

// Time to fill the progress bar (in ms)
const FILL_DURATION = 1500; // 1.5 seconds to complete
const UPDATE_INTERVAL = 16; // ~60fps

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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef(0);

  useEffect(() => {
    onSwipeCompleteRef.current = onSwipeComplete;
  }, [onSwipeComplete]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Start auto-filling progress while finger is held down
  const startAutoFill = useCallback(() => {
    if (!isMountedRef.current) return;
    
    setIsActive(true);
    progressRef.current = 0;
    setSwipeProgress(0);
    
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Start filling progress automatically
    const incrementPerUpdate = UPDATE_INTERVAL / FILL_DURATION;
    
    intervalRef.current = setInterval(() => {
      if (!isMountedRef.current) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      
      progressRef.current = Math.min(1, progressRef.current + incrementPerUpdate);
      setSwipeProgress(progressRef.current);
      
      // Auto-complete when reaching 100%
      if (progressRef.current >= 1) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        handleComplete(true);
      }
    }, UPDATE_INTERVAL);
  }, []);

  // Stop auto-filling when finger is lifted
  const stopAutoFill = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (!isMountedRef.current) return;
    
    const finalProgress = progressRef.current;
    const success = finalProgress >= 0.8; // 80% = success
    
    handleComplete(success);
  }, []);

  const handleComplete = useCallback((success: boolean) => {
    setIsActive(false);
    setSwipeProgress(0);
    progressRef.current = 0;
    
    setTimeout(() => {
      if (isMountedRef.current && onSwipeCompleteRef.current) {
        onSwipeCompleteRef.current(success);
      }
    }, 0);
  }, []);

  // Use a combined gesture that works with touch down/up
  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(10) // Allow multiple fingers
    .minDistance(0) // Start immediately on touch
    .onStart(() => {
      runOnJS(startAutoFill)();
    })
    .onEnd(() => {
      runOnJS(stopAutoFill)();
    })
    .onFinalize(() => {
      runOnJS(stopAutoFill)();
    });

  // Also support simple tap and hold with long press
  const longPressGesture = Gesture.LongPress()
    .minDuration(0) // Start immediately
    .maxDistance(100) // Allow some movement
    .onStart(() => {
      runOnJS(startAutoFill)();
    })
    .onEnd(() => {
      runOnJS(stopAutoFill)();
    });

  // Combine both gestures - either works
  const combinedGesture = Gesture.Race(panGesture, longPressGesture);

  // Calculate progress bar width
  const progressWidth = `${Math.min(100, swipeProgress * 100)}%`;

  return (
    <View style={styles.container}>
      <GestureDetector gesture={combinedGesture}>
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
