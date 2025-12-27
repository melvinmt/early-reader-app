/**
 * Card Queue Manager
 * Manages the queue of learning cards for spaced repetition
 */

import {
  getDueReviewCards,
  getDueReviewCardsByPriority,
  getAllCardsForChild,
  getCardProgress,
  createOrUpdateCardProgress,
  getChild,
  updateChildLevel,
  incrementChildCardsCompleted,
  createOrUpdateContentCache,
  getContentCache,
  initDatabase,
  getIntroducedPhonemes,
} from './storage/database';
import { CardProgress, Child } from '@/types/database';
import { getLevel, getPhonemesUpToLevel, LEVELS } from '@/data/levels';
import { calculateSM2, mapPronunciationToQuality, calculateCardPriority } from '@/utils/sm2';
import { validatePronunciation } from '@/utils/pronunciation';
import { getLocale } from '@/config/locale';
import type { DistarCard } from '@/data/distarCards';
import {
  getUnintroducedPhonemesForLesson,
  isCardUnlocked,
  markPhonemeAsIntroduced,
  getUnlockedCards,
  advanceLessonIfReady,
  segmentWordIntoPhonemes,
} from './curriculum/curriculumService';
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
 * Uses curriculum-aware selection: only shows unlocked cards
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
  
  // Get introduced phonemes to determine unlocked cards
  const introducedPhonemes = await getIntroducedPhonemes(childId);
  
  // Get all static cards
  const allCards = getAllStaticCards();
  
  // Filter to unlocked cards only
  const unlockedCards = getUnlockedCards(allCards, introducedPhonemes);
  
  // Filter out cards the child has already seen
  const availableCards = unlockedCards.filter(
    card => !seenWords.has(card.plainText)
  );
  
  if (availableCards.length === 0) {
    // No new unlocked cards - return null to let priority system handle reviews
    return null;
  }
  
  // Prioritize phonemes first, then words, then sentences
  const phonemeCards = availableCards.filter(c => c.type === 'letter' || c.type === 'digraph');
  const wordCards = availableCards.filter(c => c.type === 'word');
  const sentenceCards = availableCards.filter(c => c.type === 'sentence');
  
  // Select first available card type in priority order
  const targetCards = phonemeCards.length > 0 ? phonemeCards : 
                      wordCards.length > 0 ? wordCards : 
                      sentenceCards;
  
  if (targetCards.length === 0) {
    return null;
  }
  
  // Select a random card from the priority group
  const distarCard = targetCards[Math.floor(Math.random() * targetCards.length)];
  
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
  // Check if progress already exists
  let progress = await getCardProgress(childId, distarCard.plainText);
  
  if (!progress) {
    // Create initial progress entry
    // Set next_review_at to 1 day from now so it doesn't immediately become "due"
    // This prevents the same card from appearing twice in a row
    const progressId = `${childId}-${distarCard.plainText}-${Date.now()}`;
    const now = new Date();
    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + 1); // 1 day from now
    
    progress = {
      id: progressId,
      child_id: childId,
      word: distarCard.plainText,
      ease_factor: 2.5, // Default SM-2 ease factor
      interval_days: 1, // 1 day interval for new cards
      next_review_at: nextReview.toISOString(),
      attempts: 0,
      successes: 0,
      last_seen_at: null,
      hint_used: 0,
    };

    console.log(`📝 Creating NEW progress for "${distarCard.plainText}": next_review_at = ${progress.next_review_at}`);
    await createOrUpdateCardProgress(progress);
  } else {
    console.log(`📝 Using EXISTING progress for "${distarCard.plainText}": next_review_at = ${progress.next_review_at}, attempts = ${progress.attempts}, successes = ${progress.successes}`);
  }

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

  // If progress doesn't exist, create it (shouldn't happen but handle it gracefully)
  if (!progress) {
    console.warn('Card progress not found, creating new progress entry for:', word);
    const progressId = `${childId}-${word}-${Date.now()}`;
    const now = new Date();
    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + 1);
    
    progress = {
      id: progressId,
      child_id: childId,
      word: word,
      ease_factor: 2.5, // Default SM-2 ease factor
      interval_days: 1,
      next_review_at: nextReview.toISOString(),
      attempts: 0,
      successes: 0,
      last_seen_at: null,
      hint_used: 0,
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
    hint_used: result.neededHelp ? 1 : (progress.hint_used ?? 0), // Track hint usage (persist if previously used)
  };

  console.log(`💾 Saving progress for "${word}": success=${result.success}, quality=${quality}, next_review_at=${updatedProgress.next_review_at}, attempts=${updatedProgress.attempts}, successes=${updatedProgress.successes}`);
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
 * Uses curriculum service to check if current lesson is complete
 */
async function checkLevelProgression(childId: string): Promise<void> {
  await advanceLessonIfReady(childId);
}

/**
 * Get next card from queue using curriculum-aware priority-based selection
 * Priority order:
 * 1. HIGH priority due review cards (new/failed/overdue)
 * 2. New phonemes for current lesson
 * 3. MEDIUM priority due review cards (hint used)
 * 4. Unlocked word cards (all phonemes introduced)
 * 5. LOW priority due review cards (fluent)
 * 6. Check for lesson advancement
 * 
 * @param childId - The child's ID
 * @param excludeWord - Optional word to exclude (prevents consecutive repeats)
 */
export async function getNextCard(childId: string, excludeWord?: string): Promise<LearningCard | null> {
  console.log(`\n=== getNextCard START (excludeWord: ${excludeWord || 'none'}) ===`);
  
  // Get child info first
  const child = await getChild(childId);
  if (!child) {
    throw new Error('Child not found');
  }
  
  const currentLesson = child.current_level;
  console.log(`Current lesson: ${currentLesson}`);
  const allStaticCards = getAllStaticCards();
  
  if (allStaticCards.length === 0) {
    console.warn('No static cards available');
    return null;
  }
  
  // 1. Get HIGH priority due review cards first
  const highPriorityDue = await getDueReviewCardsByPriority(childId, 'high', 5);
  console.log(`[1] HIGH priority due cards: ${highPriorityDue.map(p => p.word).join(', ')}`);
  const highPriorityFiltered = excludeWord 
    ? highPriorityDue.filter(p => p.word !== excludeWord)
    : highPriorityDue;
  console.log(`[1] HIGH priority after exclude: ${highPriorityFiltered.map(p => p.word).join(', ')}`);
  if (highPriorityFiltered.length > 0) {
    const progress = highPriorityFiltered[0];
    const matchingCard = allStaticCards.find(c => c.plainText === progress.word);
    if (matchingCard) {
      console.log(`✅ Selected: [HIGH] ${progress.word}`);
      const card = await createLearningCardFromProgress(childId, currentLesson, progress, matchingCard);
      console.log(`=== getNextCard END ===\n`);
      return card;
    }
  }
  
  // 2. Get new phonemes for current lesson
  const unintroducedPhonemes = await getUnintroducedPhonemesForLesson(childId, currentLesson);
  console.log(`[2] Unintroduced phonemes for lesson ${currentLesson}: ${unintroducedPhonemes.join(', ')}`);
  if (unintroducedPhonemes.length > 0) {
    const phonemeSymbol = unintroducedPhonemes[0];
    const phonemeCard = allStaticCards.find(
      c => (c.type === 'letter' || c.type === 'digraph') && c.plainText.toLowerCase() === phonemeSymbol.toLowerCase()
    );
    if (phonemeCard && (!excludeWord || phonemeCard.plainText !== excludeWord)) {
      console.log(`✅ Selected: [NEW PHONEME] ${phonemeCard.plainText}`);
      // Mark as introduced when we show it
      await markPhonemeAsIntroduced(childId, phonemeSymbol);
      const card = await createLearningCardFromDistar(childId, currentLesson, phonemeCard);
      console.log(`=== getNextCard END ===\n`);
      return card;
    } else if (phonemeCard && excludeWord === phonemeCard.plainText) {
      console.log(`[2] Skipped phoneme ${phonemeCard.plainText} (excluded)`);
    }
  }
  
  // 3. Get MEDIUM priority due review cards (hint used)
  const mediumPriorityDue = await getDueReviewCardsByPriority(childId, 'medium', 5);
  console.log(`[3] MEDIUM priority due cards: ${mediumPriorityDue.map(p => p.word).join(', ')}`);
  const mediumPriorityFiltered = excludeWord 
    ? mediumPriorityDue.filter(p => p.word !== excludeWord)
    : mediumPriorityDue;
  console.log(`[3] MEDIUM priority after exclude: ${mediumPriorityFiltered.map(p => p.word).join(', ')}`);
  if (mediumPriorityFiltered.length > 0) {
    const progress = mediumPriorityFiltered[0];
    const matchingCard = allStaticCards.find(c => c.plainText === progress.word);
    if (matchingCard) {
      console.log(`✅ Selected: [MEDIUM] ${progress.word}`);
      const card = await createLearningCardFromProgress(childId, currentLesson, progress, matchingCard);
      console.log(`=== getNextCard END ===\n`);
      return card;
    }
  }
  
  // 4. Get unlocked word cards (all phonemes introduced)
  const database = await initDatabase();
  const seenWords = await database.getAllAsync<{ word: string }>(
    `SELECT DISTINCT word FROM card_progress WHERE child_id = ?`,
    [childId]
  );
  const seenWordsSet = new Set(seenWords.map(w => w.word));
  console.log(`[4] Already seen words: ${Array.from(seenWordsSet).join(', ')}`);
  
  // Get introduced phonemes
  const introducedPhonemes = await getIntroducedPhonemes(childId);
  console.log(`[4] Introduced phonemes: ${introducedPhonemes.join(', ')}`);
  
  // Get unlocked cards
  const unlockedCards = getUnlockedCards(allStaticCards, introducedPhonemes);
  console.log(`[4] All unlocked cards: ${unlockedCards.map(c => c.plainText).join(', ')}`);
  
  // Filter to words/sentences that haven't been seen
  const newUnlockedCards = unlockedCards.filter(
    card => card.type !== 'letter' && card.type !== 'digraph' && !seenWordsSet.has(card.plainText) && (!excludeWord || card.plainText !== excludeWord)
  );
  console.log(`[4] New unlocked cards (not seen, not excluded): ${newUnlockedCards.map(c => c.plainText).join(', ')}`);
  
  if (newUnlockedCards.length > 0) {
    // Prioritize words over sentences
    const wordCards = newUnlockedCards.filter(c => c.type === 'word');
    const targetCard = wordCards.length > 0 ? wordCards[0] : newUnlockedCards[0];
    console.log(`✅ Selected: [UNLOCKED] ${targetCard.plainText} (${targetCard.type})`);
    const card = await createLearningCardFromDistar(childId, currentLesson, targetCard);
    console.log(`=== getNextCard END ===\n`);
    return card;
  }
  
  // 5. Get LOW priority due review cards (fluent)
  const lowPriorityDue = await getDueReviewCardsByPriority(childId, 'low', 5);
  console.log(`[5] LOW priority due cards: ${lowPriorityDue.map(p => p.word).join(', ')}`);
  const lowPriorityFiltered = excludeWord 
    ? lowPriorityDue.filter(p => p.word !== excludeWord)
    : lowPriorityDue;
  console.log(`[5] LOW priority after exclude: ${lowPriorityFiltered.map(p => p.word).join(', ')}`);
  if (lowPriorityFiltered.length > 0) {
    const progress = lowPriorityFiltered[0];
    const matchingCard = allStaticCards.find(c => c.plainText === progress.word);
    if (matchingCard) {
      console.log(`✅ Selected: [LOW] ${progress.word}`);
      const card = await createLearningCardFromProgress(childId, currentLesson, progress, matchingCard);
      console.log(`=== getNextCard END ===\n`);
      return card;
    }
  }
  
  // 6. If we've exhausted all priority options, try to get any due card as fallback
  const fallbackDue = await getDueReviewCards(childId, 10);
  console.log(`[6] Fallback due cards: ${fallbackDue.map(p => p.word).join(', ')}`);
  const fallbackFiltered = excludeWord 
    ? fallbackDue.filter(p => p.word !== excludeWord)
    : fallbackDue;
  console.log(`[6] Fallback after exclude: ${fallbackFiltered.map(p => p.word).join(', ')}`);
  if (fallbackFiltered.length > 0) {
    const progress = fallbackFiltered[0];
    const matchingCard = allStaticCards.find(c => c.plainText === progress.word);
    if (matchingCard) {
      console.log(`✅ Selected: [FALLBACK] ${progress.word}`);
      const card = await createLearningCardFromProgress(childId, currentLesson, progress, matchingCard);
      console.log(`=== getNextCard END ===\n`);
      return card;
    }
  }
  
  // 7. Last resort: Get ANY card the child has seen before (allow continuous practice)
  // This ensures children can always keep practicing, even if no new cards or due cards available
  const allProgressCards = await getAllCardsForChild(childId);
  console.log(`[7] All progress cards: ${allProgressCards.map(p => `${p.word} (successes: ${p.successes}, next_review: ${p.next_review_at})`).join(', ')}`);
  let allProgressFiltered = excludeWord 
    ? allProgressCards.filter(p => p.word !== excludeWord)
    : allProgressCards;
  console.log(`[7] Progress cards after exclude: ${allProgressFiltered.map(p => p.word).join(', ')}`);
  
  // If exclusion would leave no cards, allow the excluded word to ensure session can continue
  // Exclusion is best-effort to avoid consecutive repeats, but shouldn't break sessions
  if (allProgressFiltered.length === 0 && allProgressCards.length > 0) {
    console.log(`[7] Exclusion would leave no cards - allowing excluded word to continue session`);
    allProgressFiltered = allProgressCards;
  }
  
  if (allProgressFiltered.length > 0) {
    // Prioritize cards with fewer successes (cards that need more practice)
    const sortedProgress = allProgressFiltered.sort((a, b) => {
      // First by successes (fewer successes = more practice needed)
      if (a.successes !== b.successes) {
        return a.successes - b.successes;
      }
      // Then by last seen (older = prioritize)
      if (a.last_seen_at && b.last_seen_at) {
        return new Date(a.last_seen_at).getTime() - new Date(b.last_seen_at).getTime();
      }
      if (!a.last_seen_at) return -1;
      if (!b.last_seen_at) return 1;
      return 0;
    });
    
    console.log(`[7] Sorted progress cards: ${sortedProgress.map(p => `${p.word} (successes: ${p.successes})`).join(', ')}`);
    const progress = sortedProgress[0];
    const matchingCard = allStaticCards.find(c => c.plainText === progress.word);
    if (matchingCard) {
      console.log(`✅ Selected: [PRACTICE] ${progress.word}`);
      const card = await createLearningCardFromProgress(childId, currentLesson, progress, matchingCard);
      console.log(`=== getNextCard END ===\n`);
      return card;
    }
  }
  
  // Only return null if child has literally never seen any card (brand new child)
  console.log(`❌ No cards available - child has no progress yet`);
  console.log(`=== getNextCard END ===\n`);
  return null;
}

/**
 * Create a LearningCard from existing CardProgress
 */
async function createLearningCardFromProgress(
  childId: string,
  level: number,
  progress: CardProgress,
  distarCard: DistarCard
): Promise<LearningCard> {
  console.log(`📋 Creating card from EXISTING progress "${progress.word}": next_review_at=${progress.next_review_at}, attempts=${progress.attempts}, successes=${progress.successes}`);
  return {
    word: progress.word,
    phonemes: distarCard.phonemes,
    imageUrl: distarCard.imagePath,
    progress,
    level,
    distarCard,
  };
}


