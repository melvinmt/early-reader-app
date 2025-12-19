import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CardQueueManager, Card } from '@/services/cardQueueManager';
import { getChild, incrementChildCardsCompleted } from '@/services/storage';
import { Child } from '@/types/database';
import BlurredImageReveal from '@/components/lesson/BlurredImageReveal';
import WordDisplay from '@/components/lesson/WordDisplay';
import WordSwipeDetector from '@/components/lesson/WordSwipeDetector';
import Button from '@/components/ui/Button';

export default function LearningScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const childId = params.childId as string;

  const [child, setChild] = useState<Child | null>(null);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [queueManager, setQueueManager] = useState<CardQueueManager | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initialize();
  }, [childId]);

  const initialize = async () => {
    try {
      const childData = await getChild(childId);
      if (!childData) {
        Alert.alert('Error', 'Child not found');
        router.back();
        return;
      }

      setChild(childData);

      const manager = new CardQueueManager(childId, childData.current_level);
      await manager.buildQueue();
      setQueueManager(manager);

      const nextCard = manager.getNextCard();
      setCurrentCard(nextCard);
      setLoading(false);
    } catch (error) {
      console.error('Error initializing learning screen:', error);
      Alert.alert('Error', 'Failed to load learning session');
      setLoading(false);
    }
  };

  const handleSwipeComplete = async (success: boolean) => {
    if (!currentCard || !queueManager) return;

    if (success) {
      // Record successful attempt
      await queueManager.recordAttempt(currentCard.word, 5, 1, false);
      setIsRevealed(true);
      await incrementChildCardsCompleted(childId);
    } else {
      // Increment attempts
      setAttempts((prev) => prev + 1);
      if (attempts >= 2) {
        // After 3 attempts, record as needing help
        await queueManager.recordAttempt(currentCard.word, 1, 3, true);
        setIsRevealed(true);
      }
    }
  };

  const handleNextCard = async () => {
    if (!queueManager) return;

    // Get next card
    const nextCard = queueManager.getNextCard();
    if (nextCard) {
      setCurrentCard(nextCard);
      setIsRevealed(false);
      setAttempts(0);
    } else {
      // Queue empty, rebuild
      await queueManager.buildQueue();
      const newCard = queueManager.getNextCard();
      if (newCard) {
        setCurrentCard(newCard);
        setIsRevealed(false);
        setAttempts(0);
      } else {
        Alert.alert('Complete', 'Great job! You\'ve finished all available cards.');
        router.back();
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!currentCard) {
    return (
      <View style={styles.container}>
        <Text>No cards available</Text>
        <Button title="Go Back" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.exitButton}>
          <Text style={styles.exitText}>✕</Text>
        </TouchableOpacity>
        {currentCard.isReview && (
          <View style={styles.reviewBadge}>
            <Text style={styles.reviewText}>Review</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <BlurredImageReveal
          imageUri={currentCard.imageUri}
          isRevealed={isRevealed}
          onRevealComplete={() => {
            // Celebration animation could go here
          }}
        />

        <WordDisplay word={currentCard.word} phonemes={currentCard.phonemes} />

        {!isRevealed && (
          <WordSwipeDetector
            word={currentCard.word}
            phonemes={currentCard.phonemes}
            onLetterEnter={(index) => {
              // Play phoneme sound
              console.log(`Playing sound for letter ${index}`);
            }}
            onSwipeComplete={handleSwipeComplete}
          />
        )}

        {isRevealed && (
          <View style={styles.actions}>
            <Button
              title="Next Card"
              onPress={handleNextCard}
              variant="primary"
              style={styles.nextButton}
            />
          </View>
        )}
      </View>
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
    padding: 16,
    paddingTop: 60,
  },
  exitButton: {
    padding: 8,
  },
  exitText: {
    fontSize: 24,
    color: '#666',
  },
  reviewBadge: {
    backgroundColor: '#FFA500',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  reviewText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  actions: {
    marginTop: 24,
  },
  nextButton: {
    marginTop: 16,
  },
});
