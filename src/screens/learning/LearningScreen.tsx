import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Animated, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getCardQueue, recordCardCompletion, getNextCard, LearningCard } from '@/services/cardQueueManager';
import { validatePronunciation } from '@/utils/pronunciation';
import { audioPlayer } from '@/services/audio/audioPlayer';
import WordDisplay from '@/components/lesson/WordDisplay';
import BlurredImageReveal from '@/components/lesson/BlurredImageReveal';
import WordSwipeDetector from '@/components/lesson/WordSwipeDetector';
import ConfettiCelebration from '@/components/ui/ConfettiCelebration';
import ProgressBar from '@/components/ui/ProgressBar';
import { createSession, updateSession } from '@/services/storage/database';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type LearningState = 'loading' | 'ready' | 'revealing' | 'processing' | 'complete';

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
  const [progress, setProgress] = useState(0);

  // Animation for UI fade out during reveal
  const uiOpacity = useRef(new Animated.Value(1)).current;

  // Pre-loaded next card (loaded in background)
  const nextCardRef = useRef<LearningCard | null>(null);
  const isLoadingNextRef = useRef(false);

  // Voice service disabled - keeping refs for future use
  const voiceTranscriptRef = useRef<string>('');
  const voicePhonemesRef = useRef<string[]>([]);

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
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(sessionId);
      setSessionStartTime(new Date());

      await createSession({
        id: sessionId,
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

  // Play prompt audio when card is ready
  const playPromptAudio = async (card: LearningCard) => {
    try {
      if (card.distarCard?.promptPath) {
        await audioPlayer.playSoundFromAsset(card.distarCard.promptPath);
      }
    } catch (error) {
      console.error('Error playing prompt audio:', error);
    }
  };

  // Play word audio when user taps the word
  const handleWordTap = () => {
    if (currentCard?.distarCard?.audioPath) {
      audioPlayer.playSoundFromAsset(currentCard.distarCard.audioPath).catch(console.error);
    }
  };

  // Play the full success audio sequence: great-job.mp3 -> 1 second pause -> audio.mp3
  // Returns a promise that resolves when the entire sequence is complete
  const playSuccessAudioSequence = async (card: LearningCard): Promise<void> => {
    try {
      // 1. Play great-job.mp3 and wait for it to finish
      if (card.distarCard?.greatJobPath) {
        console.log('Playing great-job audio...');
        await audioPlayer.playSoundFromAssetAndWait(card.distarCard.greatJobPath);
        console.log('Great-job audio finished');
      }
      
      // 2. Wait 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 3. Play audio.mp3 (the word) and wait for it to finish
      if (card.distarCard?.audioPath) {
        console.log('Playing word audio...');
        await audioPlayer.playSoundFromAssetAndWait(card.distarCard.audioPath);
        console.log('Word audio finished');
      }
    } catch (error) {
      console.error('Error in success audio sequence:', error);
    }
  };

  // Pre-load next card in background (doesn't interfere with current card)
  const preloadNextCard = async () => {
    if (isLoadingNextRef.current) return;
    
    try {
      isLoadingNextRef.current = true;
      const card = await getNextCard(childId);
      
      if (card) {
        if (!card.word) {
          console.warn('Pre-loaded card missing word, will skip');
          nextCardRef.current = null;
          return;
        }
        
        if (!card.phonemes || card.phonemes.length === 0) {
          card.phonemes = card.word.split('');
        }
        
        nextCardRef.current = card;
        console.log('Next card pre-loaded:', card.word);
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
      // Reset UI opacity for new card
      uiOpacity.setValue(1);
      
      // Check if we have a pre-loaded card ready
      if (nextCardRef.current) {
        console.log('Using pre-loaded card:', nextCardRef.current.word);
        const preloadedCard = nextCardRef.current;
        nextCardRef.current = null;
        
        setCurrentCard(preloadedCard);
        setIsImageRevealed(false);
        setAttempts(0);
        setNeededHelp(false);
        voiceTranscriptRef.current = '';
        voicePhonemesRef.current = [];
        setState('ready');
        
        // Play prompt audio for the new card
        playPromptAudio(preloadedCard);
        
        // Immediately start loading the next card in background
        preloadNextCard();
        return;
      }
      
      // No pre-loaded card, load one now
      setState('loading');
      console.log('Loading next card for child:', childId);
      const card = await getNextCard(childId);
      
      if (!card) {
        Alert.alert('Great job!', 'You\'ve completed all available cards for today.');
        router.back();
        return;
      }

      console.log('Card loaded:', { 
        word: card.word, 
        phonemes: card.phonemes, 
        hasImage: !!card.imageUrl,
        hasPrompt: !!card.distarCard?.promptPath,
      });
      
      if (!card.word) {
        console.error('Card missing word:', card);
        Alert.alert('Error', 'Card is missing word. Please try again.');
        setTimeout(() => loadNextCard(), 1000);
        return;
      }
      
      if (!card.phonemes || card.phonemes.length === 0) {
        console.warn('Card missing phonemes, using word characters:', card.word);
        card.phonemes = card.word.split('');
      }

      setCurrentCard(card);
      setIsImageRevealed(false);
      setAttempts(0);
      setNeededHelp(false);
      voiceTranscriptRef.current = '';
      voicePhonemesRef.current = [];
      setState('ready');

      // Play prompt audio for the new card
      playPromptAudio(card);

      // Start pre-loading the next card in background
      preloadNextCard();
    } catch (error) {
      console.error('Error loading card:', error);
      Alert.alert('Error', `Failed to load card: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLetterEnter = async (index: number) => {
    // Phoneme audio is handled in WordSwipeDetector
  };

  const handleSwipeComplete = async (success: boolean) => {
    if (!currentCard) return;

    if (success) {
      // Start revealing state - hide UI and show fullscreen image
      setState('revealing');
      
      // Fade out UI
      Animated.timing(uiOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Reveal image
      setIsImageRevealed(true);
      
      // Play the audio sequence (great-job -> pause -> word audio)
      // The image stays revealed until this completes
      await playSuccessAudioSequence(currentCard);
      
      // Record completion after audio finishes
      try {
        await recordCardCompletion(childId, currentCard.word, {
          success: true,
          attempts: attempts + 1,
          matchScore: 1.0,
          neededHelp,
        });
        
        setCardsCompleted(cardsCompleted + 1);
        setProgress((cardsCompleted + 1) / 10);
      } catch (error) {
        console.error('Error recording completion:', error);
      }
      
      // Small delay after audio finishes to let the child enjoy the image
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Move to next card
      setShowConfetti(false);
      setState('ready');
      loadNextCard();
    } else {
      setAttempts(attempts + 1);
      if (attempts >= 2) {
        setNeededHelp(true);
        Alert.alert('Need help?', 'Try swiping from left to right under each letter.');
      }
    }
  };

  const handleRevealComplete = () => {
    // Blur animation finished - timing is now controlled by audio sequence in handleSwipeComplete
    console.log('Image reveal animation complete');
  };

  const handleHelp = () => {
    if (!currentCard) return;
    setNeededHelp(true);
    
    // Play the word audio to help
    if (currentCard.distarCard?.audioPath) {
      audioPlayer.playSoundFromAsset(currentCard.distarCard.audioPath).catch(console.error);
    }
  };

  const handleSkip = async () => {
    if (!currentCard) return;
    
    Alert.alert(
      'Skip Card?',
      'Are you sure you want to skip this word?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            await recordCardCompletion(childId, currentCard.word, {
              success: false,
              attempts: attempts + 1,
              matchScore: 0,
              neededHelp: true,
            });
            loadNextCard();
          },
        },
      ]
    );
  };

  if (state === 'loading' || !currentCard) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your next word...</Text>
      </View>
    );
  }

  // During reveal: show only the fullscreen unblurring image
  if (state === 'revealing') {
    return (
      <View style={styles.container}>
        <BlurredImageReveal
          imageUri={currentCard.imageUrl}
          isRevealed={isImageRevealed}
          isFullScreen={true}
          onRevealComplete={handleRevealComplete}
        />
        <ConfettiCelebration
          visible={true}
          onComplete={() => {}}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Full-screen blurred background image */}
      <BlurredImageReveal
        imageUri={currentCard.imageUrl}
        isRevealed={false}
        isFullScreen={true}
      />

      {/* UI overlay on top of the background */}
      <Animated.View style={[styles.uiOverlay, { opacity: uiOpacity }]}>
        <View style={styles.header}>
          <Text style={styles.levelText}>Level {currentCard.level}</Text>
          <Text style={styles.progressText}>
            {cardsCompleted} / 10 cards
          </Text>
        </View>

        <ProgressBar progress={progress} style={styles.progressBar} />

        <View style={styles.content}>
          <WordDisplay 
            word={currentCard.word} 
            phonemes={currentCard.phonemes}
            distarCard={currentCard.distarCard}
            onWordTap={handleWordTap}
            style={styles.wordDisplay}
          />

          {state === 'ready' && (
            <WordSwipeDetector
              word={currentCard.word}
              phonemes={currentCard.phonemes}
              distarCard={currentCard.distarCard}
              onLetterEnter={handleLetterEnter}
              onSwipeComplete={handleSwipeComplete}
            />
          )}

          {state === 'processing' && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#34C759" />
              <Text style={styles.processingText}>Great job!</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <Text style={styles.helpButton} onPress={handleHelp}>
            Need help?
          </Text>
          <Text style={styles.skipButton} onPress={handleSkip}>
            Skip
          </Text>
        </View>
      </Animated.View>

      <ConfettiCelebration
        visible={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uiOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
  },
  levelText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  progressText: {
    fontSize: 16,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  progressBar: {
    marginHorizontal: 24,
    marginBottom: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  wordDisplay: {
    marginBottom: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  processingContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  processingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#34C759',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    paddingBottom: 40,
  },
  helpButton: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  skipButton: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    backgroundColor: 'rgba(255, 59, 48, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
});
