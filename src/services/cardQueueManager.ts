/**
 * Card Queue Manager
 * Manages the queue of learning cards for spaced repetition
 */

import {
  getDueReviewCards,
  getAllCardsForChild,
  getCardProgress,
  createOrUpdateCardProgress,
  getChild,
  updateChildLevel,
  incrementChildCardsCompleted,
  createOrUpdateContentCache,
  getContentCache,
  initDatabase,
} from './storage/database';
import { CardProgress, Child } from '@/types/database';
import { getLevel, getPhonemesUpToLevel, LEVELS } from '@/data/levels';
import { calculateSM2, mapPronunciationToQuality } from '@/utils/sm2';
import { validatePronunciation } from '@/utils/pronunciation';
import { getLocale } from '@/config/locale';
import type { DistarCard } from '@/data/distarCards';
// Static imports for each supported locale (Metro bundler doesn't support dynamic template imports)
import * as distarCardsEnUS from '@/data/distarCards.en-US';
import * as distarCardsDefault from '@/data/distarCards';

// Locale to cards module mapping
const LOCALE_CARDS_MAP: Record<string, typeof distarCardsDefault> = {
  'en-US': distarCardsEnUS,
};

// Get cards module based on locale (static mapping instead of dynamic import)
function getDistarCardsModule() {
  const locale = getLocale();
  const localeModule = LOCALE_CARDS_MAP[locale];
  
  if (localeModule) {
    return localeModule;
  }
  
  // Fallback to default if locale-specific cards don't exist
  console.warn(`Cards for locale ${locale} not found, falling back to default`);
  return distarCardsDefault;
}

// Get all available static cards
function getAllStaticCards(): DistarCard[] {
  const cardsModule = getDistarCardsModule();
  return cardsModule.DISTAR_CARDS;
}

export interface LearningCard {
  word: string;
  phonemes: string[];
  imageUrl: string;
  progress: CardProgress | null; // null if new card
  level: number;
  distarCard?: DistarCard; // Reference to pre-generated DISTAR card
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
    // Use pre-generated DISTAR cards only (no AI generation)
    for (let i = 0; i < cardsNeeded; i++) {
      try {
        const card = await generateNewCardFromStatic(childId, currentLevel);
        if (card) {
          newCards.push(card);
        }
      } catch (error) {
        console.error('Error loading static card:', error);
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

  // Load full card data for due cards (from static cards only - no cache fallback for stale cards)
  const staticCards = getAllStaticCards();
  const validCards: LearningCard[] = [];
  
  for (let i = 0; i < allCards.length; i++) {
    const card = allCards[i];
    
    // For cards with progress (due review cards), only include them if they exist in static cards
    if (card.progress) {
      const matchingStatic = staticCards.find(c => c.plainText === card.word);
      
      if (matchingStatic) {
        // Card exists in current static cards - use it
        card.phonemes = matchingStatic.phonemes;
        card.imageUrl = matchingStatic.imagePath;
        card.distarCard = matchingStatic;
        validCards.push(card);
      } else {
        // Card no longer exists in static cards - skip it (stale reference)
        console.warn(`Skipping stale card: "${card.word}" (no longer in static cards)`);
      }
    } else {
      // New cards always have complete data from static cards
      if (card.word && card.phonemes.length > 0) {
        validCards.push(card);
      }
    }
  }

  return {
    cards: validCards.slice(0, CARDS_PER_SESSION),
    hasMore: validCards.length >= CARDS_PER_SESSION,
    currentLevel,
  };
}

/**
 * Generate a new learning card from pre-generated DISTAR cards
 * Uses ALL available static cards (no lesson-based filtering for now)
 */
async function generateNewCardFromStatic(
  childId: string,
  level: number
): Promise<LearningCard | null> {
  // Get all words this child has already seen
  const database = await initDatabase();
  const existingWords = await database.getAllAsync<{ word: string }>(
    `SELECT DISTINCT word FROM card_progress WHERE child_id = ?`,
    [childId]
  );
  const seenWords = new Set(existingWords.map(w => w.word));
  
  // Get ALL static cards (not filtered by lesson for now since we have limited cards)
  const allCards = getAllStaticCards();
  console.log(`Total static cards available: ${allCards.length}`);
  
  // Filter out cards the child has already seen
  const availableCards = allCards.filter(
    card => !seenWords.has(card.plainText)
  );
  
  console.log(`Cards not yet seen by child: ${availableCards.length}`);
  
  if (availableCards.length === 0) {
    console.warn('No unseen static cards available - child has seen all cards');
    // All cards have been seen - return a random one for review
    if (allCards.length > 0) {
      const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
      console.log('Returning random card for review:', randomCard.plainText);
      return createLearningCardFromDistar(childId, level, randomCard);
    }
    return null;
  }
  
  // Select a random unseen card
  const distarCard = availableCards[Math.floor(Math.random() * availableCards.length)];
  console.log('Selected new card:', distarCard.plainText);
  
  return createLearningCardFromDistar(childId, level, distarCard);
}

/**
 * Create a LearningCard from a DistarCard
 */
async function createLearningCardFromDistar(
  childId: string,
  level: number,
  distarCard: DistarCard
): Promise<LearningCard> {
  // Create initial progress entry
  const progressId = `${childId}-${distarCard.plainText}-${Date.now()}`;
  const now = new Date().toISOString();
  const progress: CardProgress = {
    id: progressId,
    child_id: childId,
    word: distarCard.plainText,
    ease_factor: 2.5, // Default SM-2 ease factor
    interval_days: 0, // Show immediately
    next_review_at: now,
    attempts: 0,
    successes: 0,
    last_seen_at: null,
  };

  await createOrUpdateCardProgress(progress);

  return {
    word: distarCard.plainText,
    phonemes: distarCard.phonemes,
    imageUrl: distarCard.imagePath, // Use static asset path
    progress,
    level,
    distarCard, // Include reference to full DISTAR card data
  };
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
 * Simplified for testing: shows all existing cards first, then generates new ones
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
  
  // Simplified: Get ALL existing cards (not just "due" ones) for testing
  const allCards = await getAllCardsForChild(childId);
  
  // Filter out cards that were just seen (within last 5 seconds) to prevent immediate repeats
  const now = Date.now();
  const recentlySeenCards = allCards.filter(card => {
    if (!card.last_seen_at) return false;
    const lastSeen = new Date(card.last_seen_at).getTime();
    return (now - lastSeen) < 5000; // 5 seconds
  });
  
  // Get cards that haven't been seen recently
  const availableCards = allCards.filter(card => {
    if (!card.last_seen_at) return true; // Never seen, include it
    const lastSeen = new Date(card.last_seen_at).getTime();
    return (now - lastSeen) >= 5000; // Not seen in last 5 seconds
  });
  
  if (availableCards.length > 0) {
    // Sort by last_seen_at (null first, then oldest)
    const sortedCards = availableCards.sort((a, b) => {
      if (!a.last_seen_at && !b.last_seen_at) return 0;
      if (!a.last_seen_at) return -1;
      if (!b.last_seen_at) return 1;
      return new Date(a.last_seen_at).getTime() - new Date(b.last_seen_at).getTime();
    });
    
    const progress = sortedCards[0];
    
    // Try to find matching static card for this word
    const allStaticCards = getAllStaticCards();
    const matchingStaticCard = allStaticCards.find(c => c.plainText === progress.word);
    
    let phonemes: string[] = [];
    let imageUrl = '';
    let distarCard: DistarCard | undefined = matchingStaticCard;
    
    if (matchingStaticCard) {
      // Use data from static card
      phonemes = matchingStaticCard.phonemes;
      imageUrl = matchingStaticCard.imagePath;
    } else {
      // Legacy card - try to load from cache
      const cachedWord = await getContentCache('word', progress.word);
      const cachedImage = await getContentCache('image', progress.word);
      
      if (cachedWord) {
        const wordData = JSON.parse(cachedWord.content_data);
        phonemes = wordData.phonemes || [];
      } else {
        // Fallback: use characters as phonemes
        phonemes = progress.word.split('');
      }
      
      if (cachedImage) {
        const imageData = JSON.parse(cachedImage.content_data);
        imageUrl = imageData.imageUrl || '';
      }
    }
    
    // Return card if we have word and phonemes
    if (progress.word && phonemes.length > 0) {
      // Update last_seen_at immediately when card is loaded
      const updatedProgress: CardProgress = {
        ...progress,
        last_seen_at: new Date().toISOString(),
      };
      await createOrUpdateCardProgress(updatedProgress);
      
      return {
        word: progress.word,
        phonemes,
        imageUrl,
        progress: updatedProgress,
        level: currentLevel,
        distarCard,
      };
    }
  }
  
  // No available cards (all were seen recently), try to get a new static card
  console.log('All existing cards were recently seen, loading new static card...');
  const card = await generateNewCardFromStatic(childId, currentLevel);
  if (card) return card;
  
  // No more static cards available
  console.log('No static cards available');
  return null;
}

