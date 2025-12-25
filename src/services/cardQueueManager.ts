/**
 * Card Queue Manager
 * Manages the queue of learning cards for spaced repetition
 */

import {
  getDueReviewCards,
  getCardProgress,
  createOrUpdateCardProgress,
  getChild,
  updateChildLevel,
  incrementChildCardsCompleted,
  createOrUpdateContentCache,
  getContentCache,
} from './storage/database';
import { CardProgress, Child } from '@/types/database';
import { generateWord, segmentPhonemes } from './ai/edgeFunctions';
import { getLevel, getPhonemesUpToLevel, LEVELS } from '@/data/levels';
import { calculateSM2, mapPronunciationToQuality } from '@/utils/sm2';
import { validatePronunciation } from '@/utils/pronunciation';

export interface LearningCard {
  word: string;
  phonemes: string[];
  imageUrl: string;
  progress: CardProgress | null; // null if new card
  level: number;
}

export interface CardQueueResult {
  cards: LearningCard[];
  hasMore: boolean;
  currentLevel: number;
}

const CARDS_PER_SESSION = 10;
const MIN_CARDS_FOR_LEVEL_UP = 20;

/**
 * Get the next queue of cards for a child
 */
export async function getCardQueue(childId: string): Promise<CardQueueResult> {
  // Get child info
  const child = await getChild(childId);
  if (!child) {
    throw new Error('Child not found');
  }

  const currentLevel = child.current_level;
  const levelData = getLevel(currentLevel);

  if (!levelData) {
    throw new Error(`Invalid level: ${currentLevel}`);
  }

  // Get due review cards (spaced repetition)
  const dueCards = await getDueReviewCards(childId, CARDS_PER_SESSION);

  // Generate new cards if needed
  const cardsNeeded = CARDS_PER_SESSION - dueCards.length;
  const newCards: LearningCard[] = [];

  if (cardsNeeded > 0) {
    // Generate new cards for current level
    for (let i = 0; i < cardsNeeded; i++) {
      try {
        const card = await generateNewCard(childId, currentLevel, levelData.phonemes);
        if (card) {
          newCards.push(card);
        }
      } catch (error) {
        console.error('Error generating new card:', error);
        // Continue with other cards if one fails
      }
    }
  }

  // Combine due cards and new cards
  const allCards: LearningCard[] = [
    ...dueCards.map((progress) => ({
      word: progress.word,
      phonemes: [], // Will be loaded from cache or regenerated
      imageUrl: '', // Will be loaded from cache
      progress,
      level: currentLevel,
    })),
    ...newCards,
  ];

  // Load full card data for due cards (from cache)
  for (let i = 0; i < allCards.length; i++) {
    const card = allCards[i];
    if (card.progress && (!card.phonemes.length || !card.imageUrl)) {
      // Try to load from cache
      const cachedWord = await getContentCache('word', card.word);
      const cachedImage = await getContentCache('image', card.word);

      if (cachedWord) {
        const wordData = JSON.parse(cachedWord.content_data);
        card.phonemes = wordData.phonemes || [];
      } else {
        // Regenerate phonemes if not cached
        card.phonemes = await segmentPhonemes(card.word);
      }

      if (cachedImage) {
        const imageData = JSON.parse(cachedImage.content_data);
        card.imageUrl = imageData.imageUrl || '';
      }
    }
  }

  // Filter out cards without complete data (imageUrl is optional)
  const validCards = allCards.filter(
    (card) => card.word && card.phonemes.length > 0
  );

  return {
    cards: validCards.slice(0, CARDS_PER_SESSION),
    hasMore: validCards.length >= CARDS_PER_SESSION,
    currentLevel,
  };
}

/**
 * Generate a new learning card
 */
async function generateNewCard(
  childId: string,
  level: number,
  phonemes: string[]
): Promise<LearningCard | null> {
  try {
    // Generate word via AI
    const generated = await generateWord({
      level,
      phonemes,
      childId,
    });

    // Check if we already have progress for this word
    const existingProgress = await getCardProgress(childId, generated.word);

    if (existingProgress) {
      // Word already exists, skip
      return null;
    }

    // Cache the word and image
    await createOrUpdateContentCache({
      id: `${childId}-word-${generated.word}`,
      content_type: 'word',
      content_key: generated.word,
      content_data: JSON.stringify({
        word: generated.word,
        phonemes: generated.phonemes,
        level,
      }),
      file_path: null,
      created_at: new Date().toISOString(),
      expires_at: null,
    });

    await createOrUpdateContentCache({
      id: `${childId}-image-${generated.word}`,
      content_type: 'image',
      content_key: generated.word,
      content_data: JSON.stringify({
        imageUrl: generated.imageUrl,
      }),
      file_path: null,
      created_at: new Date().toISOString(),
      expires_at: null,
    });

    // Create initial progress entry
    const progressId = `${childId}-${generated.word}-${Date.now()}`;
    const now = new Date().toISOString();
    const progress: CardProgress = {
      id: progressId,
      child_id: childId,
      word: generated.word,
      ease_factor: 2.5, // Default SM-2 ease factor
      interval_days: 0, // Show immediately
      next_review_at: now,
      attempts: 0,
      successes: 0,
      last_seen_at: null,
    };

    await createOrUpdateCardProgress(progress);

    return {
      word: generated.word,
      phonemes: generated.phonemes,
      imageUrl: generated.imageUrl,
      progress,
      level,
    };
  } catch (error) {
    console.error('Error generating new card:', error);
    return null;
  }
}

/**
 * Record card completion and update progress
 */
export async function recordCardCompletion(
  childId: string,
  word: string,
  result: {
    success: boolean;
    attempts: number;
    matchScore: number;
    neededHelp: boolean;
  }
): Promise<void> {
  // Get current progress
  let progress = await getCardProgress(childId, word);

  // If progress doesn't exist, create it (can happen if card was just generated)
  if (!progress) {
    console.warn('Card progress not found, creating new progress entry for:', word);
    const progressId = `${childId}-${word}-${Date.now()}`;
    const now = new Date().toISOString();
    progress = {
      id: progressId,
      child_id: childId,
      word: word,
      ease_factor: 2.5, // Default SM-2 ease factor
      interval_days: 0,
      next_review_at: now,
      attempts: 0,
      successes: 0,
      last_seen_at: null,
    };
    await createOrUpdateCardProgress(progress);
  }

  // Calculate SM-2 quality rating
  const quality = mapPronunciationToQuality(
    result.matchScore,
    result.attempts,
    result.neededHelp
  );

  // Calculate new progress using SM-2
  const sm2Result = calculateSM2({
    quality,
    easeFactor: progress.ease_factor,
    intervalDays: progress.interval_days,
    repetitions: progress.attempts,
  });

  // Update progress
  const updatedProgress: CardProgress = {
    ...progress,
    ease_factor: sm2Result.nextEaseFactor,
    interval_days: sm2Result.nextInterval,
    next_review_at: sm2Result.nextReviewDate,
    attempts: progress.attempts + 1,
    successes: result.success ? progress.successes + 1 : progress.successes,
    last_seen_at: new Date().toISOString(),
  };

  await createOrUpdateCardProgress(updatedProgress);

  // Increment child's total cards completed if successful
  if (result.success) {
    await incrementChildCardsCompleted(childId);
  }

  // Check for level progression
  await checkLevelProgression(childId);
}

/**
 * Check if child should level up
 */
async function checkLevelProgression(childId: string): Promise<void> {
  const child = await getChild(childId);
  if (!child) return;

  const currentLevel = child.current_level;
  const levelData = getLevel(currentLevel);

  if (!levelData) return;

  // Check if child has completed enough cards at current level
  // Get all cards for current level
  const dueCards = await getDueReviewCards(childId, 1000); // Get all cards
  const levelCards = dueCards.filter((card) => {
    // This is simplified - in production, track level per card
    return card.successes > 0;
  });

  // If child has completed minimum cards and all are mastered, level up
  if (
    child.total_cards_completed >= MIN_CARDS_FOR_LEVEL_UP &&
    levelCards.length >= levelData.minWordsToComplete &&
    currentLevel < LEVELS.length
  ) {
    // Level up
    await updateChildLevel(childId, currentLevel + 1);
  }
}

/**
 * Get next card from queue
 * Only generates one card at a time to show immediately
 */
export async function getNextCard(childId: string): Promise<LearningCard | null> {
  // Get child info first
  const child = await getChild(childId);
  if (!child) {
    throw new Error('Child not found');
  }
  
  const currentLevel = child.current_level;
  const levelData = getLevel(currentLevel);
  
  if (!levelData) {
    throw new Error(`Invalid level: ${currentLevel}`);
  }
  
  // First, try to get a due review card
  const dueCards = await getDueReviewCards(childId, 1);
  
  if (dueCards.length > 0) {
    const progress = dueCards[0];
    // Load full card data from cache
    const cachedWord = await getContentCache('word', progress.word);
    const cachedImage = await getContentCache('image', progress.word);
    
    let phonemes: string[] = [];
    let imageUrl = '';
    
    if (cachedWord) {
      const wordData = JSON.parse(cachedWord.content_data);
      phonemes = wordData.phonemes || [];
    } else {
      // Regenerate phonemes if not cached
      phonemes = await segmentPhonemes(progress.word);
    }
    
    if (cachedImage) {
      const imageData = JSON.parse(cachedImage.content_data);
      imageUrl = imageData.imageUrl || '';
    }
    
    // Return card even if imageUrl is missing (can generate on demand)
    if (progress.word && phonemes.length > 0) {
      return {
        word: progress.word,
        phonemes,
        imageUrl,
        progress,
        level: currentLevel,
      };
    }
  }
  
  // No due cards, generate a new one (only ONE card)
  const card = await generateNewCard(childId, currentLevel, levelData.phonemes);
  return card;
}

