import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Animated, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { recordCardCompletion, getNextCard, LearningCard } from '@/services/cardQueueManager';
import { audioPlayer } from '@/services/audio/audioPlayer';
import WordDisplay from '@/components/lesson/WordDisplay';
import BlurredImageReveal from '@/components/lesson/BlurredImageReveal';
import WordSwipeDetector from '@/components/lesson/WordSwipeDetector';
import ConfettiCelebration from '@/components/ui/ConfettiCelebration';
import { createSession, updateSession } from '@/services/storage/database';

type LearningState = 'loading' | 'ready' | 'revealing';

export default function LearningScreen() {
  const params = useLocalSearchParams();
  const childId = (params.childId as string) || '';
  const router = useRouter();

  const [currentCard, setCurrentCard] = useState<LearningCard | null>(null);
  const [state, setState] = useState<LearningState>('loading');
  const [isImageRevealed, setIsImageRevealed] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [neededHelp, setNeededHelp] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cardsCompleted, setCardsCompleted] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const uiOpacity = useRef(new Animated.Value(1)).current;
  const nextCardRef = useRef<LearningCard | null>(null);
  const isLoadingNextRef = useRef(false);

  useEffect(() => {
    if (!childId) {
      Alert.alert('Error', 'Child ID is required');
      router.back();
      return;
    }

    initializeSession();
    loadNextCard();

    return () => {
      cleanup();
    };
  }, [childId]);

  const initializeSession = async () => {
    try {
      const id = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(id);
      setSessionStartTime(new Date());

      await createSession({
        id,
        child_id: childId,
        started_at: new Date().toISOString(),
        ended_at: null,
        cards_completed: 0,
        duration_seconds: 0,
      });
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  };

  const cleanup = async () => {
    try {
      if (sessionId && sessionStartTime) {
        const duration = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
        await updateSession(sessionId, new Date().toISOString(), cardsCompleted, duration);
      }
    } catch (error) {
      console.error('Error cleaning up:', error);
    }
  };

  const playPromptAudio = async (card: LearningCard) => {
    try {
      if (card.distarCard?.promptPath) {
        await audioPlayer.playSoundFromAsset(card.distarCard.promptPath);
      }
    } catch (error) {
      console.error('Error playing prompt audio:', error);
    }
  };

  const handleWordTap = () => {
    if (currentCard?.distarCard?.audioPath) {
      audioPlayer.playSoundFromAsset(currentCard.distarCard.audioPath).catch(console.error);
    }
  };

  const playSuccessAudioSequence = async (card: LearningCard): Promise<void> => {
    try {
      if (card.distarCard?.greatJobPath) {
        await audioPlayer.playSoundFromAssetAndWait(card.distarCard.greatJobPath);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (card.distarCard?.audioPath) {
        await audioPlayer.playSoundFromAssetAndWait(card.distarCard.audioPath);
      }
    } catch (error) {
      console.error('Error in success audio sequence:', error);
    }
  };

  const preloadNextCard = async () => {
    if (isLoadingNextRef.current) return;
    
    try {
      isLoadingNextRef.current = true;
      const card = await getNextCard(childId);
      
      if (card) {
        if (!card.phonemes || card.phonemes.length === 0) {
          card.phonemes = card.word.split('');
        }
        nextCardRef.current = card;
      } else {
        nextCardRef.current = null;
      }
    } catch (error) {
      console.error('Error pre-loading next card:', error);
      nextCardRef.current = null;
    } finally {
      isLoadingNextRef.current = false;
    }
  };

  const loadNextCard = async () => {
    try {
      uiOpacity.setValue(1);
      
      if (nextCardRef.current) {
        const preloadedCard = nextCardRef.current;
        nextCardRef.current = null;
        
        setCurrentCard(preloadedCard);
        setIsImageRevealed(false);
        setAttempts(0);
        setNeededHelp(false);
        setState('ready');
        
        playPromptAudio(preloadedCard);
        preloadNextCard();
        return;
      }
      
      setState('loading');
      const card = await getNextCard(childId);
      
      if (!card) {
        Alert.alert('Great job!', 'You\'ve completed all available cards for today.');
        router.back();
        return;
      }

      if (!card.phonemes || card.phonemes.length === 0) {
        card.phonemes = card.word.split('');
      }

      setCurrentCard(card);
      setIsImageRevealed(false);
      setAttempts(0);
      setNeededHelp(false);
      setState('ready');

      playPromptAudio(card);
      preloadNextCard();
    } catch (error) {
      console.error('Error loading card:', error);
      Alert.alert('Error', 'Failed to load card. Please try again.');
    }
  };

  const handleSwipeComplete = async (success: boolean) => {
    if (!currentCard) return;

    if (success) {
      setState('revealing');
      
      Animated.timing(uiOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      setIsImageRevealed(true);
      setShowConfetti(true);
      
      await playSuccessAudioSequence(currentCard);
      
      try {
        await recordCardCompletion(childId, currentCard.word, {
          success: true,
          attempts: attempts + 1,
          matchScore: 1.0,
          neededHelp,
        });
        
        setCardsCompleted(cardsCompleted + 1);
      } catch (error) {
        console.error('Error recording completion:', error);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setShowConfetti(false);
      setState('ready');
      loadNextCard();
    } else {
      setAttempts(attempts + 1);
      if (attempts >= 2) {
        setNeededHelp(true);
      }
    }
  };

  if (state === 'loading' || !currentCard) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (state === 'revealing') {
    return (
      <View style={styles.revealContainer}>
        <BlurredImageReveal
          imageUri={currentCard.imageUrl}
          isRevealed={isImageRevealed}
          isFullScreen={true}
        />
        <ConfettiCelebration visible={showConfetti} onComplete={() => {}} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Blurred background image */}
      <BlurredImageReveal
        imageUri={currentCard.imageUrl}
        isRevealed={false}
        isFullScreen={true}
      />
      
      {/* Gradient overlay for readability */}
      <LinearGradient
        colors={['rgba(102, 126, 234, 0.85)', 'rgba(118, 75, 162, 0.85)']}
        style={styles.gradientOverlay}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.levelText}>Level {currentCard.level}</Text>
        <Text style={styles.progressText}>{cardsCompleted}/10</Text>
      </View>

      {/* Progress dots */}
      <View style={styles.progressDots}>
        {[...Array(10)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < cardsCompleted && styles.dotCompleted,
              i === cardsCompleted && styles.dotCurrent,
            ]}
          />
        ))}
      </View>

      {/* Main content - combined card */}
      <View style={styles.content}>
        <View style={styles.combinedCard}>
          <WordDisplay
            word={currentCard.word}
            phonemes={currentCard.phonemes}
            distarCard={currentCard.distarCard}
            onWordTap={handleWordTap}
          />

          <View style={styles.divider} />

          <WordSwipeDetector
            word={currentCard.word}
            phonemes={currentCard.phonemes}
            distarCard={currentCard.distarCard}
            onLetterEnter={() => {}}
            onSwipeComplete={handleSwipeComplete}
            renderHint={true}
          />
        </View>
      </View>

      <ConfettiCelebration visible={showConfetti} onComplete={() => setShowConfetti(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  revealContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 8,
    zIndex: 2,
  },
  levelText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    zIndex: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dotCompleted: {
    backgroundColor: '#4CAF50',
  },
  dotCurrent: {
    backgroundColor: '#fff',
    transform: [{ scale: 1.2 }],
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 40,
    zIndex: 2,
  },
  combinedCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 24,
  },
});
