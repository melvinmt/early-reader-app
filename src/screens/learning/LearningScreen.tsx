import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Animated, Pressable, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { recordCardCompletion, getCardQueue, LearningCard } from '@/services/cardQueueManager';
import { audioPlayer } from '@/services/audio/audioPlayer';
import WordDisplay from '@/components/lesson/WordDisplay';
import BlurredImageReveal from '@/components/lesson/BlurredImageReveal';
import WordSwipeDetector from '@/components/lesson/WordSwipeDetector';
import ConfettiCelebration from '@/components/ui/ConfettiCelebration';
import { createSession, updateSession } from '@/services/storage/database';
import { isTablet, responsiveFontSize, responsiveSpacing } from '@/utils/responsive';

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

  const uiOpacity = useRef(new Animated.Value(1)).current;
  const cardQueueRef = useRef<LearningCard[]>([]);
  const isLoadingQueueRef = useRef(false);

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
        setState('ready');
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
      setState('ready');

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
        <Text style={dynamicStyles.progressText}>{cardsCompleted}/10</Text>
      </View>

      {/* Progress dots */}
      <View style={dynamicStyles.progressDots}>
        {[...Array(10)].map((_, i) => (
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
            onSwipeComplete={handleSwipeComplete}
          />
        </View>
        
        {/* Swipe hint caption below card */}
        <Text style={dynamicStyles.swipeHint}>Swipe right to reveal the image</Text>
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
    progressText: {
      fontSize: responsiveFontSize(16),
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.9)',
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
    },
    swipeHint: {
      textAlign: 'center',
      marginTop: responsiveSpacing(20),
      fontSize: responsiveFontSize(14),
      color: 'rgba(255, 255, 255, 0.9)',
      fontWeight: '500',
    },
  });
};

// Default styles for static reference
const styles = createStyles(isTablet(), 390);
