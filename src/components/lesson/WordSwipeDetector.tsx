import { useRef, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { DistarCard } from '@/data/distarCards';
import { isTablet } from '@/utils/responsive';

interface WordSwipeDetectorProps {
  word: string;
  phonemes: string[];
  distarCard?: DistarCard;
  onLetterEnter: (index: number) => void;
  onSwipeStart?: () => void;
  onSwipeComplete: (success: boolean) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Time to fill the progress bar when holding still (in ms)
const HOLD_FILL_DURATION = 2000; // 2 seconds to complete when just holding
const UPDATE_INTERVAL = 16; // ~60fps

export default function WordSwipeDetector({
  word,
  phonemes,
  distarCard,
  onLetterEnter,
  onSwipeStart,
  onSwipeComplete,
}: WordSwipeDetectorProps) {
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const isMountedRef = useRef(true);
  const onSwipeCompleteRef = useRef(onSwipeComplete);
  const onSwipeStartRef = useRef(onSwipeStart);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdProgressRef = useRef(0); // Progress from holding
  const swipeProgressRef = useRef(0); // Progress from swiping
  const startX = useSharedValue(0);

  useEffect(() => {
    onSwipeCompleteRef.current = onSwipeComplete;
    onSwipeStartRef.current = onSwipeStart;
  }, [onSwipeComplete, onSwipeStart]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Update displayed progress (max of swipe and hold progress)
  const updateDisplayedProgress = useCallback(() => {
    if (!isMountedRef.current) return;
    const combinedProgress = Math.max(holdProgressRef.current, swipeProgressRef.current);
    setSwipeProgress(Math.min(1, combinedProgress));
    
    // Auto-complete when reaching 100%
    if (combinedProgress >= 1) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      handleComplete(true);
    }
  }, []);

  // Start tracking when finger touches down
  const handleStart = useCallback(() => {
    if (!isMountedRef.current) return;
    
    // Call onSwipeStart callback if provided (e.g., to stop prompt audio)
    if (onSwipeStartRef.current) {
      onSwipeStartRef.current();
    }
    
    setIsActive(true);
    holdProgressRef.current = 0;
    swipeProgressRef.current = 0;
    setSwipeProgress(0);
    
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Start auto-filling progress (for hold-to-complete)
    const incrementPerUpdate = UPDATE_INTERVAL / HOLD_FILL_DURATION;
    
    intervalRef.current = setInterval(() => {
      if (!isMountedRef.current) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      
      holdProgressRef.current = Math.min(1, holdProgressRef.current + incrementPerUpdate);
      updateDisplayedProgress();
    }, UPDATE_INTERVAL);
  }, [updateDisplayedProgress]);

  // Update swipe progress based on finger movement
  const handleSwipeUpdate = useCallback((progress: number) => {
    if (!isMountedRef.current) return;
    swipeProgressRef.current = Math.max(0, progress);
    updateDisplayedProgress();
  }, [updateDisplayedProgress]);

  // Handle gesture end
  const handleEnd = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (!isMountedRef.current) return;
    
    const finalProgress = Math.max(holdProgressRef.current, swipeProgressRef.current);
    const success = finalProgress >= 0.8; // 80% = success
    
    handleComplete(success);
  }, []);

  const handleComplete = useCallback((success: boolean) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setIsActive(false);
    setSwipeProgress(0);
    holdProgressRef.current = 0;
    swipeProgressRef.current = 0;
    
    setTimeout(() => {
      if (isMountedRef.current && onSwipeCompleteRef.current) {
        onSwipeCompleteRef.current(success);
      }
    }, 0);
  }, []);

  // Pan gesture for swiping
  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(10) // Allow multiple fingers
    .minDistance(0) // Start immediately
    .onStart((event) => {
      startX.value = event.absoluteX;
      runOnJS(handleStart)();
    })
    .onUpdate((event) => {
      // Calculate swipe progress based on horizontal movement
      const distance = event.absoluteX - startX.value;
      const maxDistance = SCREEN_WIDTH - 100; // Account for padding
      const progress = distance / maxDistance;
      runOnJS(handleSwipeUpdate)(progress);
    })
    .onEnd(() => {
      runOnJS(handleEnd)();
    })
    .onFinalize(() => {
      runOnJS(handleEnd)();
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

const isTabletDevice = isTablet();

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  swipeArea: {
    width: '100%',
    minHeight: isTabletDevice ? 60 : 40,
    paddingVertical: isTabletDevice ? 12 : 8,
  },
  progressTrack: {
    height: isTabletDevice ? 60 : 40,
    backgroundColor: '#e0e0e0',
    borderRadius: isTabletDevice ? 30 : 20,
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
