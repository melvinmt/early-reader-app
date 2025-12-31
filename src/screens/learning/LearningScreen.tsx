import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Animated, Pressable, useWindowDimensions, TouchableOpacity } from 'react-native';
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
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

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
  const [pronunciationAttempts, setPronunciationAttempts] = useState(0);
  const [pronunciationFailed, setPronunciationFailed] = useState(false);

  const uiOpacity = useRef(new Animated.Value(1)).current;
  const cardQueueRef = useRef<LearningCard[]>([]);
  const isLoadingQueueRef = useRef(false);
  const wordTapDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);

  // Speech recognition hook
  const speechRecognition = useSpeechRecognition({
    targetText: currentCard?.word || '',
    onMatch: (confidence) => {
      console.log('Pronunciation matched with confidence:', confidence);
    },
    onError: (error) => {
      console.error('Speech recognition error:', error);
    },
  });

  useEffect(() => {
    if (!childId) {
      Alert.alert('Error', 'Child ID is required');
      router.back();
      return;
    }

    initializeSession();
    // Load initial card queue, then load first card
    loadCardQueue().then(() => loadNextCard());

    return () => {
      cleanup();
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

  const playPromptAudio = async (card: LearningCard) => {
    try {
      // Pause speech recognition during audio playback
      await speechRecognition.pauseListening();
      
      if (card.distarCard?.promptPath) {
        await audioPlayer.playSoundFromAssetAndWait(card.distarCard.promptPath);
      }
      
      // Resume speech recognition after playback
      await speechRecognition.resumeListening();
    } catch (error) {
      console.error('Error playing prompt audio:', error);
      // Try to resume even on error
      await speechRecognition.resumeListening();
    }
  };

  const handleWordTap = async () => {
    // Debounce rapid taps - prevent playing audio if tapped within last 500ms
    if (wordTapDebounceRef.current) {
      return; // Ignore rapid taps
    }
    
    if (currentCard?.distarCard?.audioPath) {
      // Pause speech recognition during audio playback
      await speechRecognition.pauseListening();
      
      try {
        await audioPlayer.playSoundFromAssetAndWait(currentCard.distarCard.audioPath);
      } catch (error) {
        console.error('Error playing word audio:', error);
      }
      
      // Resume speech recognition after playback
      await speechRecognition.resumeListening();
      
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
    
    // Clear transcript immediately when loading next card
    speechRecognition.clearTranscript();
    
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
        setPronunciationAttempts(0);
        setPronunciationFailed(false);
        setState('ready');
        
        // Restart speech recognition for new card
        if (speechRecognition.isEnabled) {
          speechRecognition.restart();
        }
        
        playPromptAudio(retryCard);
        
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
      setPronunciationAttempts(0);
      setPronunciationFailed(false);
      setState('ready');

      // Restart speech recognition for new card
      if (speechRecognition.isEnabled) {
        speechRecognition.restart();
      }

      playPromptAudio(card);
      
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
      // Check pronunciation if speech recognition is enabled
      if (speechRecognition.isEnabled) {
        const hasCorrectPronunciation = speechRecognition.hasCorrectPronunciation;
        const hasSaidAnything = speechRecognition.hasSaidAnything;

        if (!hasCorrectPronunciation) {
          // Pronunciation check failed
          const newAttempts = pronunciationAttempts + 1;
          setPronunciationAttempts(newAttempts);

          // Pause listening while playing feedback audio
          await speechRecognition.pauseListening();

          if (!hasSaidAnything) {
            // No input detected
            if (currentCard.distarCard?.noInputPath) {
              await audioPlayer.playSoundFromAssetAndWait(currentCard.distarCard.noInputPath);
            }
            
            if (newAttempts >= 2) {
              // Allow pass on 2nd fail, but mark as pronunciation failed
              setPronunciationFailed(true);
            } else {
              // First attempt - allow retry, resume listening
              await speechRecognition.resumeListening();
              isProcessingRef.current = false;
              return;
            }
          } else {
            // Incorrect pronunciation
            if (currentCard.distarCard?.tryAgainPath) {
              await audioPlayer.playSoundFromAssetAndWait(currentCard.distarCard.tryAgainPath);
            }
            
            if (newAttempts >= 2) {
              // Allow pass on 2nd fail, but mark as pronunciation failed
              setPronunciationFailed(true);
            } else {
              // First attempt - allow retry, resume listening
              await speechRecognition.resumeListening();
              isProcessingRef.current = false;
              return;
            }
          }
        }
        // If hasCorrectPronunciation is true, proceed normally
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
          matchScore: 1.0,
          neededHelp,
          pronunciationFailed: speechRecognition.isEnabled ? pronunciationFailed : false,
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
          {/* Pronunciation indicator (only shown when speech recognition is enabled) */}
          {speechRecognition.isEnabled && (
            <View style={dynamicStyles.pronunciationIndicator}>
              {speechRecognition.hasCorrectPronunciation ? (
                <Text style={dynamicStyles.pronunciationCheck}>✓</Text>
              ) : speechRecognition.state === 'incorrect' || speechRecognition.state === 'no-input' ? (
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
        
        {/* Transcript feedback for parents (replaces swipe hint when speech recognition is enabled) */}
        {speechRecognition.isEnabled ? (
          <View style={dynamicStyles.transcriptContainer}>
            {speechRecognition.recognizedText ? (
              <>
                <View style={dynamicStyles.transcriptRow}>
                  {speechRecognition.hasCorrectPronunciation ? (
                    <>
                      <Text style={dynamicStyles.transcriptCheck}>✓</Text>
                      <Text style={dynamicStyles.transcriptText}>{speechRecognition.recognizedText}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={dynamicStyles.transcriptX}>X</Text>
                      <Text style={dynamicStyles.transcriptText}>{speechRecognition.recognizedText}</Text>
                    </>
                  )}
                </View>
                <Text style={dynamicStyles.transcriptMessage}>
                  {speechRecognition.hasCorrectPronunciation ? 'Correct! Swipe right to reveal the picture.' : 'Please try again!'}
                </Text>
              </>
            ) : (
              <Text style={dynamicStyles.transcriptMessage}>
                {speechRecognition.state === 'listening' ? 'Listening...' : 'Say the word to continue'}
              </Text>
            )}
          </View>
        ) : (
          <Text style={dynamicStyles.swipeHint}>Swipe right to reveal the image</Text>
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
