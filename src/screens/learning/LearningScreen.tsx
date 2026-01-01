import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Animated, Pressable, useWindowDimensions, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { recordCardCompletion, getCardQueue, LearningCard, CARDS_PER_SESSION } from '@/services/cardQueueManager';
import { audioPlayer } from '@/services/audio/audioPlayer';
import WordDisplay from '@/components/lesson/WordDisplay';
import BlurredImageReveal from '@/components/lesson/BlurredImageReveal';
import WordSwipeDetector from '@/components/lesson/WordSwipeDetector';
import ConfettiCelebration from '@/components/ui/ConfettiCelebration';
import { createSession, updateSession } from '@/services/storage/database';
import { isTablet, responsiveFontSize, responsiveSpacing } from '@/utils/responsive';
import { interactionManager, InteractionState } from '@/services/interactionManager';

type LearningState = 'loading' | 'ready' | 'revealing';

export default function LearningScreen() {
  const params = useLocalSearchParams();
  const childId = (params.childId as string) || '';
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isTabletDevice = isTablet();
  const dynamicStyles = createStyles(isTabletDevice, screenWidth);

  const [currentCard, setCurrentCard] = useState<LearningCard | null>(null);
  const [state, setState] = useState<LearningState>('loading');
  const [isImageRevealed, setIsImageRevealed] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [neededHelp, setNeededHelp] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cardsCompleted, setCardsCompleted] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pronunciationFailed, setPronunciationFailed] = useState(false);
  const [interactionState, setInteractionState] = useState<InteractionState>('idle');
  const [recognizedText, setRecognizedText] = useState<string | null>(null);
  const [speechEnabled, setSpeechEnabled] = useState(false);

  const uiOpacity = useRef(new Animated.Value(1)).current;
  const cardQueueRef = useRef<LearningCard[]>([]);
  const isLoadingQueueRef = useRef(false);
  const wordTapDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  const cardStartTimeRef = useRef<number>(0);

  // Set up Voice handlers once on mount
  useEffect(() => {
    interactionManager.setupVoiceHandlers();
    
    return () => {
      interactionManager.removeVoiceHandlers();
    };
  }, []); // Only run once on mount

  useEffect(() => {
    if (!childId) {
      Alert.alert('Error', 'Child ID is required');
      router.back();
      return;
    }

    // Subscribe to state changes
    const unsubscribeState = interactionManager.onStateChange((state) => {
      setInteractionState(state);
    });
    
    // Subscribe to speech results
    const unsubscribeSpeech = interactionManager.onSpeechResult((result) => {
      setRecognizedText(result.text);
    });
    
    // Check if speech recognition is enabled
    interactionManager.isEnabled().then(setSpeechEnabled);

    initializeSession();
    // Load initial card queue, then load first card
    loadCardQueue().then(() => loadNextCard());

    return () => {
      cleanup();
      interactionManager.reset();
      unsubscribeState();
      unsubscribeSpeech();
      // Cleanup debounce timer
      if (wordTapDebounceRef.current) {
        clearTimeout(wordTapDebounceRef.current);
      }
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

  // Check if card is a phoneme (1-2 characters) - skip speech recognition for phonemes
  const isPhoneme = (card: LearningCard) => {
    const text = card.distarCard?.plainText || card.word;
    return text.length <= 2;
  };

  const handleWordTap = async () => {
    // Debounce rapid taps - prevent playing audio if tapped within last 500ms
    if (wordTapDebounceRef.current) {
      return; // Ignore rapid taps
    }
    
    if (currentCard?.distarCard?.audioPath) {
      // Play audio directly - InteractionManager handles speech coordination
      try {
        await audioPlayer.playSoundFromAssetAndWait(currentCard.distarCard.audioPath);
      } catch (error) {
        console.error('Error playing word audio:', error);
      }
      
      // Set debounce timer
      wordTapDebounceRef.current = setTimeout(() => {
        wordTapDebounceRef.current = null;
      }, 500);
    }
  };

  const playSuccessAudioSequence = async (card: LearningCard): Promise<void> => {
    try {
      // Speech recognition is already stopped at this point (card completed)
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

  const loadCardQueue = async (excludeWord?: string) => {
    if (isLoadingQueueRef.current) return;
    
    try {
      isLoadingQueueRef.current = true;
      const result = await getCardQueue(childId);
      
      // Filter out excluded word to prevent consecutive repeats
      const filteredCards = excludeWord
        ? result.cards.filter(card => card.word !== excludeWord)
        : result.cards;
      
      // Add filtered cards to queue
      cardQueueRef.current = [...cardQueueRef.current, ...filteredCards];
      
      // Ensure we have at least 10 cards in the queue (excluding the current card)
      while (cardQueueRef.current.length < 10 && result.hasMore) {
        // Load more cards
        const additionalResult = await getCardQueue(childId);
        const additionalFiltered = excludeWord
          ? additionalResult.cards.filter(card => card.word !== excludeWord && !cardQueueRef.current.some(c => c.word === card.word))
          : additionalResult.cards.filter(card => !cardQueueRef.current.some(c => c.word === card.word));
        
        if (additionalFiltered.length === 0) {
          // No more unique cards available, break to avoid infinite loop
          break;
        }
        
        cardQueueRef.current = [...cardQueueRef.current, ...additionalFiltered];
        
        if (!additionalResult.hasMore) {
          break;
        }
      }
    } catch (error) {
      console.error('Error loading card queue:', error);
    } finally {
      isLoadingQueueRef.current = false;
    }
  };

  const loadNextCard = async () => {
    // Prevent rapid card loading
    if (isProcessingRef.current) {
      return;
    }
    
    // Reset InteractionManager for new card
    await interactionManager.reset();
    setRecognizedText(null);
    
    try {
      uiOpacity.setValue(1);
      
      // If queue is low, reload it (exclude current card)
      if (cardQueueRef.current.length < 3) {
        await loadCardQueue(currentCard?.word);
      }
      
      // Get next card from queue, ensuring it's not the same as current
      let card = cardQueueRef.current.shift();
      const currentWord = currentCard?.word;
      
      // Skip consecutive cards if they somehow made it into the queue
      while (card && card.word === currentWord && cardQueueRef.current.length > 0) {
        card = cardQueueRef.current.shift();
      }
      
      if (!card) {
        // Try to load queue if empty (exclude current card)
        await loadCardQueue(currentCard?.word);
        let retryCard = cardQueueRef.current.shift();
        
        // Skip consecutive cards
        while (retryCard && retryCard.word === currentWord && cardQueueRef.current.length > 0) {
          retryCard = cardQueueRef.current.shift();
        }
        
        if (!retryCard) {
          Alert.alert(
            'Welcome!', 
            'Let\'s start learning! Your first cards will be ready soon.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
          return;
        }
        
        // Use the retry card
        setState('loading');
        if (!retryCard.phonemes || retryCard.phonemes.length === 0) {
          retryCard.phonemes = retryCard.word.split('');
        }
        setCurrentCard(retryCard);
        setIsImageRevealed(false);
        setAttempts(0);
        setNeededHelp(false);
        setPronunciationFailed(false);
        setState('ready');
        
        // Start interaction for new card
        cardStartTimeRef.current = Date.now();
        const skipSpeech = isPhoneme(retryCard);
        await interactionManager.startCard(retryCard.word, retryCard.distarCard?.promptPath, skipSpeech);
        
        // Preload next batch in background
        loadCardQueue();
        return;
      }

      setState('loading');
      if (!card.phonemes || card.phonemes.length === 0) {
        card.phonemes = card.word.split('');
      }

      setCurrentCard(card);
      setIsImageRevealed(false);
      setAttempts(0);
      setNeededHelp(false);
      setPronunciationFailed(false);
      setState('ready');

      // Start interaction for new card
      cardStartTimeRef.current = Date.now();
      const skipSpeech = isPhoneme(card);
      await interactionManager.startCard(card.word, card.distarCard?.promptPath, skipSpeech);
      
      // Preload next batch in background if queue is getting low (exclude the card we just showed)
      if (cardQueueRef.current.length < 5) {
        loadCardQueue(card.word);
      }
    } catch (error) {
      console.error('Error loading card:', error);
      Alert.alert('Error', 'Failed to load card. Please try again.');
    }
  };

  const handleSwipeStart = () => {
    // Stop prompt audio when child starts swiping
    audioPlayer.stopAllAudio().catch(console.error);
  };

  const handleSwipeComplete = async (success: boolean) => {
    if (!currentCard || isProcessingRef.current) return;
    
    isProcessingRef.current = true;

    if (success) {
      // Register swipe attempt (increments swipeAttempts)
      interactionManager.handleSwipeAttempt();
      
      // Check if we can complete (matched OR fallback OR 2nd attempt)
      const canComplete = interactionManager.canSwipeComplete();
      const hasMatched = interactionManager.hasMatched();
      const swipeAttempts = interactionManager.getSwipeAttempts();

      if (!canComplete) {
        // First swipe without match - play feedback and allow retry
        const feedbackPath = recognizedText 
          ? currentCard.distarCard?.tryAgainPath 
          : currentCard.distarCard?.noInputPath;
        
        if (feedbackPath) {
          await interactionManager.playFeedbackThenResume(feedbackPath);
        }
        
        isProcessingRef.current = false;
        return;
      }

      // Can complete - mark pronunciation failed if we didn't match and speech was enabled
      const didFailPronunciation = speechEnabled && !isPhoneme(currentCard) && !hasMatched;
      if (didFailPronunciation) {
        setPronunciationFailed(true);
      }

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
          matchScore: hasMatched ? (interactionManager.getMatchConfidence() || 1.0) : 0.5,
          neededHelp,
          pronunciationFailed: didFailPronunciation,
        });
        
        const newCardsCompleted = cardsCompleted + 1;
        setCardsCompleted(newCardsCompleted);
        
        // Check if lesson is complete (20 cards)
        if (newCardsCompleted >= CARDS_PER_SESSION) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          setShowConfetti(false);
          Alert.alert(
            'Lesson Complete!',
            `Great job! You completed ${newCardsCompleted} cards!`,
            [{ 
              text: 'OK', 
              onPress: async () => {
                await cleanup();
                router.back();
              }
            }]
          );
          return;
        }
      } catch (error) {
        console.error('Error recording completion:', error);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setShowConfetti(false);
      setState('ready');
      isProcessingRef.current = false;
      loadNextCard();
    } else {
      setAttempts(attempts + 1);
      if (attempts >= 2) {
        setNeededHelp(true);
      }
      isProcessingRef.current = false;
    }
  };

  const handleExit = () => {
    Alert.alert(
      'Exit Learning Session?',
      'Are you sure you want to go back? Your progress will be saved.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: async () => {
            await cleanup();
            router.back();
          },
        },
      ]
    );
  };

  if (state === 'loading' || !currentCard) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={dynamicStyles.container}>
        <StatusBar barStyle="light-content" />
        <View style={dynamicStyles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={dynamicStyles.loadingText}>Loading...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (state === 'revealing') {
    return (
      <View style={dynamicStyles.revealContainer}>
        <StatusBar barStyle="light-content" />
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
    <View style={dynamicStyles.container}>
      <StatusBar barStyle="light-content" />
      {/* Blurred background image */}
      <BlurredImageReveal
        imageUri={currentCard.imageUrl}
        isRevealed={false}
        isFullScreen={true}
      />
      
      {/* Gradient overlay for readability */}
      <LinearGradient
        colors={['rgba(102, 126, 234, 0.85)', 'rgba(118, 75, 162, 0.85)']}
        style={dynamicStyles.gradientOverlay}
      />
      
      {/* Header */}
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.levelText}>Level {currentCard.level}</Text>
        <View style={dynamicStyles.headerRight}>
          <Text style={dynamicStyles.progressText}>{cardsCompleted}/{CARDS_PER_SESSION}</Text>
          <TouchableOpacity onPress={handleExit} style={dynamicStyles.exitButton}>
            <Text style={dynamicStyles.exitButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress dots */}
      <View style={dynamicStyles.progressDots}>
        {[...Array(CARDS_PER_SESSION)].map((_, i) => (
          <View
            key={i}
            style={[
              dynamicStyles.dot,
              i < cardsCompleted && dynamicStyles.dotCompleted,
              i === cardsCompleted && dynamicStyles.dotCurrent,
            ]}
          />
        ))}
      </View>

      {/* Main content - combined card */}
      <View style={dynamicStyles.content}>
        <View style={dynamicStyles.combinedCard}>
          {/* Pronunciation indicator (only shown when speech recognition is enabled and not a phoneme) */}
          {speechEnabled && currentCard && !isPhoneme(currentCard) && (
            <View style={dynamicStyles.pronunciationIndicator}>
              {interactionManager.hasMatched() ? (
                <Text style={dynamicStyles.pronunciationCheck}>✓</Text>
              ) : interactionState === 'listening' && recognizedText ? (
                <Text style={dynamicStyles.pronunciationX}>✗</Text>
              ) : null}
            </View>
          )}

          <WordDisplay
            word={currentCard.word}
            phonemes={currentCard.phonemes}
            distarCard={currentCard.distarCard}
            onWordTap={handleWordTap}
          />

          <WordSwipeDetector
            word={currentCard.word}
            phonemes={currentCard.phonemes}
            distarCard={currentCard.distarCard}
            onLetterEnter={() => {}}
            onSwipeStart={handleSwipeStart}
            onSwipeComplete={handleSwipeComplete}
          />
        </View>
        
        {/* Transcript feedback for parents (replaces swipe hint when speech recognition is enabled and not a phoneme) */}
        {speechEnabled && currentCard && !isPhoneme(currentCard) ? (
          <View style={dynamicStyles.transcriptContainer}>
            {recognizedText ? (
              <>
                <View style={dynamicStyles.transcriptRow}>
                  {interactionManager.hasMatched() ? (
                    <>
                      <Text style={dynamicStyles.transcriptCheck}>✓</Text>
                      <Text style={dynamicStyles.transcriptText}>{recognizedText}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={dynamicStyles.transcriptX}>X</Text>
                      <Text style={dynamicStyles.transcriptText}>{recognizedText}</Text>
                    </>
                  )}
                </View>
                <Text style={dynamicStyles.transcriptMessage}>
                  {interactionManager.hasMatched() 
                    ? (recognizedText?.toLowerCase() === currentCard?.word?.toLowerCase()
                        ? 'Correct! Swipe right to reveal the picture.' 
                        : 'Close enough! Swipe right to reveal the picture.')
                    : interactionState === 'fallback'
                    ? 'Swipe right to continue'
                    : 'Please try again!'}
                </Text>
              </>
            ) : interactionState === 'listening' ? (
              <Text style={dynamicStyles.transcriptMessage}>Listening...</Text>
            ) : interactionState === 'fallback' ? (
              <Text style={dynamicStyles.transcriptMessage}>Swipe right to continue</Text>
            ) : null}
          </View>
        ) : (
          <Text style={dynamicStyles.swipeHint}>
            {interactionState === 'fallback' ? 'Swipe right to continue' : 'Swipe right to reveal the image'}
          </Text>
        )}
      </View>

      <ConfettiCelebration visible={showConfetti} onComplete={() => setShowConfetti(false)} />
    </View>
  );
}

// Dynamic styles based on device type
const createStyles = (isTabletDevice: boolean, screenWidth: number) => {
  // Max content width for tablets to prevent stretching
  const maxContentWidth = isTabletDevice ? Math.min(screenWidth * 0.7, 600) : screenWidth;
  
  return StyleSheet.create({
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
      fontSize: responsiveFontSize(18),
      color: '#fff',
      fontWeight: '600',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: responsiveSpacing(24),
      paddingTop: responsiveSpacing(60),
      paddingBottom: responsiveSpacing(8),
      zIndex: 2,
      maxWidth: maxContentWidth,
      alignSelf: 'center',
      width: '100%',
    },
    levelText: {
      fontSize: responsiveFontSize(16),
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.9)',
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: responsiveSpacing(16),
    },
    progressText: {
      fontSize: responsiveFontSize(16),
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.9)',
    },
    exitButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    exitButtonText: {
      fontSize: responsiveFontSize(18),
      color: 'rgba(255, 255, 255, 0.9)',
      fontWeight: '600',
    },
    progressDots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: isTabletDevice ? 12 : 8,
      paddingVertical: responsiveSpacing(16),
      zIndex: 2,
    },
    dot: {
      width: isTabletDevice ? 14 : 10,
      height: isTabletDevice ? 14 : 10,
      borderRadius: isTabletDevice ? 7 : 5,
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
      paddingHorizontal: responsiveSpacing(16),
      paddingBottom: responsiveSpacing(40),
      zIndex: 2,
      maxWidth: maxContentWidth,
      alignSelf: 'center',
      width: '100%',
    },
    combinedCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderRadius: isTabletDevice ? 28 : 20,
      paddingHorizontal: responsiveSpacing(24),
      paddingVertical: responsiveSpacing(32),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      position: 'relative',
    },
    pronunciationIndicator: {
      position: 'absolute',
      top: responsiveSpacing(12),
      right: responsiveSpacing(12),
      width: isTabletDevice ? 32 : 28,
      height: isTabletDevice ? 32 : 28,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pronunciationCheck: {
      fontSize: isTabletDevice ? 24 : 20,
      color: '#4CAF50',
      fontWeight: 'bold',
    },
    pronunciationX: {
      fontSize: isTabletDevice ? 24 : 20,
      color: '#F44336',
      fontWeight: 'bold',
    },
    swipeHint: {
      textAlign: 'center',
      marginTop: responsiveSpacing(20),
      fontSize: responsiveFontSize(14),
      color: 'rgba(255, 255, 255, 0.9)',
      fontWeight: '500',
    },
    transcriptContainer: {
      marginTop: responsiveSpacing(20),
      alignItems: 'center',
      minHeight: isTabletDevice ? 60 : 50,
    },
    transcriptRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: responsiveSpacing(8),
      marginBottom: responsiveSpacing(4),
    },
    transcriptCheck: {
      fontSize: isTabletDevice ? 20 : 18,
      color: '#4CAF50',
      fontWeight: 'bold',
    },
    transcriptX: {
      fontSize: isTabletDevice ? 20 : 18,
      color: '#F44336',
      fontWeight: 'bold',
    },
    transcriptText: {
      fontSize: responsiveFontSize(14),
      color: 'rgba(255, 255, 255, 0.9)',
      fontWeight: '500',
      fontStyle: 'italic',
    },
    transcriptMessage: {
      fontSize: responsiveFontSize(12),
      color: 'rgba(255, 255, 255, 0.8)',
      fontWeight: '400',
      textAlign: 'center',
    },
  });
};

// Default styles for static reference
const styles = createStyles(isTablet(), 390);
