import { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { DistarCard } from '@/data/distarCards';
import { audioPlayer } from '@/services/audio/audioPlayer';

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
    
    // Don't play audio here - it will be played in the sequence by LearningScreen
    // Sequence: great-job.mp3 → 1s delay → audio.mp3
    
    setIsActive(false);
    setSwipeProgress(0);
    
    setTimeout(() => {
      if (isMountedRef.current && onSwipeCompleteRef.current) {
        onSwipeCompleteRef.current(success);
      }
    }, 0);
  };

  const panGesture = Gesture.Pan()
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
          
          {/* Swipe instruction */}
          <View style={styles.swipeContent}>
            <Text style={styles.swipeIcon}>👉</Text>
            <Text style={styles.swipeText}>
              {isActive ? 'Keep going!' : 'Swipe right to reveal'}
            </Text>
            <Text style={styles.swipeIcon}>✨</Text>
          </View>
        </View>
      </GestureDetector>

      {/* Long press hint */}
      <Pressable 
        onLongPress={() => {
          if (distarCard?.soundedOutPath) {
            audioPlayer.playSoundFromAsset(distarCard.soundedOutPath).catch(console.error);
          }
        }}
        delayLongPress={500}
      >
        <Text style={styles.longPressHint}>Long press to hear it sounded out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 24,
  },
  swipeArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressFillActive: {
    backgroundColor: '#2E7D32',
  },
  swipeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  swipeIcon: {
    fontSize: 24,
  },
  swipeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  longPressHint: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
