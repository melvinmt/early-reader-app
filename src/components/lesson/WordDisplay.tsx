import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { DistarCard } from '@/data/distarCards';
import { audioPlayer } from '@/services/audio/audioPlayer';
import { isTablet, responsiveFontSize, responsiveSpacing } from '@/utils/responsive';

interface WordDisplayProps {
  word: string;
  phonemes: string[];
  distarCard?: DistarCard;
  onWordTap?: () => void;
  onHintUsed?: () => void;
}

const HOLD_DURATION_MS = 600; // 600ms hold to trigger hint

export default function WordDisplay({ 
  word, 
  phonemes, 
  distarCard, 
  onWordTap,
  onHintUsed,
}: WordDisplayProps) {
  const displayText = distarCard?.display || word;
  const isSentence = displayText.includes(' ');
  const words = isSentence ? displayText.split(' ') : [displayText];
  const isTabletDevice = isTablet();
  
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnimationRef = useRef(new Animated.Value(0)).current;
  const hasHint = distarCard?.audioPath;

  // Update visual progress indicator
  useEffect(() => {
    if (isHolding && hasHint) {
      // Animate progress from 0 to 1 over HOLD_DURATION_MS
      Animated.timing(progressAnimationRef, {
        toValue: 1,
        duration: HOLD_DURATION_MS,
        useNativeDriver: false,
      }).start();
      
      // Update progress state for display
      const interval = setInterval(() => {
        setHoldProgress((prev) => {
          const next = Math.min(1, prev + 0.05);
          return next;
        });
      }, HOLD_DURATION_MS / 20); // Update ~20 times during hold
      
      progressTimerRef.current = interval;
    } else {
      // Reset progress when not holding
      progressAnimationRef.setValue(0);
      setHoldProgress(0);
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    }
    
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, [isHolding, hasHint, progressAnimationRef]);

  const handlePressIn = () => {
    if (!hasHint) {
      // If no hint available, use old tap behavior
      if (onWordTap) {
        onWordTap();
      }
      return;
    }
    
    setIsHolding(true);
    setHoldProgress(0);
    
    // Start timer for hold completion
    holdTimerRef.current = setTimeout(() => {
      // Hold completed - trigger hint
      if (onWordTap) {
        onWordTap();
      }
      if (onHintUsed) {
        onHintUsed();
      }
      setIsHolding(false);
      setHoldProgress(0);
    }, HOLD_DURATION_MS);
  };

  const handlePressOut = () => {
    // Cancel hold if user releases early
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHolding(false);
    setHoldProgress(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
      }
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  // Dynamic font sizes based on device
  const wordFontSize = isTabletDevice ? 96 : 72;
  const sentenceFontSize = isTabletDevice ? 48 : 36;

  const progressWidth = progressAnimationRef.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <Pressable 
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.wordPressable}
      >
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
      
      {/* Hold progress indicator - only show when hint is available */}
      {hasHint && (
        <View style={styles.hintContainer}>
          {isHolding ? (
            <>
              <View style={styles.progressTrack}>
                <Animated.View 
                  style={[
                    styles.progressFill,
                    { width: progressWidth }
                  ]} 
                />
              </View>
              <Text style={styles.hintText}>Hold for hint...</Text>
            </>
          ) : (
            <Text style={styles.hintText}>Hold for hint</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
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
  hintContainer: {
    alignItems: 'center',
    marginTop: responsiveSpacing(8),
    minHeight: isTablet() ? 40 : 32,
  },
  progressTrack: {
    width: '60%',
    height: isTablet() ? 6 : 4,
    backgroundColor: '#e0e0e0',
    borderRadius: isTablet() ? 3 : 2,
    overflow: 'hidden',
    marginBottom: responsiveSpacing(4),
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: isTablet() ? 3 : 2,
  },
  hintText: {
    fontSize: responsiveFontSize(12),
    color: '#666',
    fontWeight: '500',
  },
});
