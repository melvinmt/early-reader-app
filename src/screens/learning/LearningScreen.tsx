import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getCardQueue, recordCardCompletion, getNextCard, LearningCard } from '@/services/cardQueueManager';
import { realtimeVoiceService } from '@/services/voice/realtimeVoiceService';
import { validatePronunciation } from '@/utils/pronunciation';
import { audioPlayer } from '@/services/audio/audioPlayer';
import WordDisplay from '@/components/lesson/WordDisplay';
import BlurredImageReveal from '@/components/lesson/BlurredImageReveal';
import WordSwipeDetector from '@/components/lesson/WordSwipeDetector';
import ConfettiCelebration from '@/components/ui/ConfettiCelebration';
import ProgressBar from '@/components/ui/ProgressBar';
import { createSession, updateSession } from '@/services/storage/database';

type LearningState = 'loading' | 'ready' | 'processing' | 'complete';

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

      // Initialize voice service (optional - app works without it)
      try {
        await realtimeVoiceService.connect();
        realtimeVoiceService.onResponse(handleVoiceResponse);
        console.log('Voice service connected');
      } catch (voiceError) {
        console.warn('Voice service unavailable, continuing without voice:', voiceError);
        // App continues to work without voice
      }
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  };

  const cleanup = async () => {
    try {
      // Disconnect voice service if connected (optional)
      try {
        await realtimeVoiceService.disconnect();
      } catch (voiceError) {
        // Voice service may not be connected, ignore
      }
      
      if (sessionId && sessionStartTime) {
        const duration = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
        await updateSession(sessionId, new Date().toISOString(), cardsCompleted, duration);
      }
    } catch (error) {
      console.error('Error cleaning up:', error);
    }
  };

  const loadNextCard = async () => {
    try {
      setState('loading');
      const card = await getNextCard(childId);
      
      if (!card) {
        // No more cards
        Alert.alert('Great job!', 'You\'ve completed all available cards for today.');
        router.back();
        return;
      }

      setCurrentCard(card);
      setIsImageRevealed(false);
      setAttempts(0);
      setNeededHelp(false);
      voiceTranscriptRef.current = '';
      voicePhonemesRef.current = [];
      setState('ready');

      // Inject context into voice service (optional - only if connected)
      try {
        await realtimeVoiceService.injectContext({
          currentWord: card.word,
          phonemes: card.phonemes,
          level: card.level,
        });
      } catch (voiceError) {
        // Voice service not available, continue without it
        console.warn('Could not inject context to voice service:', voiceError);
      }
    } catch (error) {
      console.error('Error loading card:', error);
      Alert.alert('Error', 'Failed to load card. Please try again.');
      router.back();
    }
  };

  const handleVoiceResponse = (response: { transcript?: string; toolCalls?: any[]; audio?: string }) => {
    if (response.transcript) {
      voiceTranscriptRef.current = response.transcript;
    }

    // Handle tool calls if any
    if (response.toolCalls) {
      response.toolCalls.forEach((toolCall) => {
        if (toolCall.name === 'phoneme_segmentation' && toolCall.arguments?.phonemes) {
          voicePhonemesRef.current = toolCall.arguments.phonemes;
        }
      });
    }
  };

  const handleLetterEnter = async (index: number) => {
    // Play phoneme sound when letter is entered
    if (currentCard && currentCard.phonemes[index]) {
      await audioPlayer.playPhoneme(currentCard.phonemes[index]);
    }
  };

  const handleSwipeComplete = async (success: boolean) => {
    if (!currentCard) return;

    if (success) {
      // Swipe was successful - reveal image immediately
      setIsImageRevealed(true);
      
      // Process card as successful (voice is optional enhancement)
      // The core flow is: swipe → image revealed → card complete
      await processCardResult(true);
    } else {
      // Swipe failed, try again
      setAttempts(attempts + 1);
      if (attempts >= 2) {
        setNeededHelp(true);
        Alert.alert('Need help?', 'Try swiping from left to right under each letter.');
      }
    }
  };

  const processCardResult = async (swipeSuccess: boolean) => {
    if (!currentCard) return;

    setState('processing');

    // Validate pronunciation (voice is optional - if no voice, use swipe success)
    // Core flow: swipe success = card success
    const hasVoiceTranscript = voiceTranscriptRef.current && voiceTranscriptRef.current !== '';
    const pronunciationResult = hasVoiceTranscript
      ? validatePronunciation(
          currentCard.word,
          currentCard.phonemes,
          voiceTranscriptRef.current,
          voicePhonemesRef.current.length > 0 ? voicePhonemesRef.current : undefined
        )
      : { isCorrect: true, matchScore: 1.0 }; // If no voice, swipe success = correct

    // Overall success: swipe must succeed, and if voice is available, pronunciation must be correct
    // If voice is not available, swipe success is sufficient
    const overallSuccess = swipeSuccess && (hasVoiceTranscript ? pronunciationResult.isCorrect : true);

    try {
      // Record completion
      await recordCardCompletion(childId, currentCard.word, {
        success: overallSuccess,
        attempts: attempts + 1,
        matchScore: pronunciationResult.matchScore,
        neededHelp,
      });

      if (overallSuccess) {
        // Success! Show confetti and move to next card
        await audioPlayer.playSuccess();
        setShowConfetti(true);
        setCardsCompleted(cardsCompleted + 1);
        setProgress((cardsCompleted + 1) / 10); // Assuming 10 cards per session
        
        // Brief delay to show success, then move to next card
        setTimeout(() => {
          setShowConfetti(false);
          setState('ready');
          loadNextCard();
        }, 2000);
      } else {
        // Try again (shouldn't happen with swipe-only flow, but keep for safety)
        await audioPlayer.playTryAgain();
        setAttempts(attempts + 1);
        setIsImageRevealed(false);
        setState('ready');
        
        if (attempts >= 2) {
          // After 3 attempts, move on
          Alert.alert('Keep practicing!', 'Let\'s try the next word.');
          loadNextCard();
        }
      }
    } catch (error) {
      console.error('Error recording card completion:', error);
      Alert.alert('Error', 'Failed to save progress. Please try again.');
    }
  };

  const handleHelp = () => {
    if (!currentCard) return;
    setNeededHelp(true);
    setIsImageRevealed(true);
    // Play word audio
    // In production, use TTS to speak the word
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
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your next word...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.levelText}>Level {currentCard.level}</Text>
        <Text style={styles.progressText}>
          {cardsCompleted} / 10 cards
        </Text>
      </View>

      <ProgressBar progress={progress} style={styles.progressBar} />

      <View style={styles.content}>
        <BlurredImageReveal
          imageUri={currentCard.imageUrl}
          isRevealed={isImageRevealed}
          onRevealComplete={() => {
            // Image reveal animation complete
          }}
        />

        <WordDisplay word={currentCard.word} phonemes={currentCard.phonemes} />

        {state === 'ready' && (
          <WordSwipeDetector
            word={currentCard.word}
            phonemes={currentCard.phonemes}
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
    backgroundColor: '#fff',
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
    color: '#666',
  },
  progressText: {
    fontSize: 16,
    color: '#666',
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listeningContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  listeningText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  hintText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
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
    color: '#007AFF',
    fontWeight: '600',
  },
  skipButton: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
});



