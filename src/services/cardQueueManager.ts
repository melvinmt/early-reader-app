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
  getLearningCards,
  incrementCardsSinceLastSeen,
  resetCardsSinceLastSeen,
  getSessionCardsForDate,
  saveSessionCardsForDate,
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
export function getAllStaticCards(): DistarCard[] {
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
  isReplay: boolean;
}

export const CARDS_PER_SESSION = 20; // Fixed 20 cards per lesson
const MIN_NEW_CARDS_PER_SESSION = 4; // Guaranteed new cards each session for progression
const MIN_GRADUATED_REVIEWS = 4; // Minimum slots for graduated review cards
const MIN_CARDS_FOR_LEVEL_UP = 20;

// CVC mastery thresholds
const CVC_MASTERY_EASE_FACTOR = 2.5;
const CVC_MASTERY_INTERVAL_DAYS = 7;

/**
 * Check if child has mastered CVC words (enough CVC cards with high ease factor and interval)
 */
async function hasCVCMastery(childId: string): Promise<boolean> {
  const allProgress = await getAllCardsForChild(childId);
  const allCards = getAllStaticCards();
  
  // Get all CVC cards the child has seen
  const cvcProgress = allProgress.filter(progress => {
    const card = allCards.find(c => c.plainText === progress.word);
    return card?.type === 'cvc';
  });
  
  if (cvcProgress.length === 0) {
    return false; // No CVC cards seen yet
  }
  
  // Count mastered CVC cards (ease_factor >= 2.5 and interval_days >= 7)
  const masteredCVC = cvcProgress.filter(progress => 
    (progress.ease_factor ?? 0) >= CVC_MASTERY_EASE_FACTOR &&
    (progress.interval_days ?? 0) >= CVC_MASTERY_INTERVAL_DAYS
  );
  
  // Consider CVC mastered if at least 50% of seen CVC cards are mastered
  const masteryRatio = masteredCVC.length / cvcProgress.length;
  return masteryRatio >= 0.5;
}

// ============================================
// SCREENSHOT MODE - Hardcoded cards for App Store screenshots
// Set to true to show only these specific cards in order
// ============================================
export const SCREENSHOT_MODE = false;
const SCREENSHOT_CARD_IDS = [
  '048-at',          // word "at" (a+t)
  '049-sat',         // word "sat" (s+a+t)
  '077-cat',         // word "cat" (c+a+t)
  '537-made',        // word "made" (m+a+d)
  '637-the-cat-sat', // sentence "the cat sat"
];
let screenshotCardIndex = 0;

/**
 * Get screenshot cards for App Store screenshots
 * Returns hardcoded cards in a specific order
 */
function getScreenshotCards(): LearningCard[] {
  const allCards = getAllStaticCards();
  const screenshotCards: LearningCard[] = [];
  
  for (const cardId of SCREENSHOT_CARD_IDS) {
    const distarCard = allCards.find(c => c.id === cardId);
    if (distarCard) {
      screenshotCards.push({
        word: distarCard.plainText,
        phonemes: distarCard.phonemes,
        imageUrl: distarCard.imagePath,
        progress: null,
        level: distarCard.lesson,
        distarCard,
      });
    }
  }
  
  return screenshotCards;
}

/**
 * Get next screenshot card (cycles through the list)
 */
export function getNextScreenshotCard(): LearningCard | null {
  const cards = getScreenshotCards();
  if (cards.length === 0) return null;
  
  const card = cards[screenshotCardIndex % cards.length];
  screenshotCardIndex++;
  return card;
}

/**
 * Reset screenshot card index (call when starting a new session)
 */
export function resetScreenshotMode(): void {
  screenshotCardIndex = 0;
}

/**
 * Get the next queue of cards for a child
 */
export async function getCardQueue(childId: string): Promise<CardQueueResult> {
  // Screenshot mode: return hardcoded cards for App Store screenshots
  if (SCREENSHOT_MODE) {
    const screenshotCards = getScreenshotCards();
    return {
      cards: screenshotCards,
      hasMore: true,
      currentLevel: 1,
      isReplay: false,
    };
  }

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

  const sessionDate = getLocalDateKey(new Date());
  const staticCards = getAllStaticCards();
  const sessionCards = await getSessionCardsForDate(childId, sessionDate);

  if (sessionCards.length > 0) {
    const allProgress = await getAllCardsForChild(childId);
    const progressByWord = new Map(allProgress.map(progress => [progress.word, progress]));
    const replayCards: LearningCard[] = [];

    for (const word of sessionCards) {
      const matchingStatic = staticCards.find(c => c.plainText === word);
      if (matchingStatic) {
        replayCards.push({
          word,
          phonemes: matchingStatic.phonemes,
          imageUrl: matchingStatic.imagePath,
          distarCard: matchingStatic,
          progress: progressByWord.get(word) ?? null,
          level: currentLevel,
        });
      }
    }

    // Exact same session for replays, no level advancement
    return {
      cards: replayCards,
      hasMore: true,
      currentLevel,
      isReplay: true,
    };
  }

  // Get seen words for new session generation
  const database = await initDatabase();
  const existingWords = await database.getAllAsync<{ word: string }>(
    `SELECT DISTINCT word FROM card_progress WHERE child_id = ?`,
    [childId]
  );
  const seenWords = new Set(existingWords.map(w => w.word));

  // Check with CURRENT phonemes if there are unseen cards
  let introducedPhonemes = await getIntroducedPhonemes(childId);
  let unlockedCards = getUnlockedCards(staticCards, introducedPhonemes);
  
  // NOT a replay - introduce phonemes for current lesson and previous lessons
  // Stop as soon as we have EXACTLY enough cards (to prevent over-introduction)
  for (let lesson = 1; lesson <= currentLevel; lesson++) {
    // Check if we already have enough cards
    introducedPhonemes = await getIntroducedPhonemes(childId);
    unlockedCards = getUnlockedCards(staticCards, introducedPhonemes);
    if (unlockedCards.filter(c => !seenWords.has(c.plainText)).length >= CARDS_PER_SESSION) {
      break;
    }
    
    const lessonPhonemes = await getUnintroducedPhonemesForLesson(childId, lesson);
    for (const phoneme of lessonPhonemes) {
      await markPhonemeAsIntroduced(childId, phoneme);
      
      // Check after each phoneme if we have enough
      introducedPhonemes = await getIntroducedPhonemes(childId);
      unlockedCards = getUnlockedCards(staticCards, introducedPhonemes);
      if (unlockedCards.filter(c => !seenWords.has(c.plainText)).length >= CARDS_PER_SESSION) {
        break;
      }
    }
  }
  
  // Refresh unlocked cards
  introducedPhonemes = await getIntroducedPhonemes(childId);
  unlockedCards = getUnlockedCards(staticCards, introducedPhonemes);
  
  // If still not enough, introduce from future lessons (one phoneme at a time)
  let lessonToCheck = currentLevel + 1;
  while (unlockedCards.filter(c => !seenWords.has(c.plainText)).length < CARDS_PER_SESSION && lessonToCheck <= 100) {
    const lessonPhonemes = await getUnintroducedPhonemesForLesson(childId, lessonToCheck);
    for (const phoneme of lessonPhonemes) {
      await markPhonemeAsIntroduced(childId, phoneme);
      
      introducedPhonemes = await getIntroducedPhonemes(childId);
      unlockedCards = getUnlockedCards(staticCards, introducedPhonemes);
      if (unlockedCards.filter(c => !seenWords.has(c.plainText)).length >= CARDS_PER_SESSION) {
        break;
      }
    }
    if (unlockedCards.filter(c => !seenWords.has(c.plainText)).length >= CARDS_PER_SESSION) {
      break;
    }
    lessonToCheck++;
  }

  // Get due review cards (spaced repetition)
  const allDueCards = await getDueReviewCards(childId, CARDS_PER_SESSION * 2);
  
  // Separate learning cards (step 0-2) from graduated cards (step 3+)
  const learningDueCards = allDueCards.filter(p => (p.learning_step ?? 3) < 3);
  const graduatedDueCards = allDueCards.filter(p => (p.learning_step ?? 3) >= 3);
  
  // Prioritize struggled cards first within each category
  const sortByStruggle = (cards: CardProgress[]) => {
    cards.sort((a, b) => {
      const failA = (a.attempts ?? 0) - (a.successes ?? 0);
      const failB = (b.attempts ?? 0) - (b.successes ?? 0);
      if (failA !== failB) {
        return failB - failA;
      }
      return new Date(a.next_review_at).getTime() - new Date(b.next_review_at).getTime();
    });
    return cards;
  };
  
  sortByStruggle(learningDueCards);
  sortByStruggle(graduatedDueCards);
  
  // Calculate how many slots for each card type:
  // Session = 20 cards total
  // 1. Reserve MIN_GRADUATED_REVIEWS (4) slots for graduated reviews
  // 2. Guarantee MIN_NEW_CARDS_PER_SESSION (4) slots for new cards
  // 3. PRIORITIZE learning cards for remaining slots (12) - they MUST graduate
  // 
  // This ensures:
  // - Learning cards get reviewed enough to graduate (3x per card)
  // - New cards ALWAYS introduced (4 per session minimum)
  // - Graduated cards get regular spaced repetition
  
  const reservedForGraduated = Math.min(graduatedDueCards.length, MIN_GRADUATED_REVIEWS);
  const reservedForNew = MIN_NEW_CARDS_PER_SESSION;
  const learningSlots = CARDS_PER_SESSION - reservedForGraduated - reservedForNew;
  
  // Fill learning slots with as many learning cards as possible
  const learningCards = learningDueCards.slice(0, learningSlots);
  
  // Fill graduated slots
  const graduatedCards = graduatedDueCards.slice(0, reservedForGraduated);
  
  console.log(`📊 Session composition: ${learningCards.length}/${learningDueCards.length} learning, ${graduatedCards.length} graduated, up to ${reservedForNew} new`);
  
  // Combine due cards: learning first (need to graduate), then graduated
  const dueCards = [...learningCards, ...graduatedCards];
  
  // Always surface recently failed cards even if they aren't due yet
  const allProgress = await getAllCardsForChild(childId);
  const failedCards = allProgress.filter(
    (progress) => (progress.attempts ?? 0) > (progress.successes ?? 0)
  );
  const dueWords = new Set(dueCards.map(p => p.word));
  const failedNotDue = failedCards.filter(p => !dueWords.has(p.word));
  
  // IMPORTANT: Cap review cards to guarantee slots for new cards
  // We MUST always have MIN_NEW_CARDS_PER_SESSION slots for new cards
  // to ensure curriculum progression
  const maxDueCards = CARDS_PER_SESSION - MIN_NEW_CARDS_PER_SESSION;
  const combinedDue = [...failedNotDue, ...dueCards];
  const prioritizedDue = combinedDue.slice(0, maxDueCards);

  // Generate new cards - guaranteed MIN_NEW_CARDS_PER_SESSION slots for progression
  // The cap above ensures we always have room for new cards
  const newCardSlots = Math.min(
    CARDS_PER_SESSION - prioritizedDue.length,
    MIN_NEW_CARDS_PER_SESSION
  );
  const newCards: LearningCard[] = [];
  const repeatCards: CardProgress[] = [];

  if (newCardSlots > 0) {
    // Generate new cards from static DISTAR cards (only using already-introduced phonemes)
    for (let i = 0; i < newCardSlots; i++) {
      try {
        const card = await generateNewCardFromStatic(childId, currentLevel);
        if (card) {
          newCards.push(card);
        } else {
          // No more new cards available with current phonemes
          break;
        }
      } catch (error) {
        console.error('Error loading static card:', error);
      }
    }
  }

  // If we still don't have enough cards, fill with repeat review cards
  // to ensure we always serve a full session of 20 cards.
  const remainingNeeded = CARDS_PER_SESSION - (prioritizedDue.length + newCards.length);
  if (remainingNeeded > 0) {
    const excluded = new Set<string>([
      ...prioritizedDue.map(p => p.word),
      ...newCards.map(c => c.word),
    ]);

    // First try existing progress records
    for (const progress of allProgress) {
      if (!excluded.has(progress.word)) {
        repeatCards.push(progress);
        excluded.add(progress.word);
      }
      if (repeatCards.length >= remainingNeeded) {
        break;
      }
    }
    
    // If still not enough, try to get more unlocked cards that we haven't seen yet
    // This handles early lessons where progress pool is small
    if (repeatCards.length < remainingNeeded) {
      const currentIntroducedPhonemes = await getIntroducedPhonemes(childId);
      const currentUnlockedCards = getUnlockedCards(staticCards, currentIntroducedPhonemes);
      
      for (const card of currentUnlockedCards) {
        if (!excluded.has(card.plainText)) {
          try {
            const learningCard = await createLearningCardFromDistar(childId, currentLevel, card);
            if (learningCard) {
              newCards.push(learningCard);
              excluded.add(card.plainText);
            }
          } catch (e) {
            // Skip cards that fail to create
          }
        }
        if (newCards.length + prioritizedDue.length + repeatCards.length >= CARDS_PER_SESSION) {
          break;
        }
      }
    }
  }

  // Combine due cards and new cards
  const allCards: LearningCard[] = [
    ...prioritizedDue.map((progress) => ({
      word: progress.word,
      phonemes: [], // Will be loaded from cache or regenerated
      imageUrl: '', // Will be loaded from cache
      progress,
      level: currentLevel,
    })),
    ...repeatCards.map((progress) => ({
      word: progress.word,
      phonemes: [],
      imageUrl: '',
      progress,
      level: currentLevel,
    })),
    ...newCards,
  ];

  // Load full card data for due cards (from static cards only - no cache fallback for stale cards)
  // staticCards was already declared earlier in this function
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

  // Order cards by pedagogical type: phonemes → CVC → words → sentences
  // This ensures building blocks are taught before complex combinations
  const orderedByType = orderCardsByType(validCards.slice(0, CARDS_PER_SESSION));
  
  // Then prevent consecutive duplicates (same word back-to-back)
  const reorderedCards = preventConsecutiveDuplicates(orderedByType);

  // Persist this session for same-day replays
  await saveSessionCardsForDate(
    childId,
    sessionDate,
    reorderedCards.map(card => card.word)
  );

  // Level = number of unique sessions played
  // If we reach here, it's NOT a replay (replays exit early above)
  // So this is a unique session with new cards - advance level
  await updateChildLevel(childId, currentLevel + 1);

  return {
    cards: reorderedCards,
    hasMore: validCards.length >= CARDS_PER_SESSION,
    currentLevel, // Return the level at session start
    isReplay: false,
  };
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get the pedagogical order priority for a card type
 * Lower number = shown earlier in session
 */
function getCardTypePriority(card: LearningCard): number {
  const type = card.distarCard?.type;
  switch (type) {
    case 'letter':
    case 'digraph':
      return 0; // Phonemes first - building blocks
    case 'cvc':
      return 1; // CVC words next - simple combinations
    case 'word':
      return 2; // Regular words after
    case 'sentence':
      return 3; // Sentences last - complex combinations
    default:
      return 2; // Default to word level if unknown
  }
}

/**
 * Order cards by pedagogical type for optimal learning sequence
 * Order: phonemes → CVC → words → sentences
 * Within each type, maintain the original order (due cards first, then new)
 */
function orderCardsByType(cards: LearningCard[]): LearningCard[] {
  // Stable sort by type priority
  return [...cards].sort((a, b) => {
    const priorityA = getCardTypePriority(a);
    const priorityB = getCardTypePriority(b);
    return priorityA - priorityB;
  });
}

/**
 * Reorder cards to ensure no consecutive duplicates (same word back-to-back)
 * Uses a simple swap algorithm: if current card matches previous, swap with next different card
 */
function preventConsecutiveDuplicates(cards: LearningCard[]): LearningCard[] {
  if (cards.length <= 1) return cards;
  
  const result = [...cards];
  
  for (let i = 1; i < result.length; i++) {
    if (result[i].word === result[i - 1].word) {
      // Find the next card with a different word to swap with
      let swapIndex = -1;
      for (let j = i + 1; j < result.length; j++) {
        if (result[j].word !== result[i - 1].word) {
          swapIndex = j;
          break;
        }
      }
      
      if (swapIndex !== -1) {
        // Swap cards
        [result[i], result[swapIndex]] = [result[swapIndex], result[i]];
      }
      // If no swap candidate found, we can't fix this duplicate (rare edge case)
    }
  }
  
  return result;
}

/**
 * Get recent card types to balance selection
 * Returns counts of phonemes and words from last N cards
 */
async function getRecentCardTypeCounts(
  childId: string,
  lookbackCount: number = 10
): Promise<{ phonemeCount: number; wordCount: number; sentenceCount: number }> {
  const database = await initDatabase();
  const recentCards = await database.getAllAsync<{ word: string }>(
    `SELECT word FROM card_progress 
     WHERE child_id = ? AND last_seen_at IS NOT NULL
     ORDER BY last_seen_at DESC
     LIMIT ?`,
    [childId, lookbackCount]
  );
  
  const allStaticCards = getAllStaticCards();
  let phonemeCount = 0;
  let wordCount = 0;
  let sentenceCount = 0;
  
  for (const card of recentCards) {
    const staticCard = allStaticCards.find(c => c.plainText === card.word);
    if (staticCard) {
      if (staticCard.type === 'letter' || staticCard.type === 'digraph') {
        phonemeCount++;
      } else if (staticCard.type === 'word') {
        wordCount++;
      } else if (staticCard.type === 'sentence') {
        sentenceCount++;
      }
    }
  }
  
  return { phonemeCount, wordCount, sentenceCount };
}

/**
 * Generate a new learning card from pre-generated DISTAR cards
 * Uses curriculum-aware selection: only shows unlocked cards
 * Also introduces new phonemes for the current lesson when needed
 * Balances phonemes and words using a 2:3 ratio
 */
async function generateNewCardFromStatic(
  childId: string,
  level: number
): Promise<LearningCard | null> {
  // Get child info to determine current lesson
  const child = await getChild(childId);
  if (!child) {
    return null;
  }
  const currentLesson = child.current_level;
  
  // Get all words this child has already seen
  const database = await initDatabase();
  const existingWords = await database.getAllAsync<{ word: string }>(
    `SELECT DISTINCT word FROM card_progress WHERE child_id = ?`,
    [childId]
  );
  const seenWords = new Set(existingWords.map(w => w.word));
  
  // Get introduced phonemes to determine unlocked cards
  let introducedPhonemes = await getIntroducedPhonemes(childId);
  
  // Get all static cards
  const allCards = getAllStaticCards();
  
  // Check for unintroduced phonemes for current lesson - introduce them to unlock more cards
  const unintroducedPhonemes = await getUnintroducedPhonemesForLesson(childId, currentLesson);
  if (unintroducedPhonemes.length > 0) {
    // Introduce the first unintroduced phoneme to unlock more cards
    const phonemeToIntroduce = unintroducedPhonemes[0];
    await markPhonemeAsIntroduced(childId, phonemeToIntroduce);
    introducedPhonemes = [...introducedPhonemes, phonemeToIntroduce.toLowerCase()];
  }
  
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
  
  // Get recent card type counts to balance selection
  const recentCounts = await getRecentCardTypeCounts(childId, 10);
  
  // Separate cards by type (hierarchy: phonemes > CVC > words > sentences)
  const phonemeCards = availableCards.filter(c => c.type === 'letter' || c.type === 'digraph');
  const cvcCards = availableCards.filter(c => c.type === 'cvc');
  const wordCards = availableCards.filter(c => c.type === 'word');
  const sentenceCards = availableCards.filter(c => c.type === 'sentence');
  
  // Check CVC mastery
  const cvcMastered = await hasCVCMastery(childId);
  
  // Use 2:3 ratio (phonemes:words) - aim for 2 phonemes per 3 words
  // If we've had 2+ phonemes in last 10 cards, prioritize words
  // If we've had 3+ words in last 10 cards, allow phonemes
  let targetCards: DistarCard[] = [];
  
  // Calculate ratio: if phonemeCount/wordCount > 2/3, prioritize words
  const shouldPrioritizeWords = recentCounts.wordCount === 0 || 
    (recentCounts.phonemeCount / recentCounts.wordCount) > (2 / 3);
  
  // Hierarchy: phonemes > CVC > words > sentences
  // Prioritize CVC words until mastery, then regular words
  if (shouldPrioritizeWords) {
    if (!cvcMastered && cvcCards.length > 0) {
      // CVC not mastered - prioritize CVC words
      targetCards = cvcCards;
    } else if (wordCards.length > 0 || sentenceCards.length > 0) {
      // CVC mastered or no CVC cards - prioritize regular words, allow sentences later
      targetCards = sentenceCards.length > 0 ? [...wordCards, ...sentenceCards] : wordCards;
    } else if (cvcCards.length > 0) {
      // Fall back to CVC if no regular words
      targetCards = cvcCards;
    } else if (phonemeCards.length > 0) {
      // Fall back to phonemes if no CVC or words
      targetCards = phonemeCards;
    }
  } else if (phonemeCards.length > 0) {
    // Use phonemes if available and ratio allows
    targetCards = phonemeCards;
  } else if (!cvcMastered && cvcCards.length > 0) {
    // No phonemes available, prioritize CVC if not mastered
    targetCards = cvcCards;
  } else if (wordCards.length > 0 || sentenceCards.length > 0) {
    // Fall back to words; allow sentences once CVC is mastered
    targetCards = sentenceCards.length > 0 ? [...wordCards, ...sentenceCards] : wordCards;
  }
  
  if (targetCards.length === 0) {
    return null;
  }
  
  // Select a random card from the target group
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
    // Create initial progress entry for a NEW card
    // Set learning_step = 0 to enter learning phase
    const progressId = `${childId}-${distarCard.plainText}-${Date.now()}`;
    const now = new Date();
    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + 1); // 1 day from now (fallback if not shown in learning phase)
    
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
      learning_step: 0, // Start in learning phase
      cards_since_last_seen: 0, // No cards shown yet
    };

    console.log(`📝 Creating NEW progress for "${distarCard.plainText}": learning_step = 0 (learning phase)`);
    await createOrUpdateCardProgress(progress);
  } else {
    console.log(`📝 Using EXISTING progress for "${distarCard.plainText}": learning_step = ${progress.learning_step ?? 3}, attempts = ${progress.attempts}, successes = ${progress.successes}`);
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
    pronunciationFailed?: boolean; // Optional: true if pronunciation check failed
    countAsCompleted?: boolean; // Optional: set false for same-day replays
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
      learning_step: 0, // Start in learning phase
      cards_since_last_seen: 0,
    };
    await createOrUpdateCardProgress(progress);
  }

  // Calculate SM-2 quality rating
  let quality = mapPronunciationToQuality(
    result.matchScore,
    result.attempts,
    result.neededHelp
  );

  // Apply pronunciation penalty if pronunciation check failed
  // Reduce quality by 1 (e.g., quality 5 becomes 4)
  // This increases review frequency for words the child struggles to pronounce
  if (result.pronunciationFailed) {
    quality = Math.max(0, quality - 1);
    console.log(`🔊 Pronunciation penalty applied for "${word}": quality reduced to ${quality}`);
  }

  // Handle learning step progression
  const currentLearningStep = progress.learning_step ?? 3; // Default to graduated (3) for existing cards
  let nextLearningStep = currentLearningStep;
  let nextReviewDate: string;
  let nextIntervalDays: number;
  let nextEaseFactor: number;

  if (currentLearningStep < 3) {
    // Card is in learning phase (step 0-2)
    if (result.success && quality >= 3) {
      // Successfully completed this learning step - advance to next step
      nextLearningStep = currentLearningStep + 1;
      console.log(`📚 Learning step progression for "${word}": ${currentLearningStep} → ${nextLearningStep}`);
      
      if (nextLearningStep >= 3) {
        // Graduated to SM-2! Use standard spaced repetition
        const sm2Result = calculateSM2({
          quality,
          easeFactor: progress.ease_factor,
          intervalDays: 1, // Start with 1 day interval after graduation
          repetitions: 0, // Reset repetitions for SM-2
        });
        nextEaseFactor = sm2Result.nextEaseFactor;
        nextIntervalDays = sm2Result.nextInterval;
        nextReviewDate = sm2Result.nextReviewDate;
        console.log(`🎓 Card "${word}" graduated to SM-2! next_review_at = ${nextReviewDate}`);
      } else {
        // Still in learning phase - set next_review_at to TOMORROW
        // This ensures cards rotate across days instead of repeating the same cards
        // Session persistence handles same-day replays, so we don't need immediate due
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0); // Start of next day
        nextReviewDate = tomorrow.toISOString();
        nextIntervalDays = 1;
        nextEaseFactor = progress.ease_factor;
        console.log(`📖 Card "${word}" still in learning phase (step ${nextLearningStep}), due tomorrow`);
      }
    } else {
      // Failed or poor quality - stay at current step
      // For failed cards, set to due tomorrow so child gets fresh practice next day
      // Same-day retries are handled by session persistence
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      nextReviewDate = tomorrow.toISOString();
      nextIntervalDays = 1;
      nextEaseFactor = progress.ease_factor;
      console.log(`❌ Card "${word}" failed/low quality, due tomorrow for retry`);
    }
  } else {
    // Card is graduated (step 3+) - use standard SM-2
    const sm2Result = calculateSM2({
      quality,
      easeFactor: progress.ease_factor,
      intervalDays: progress.interval_days,
      repetitions: progress.attempts,
    });
    nextEaseFactor = sm2Result.nextEaseFactor;
    nextIntervalDays = sm2Result.nextInterval;
    nextReviewDate = sm2Result.nextReviewDate;
  }

  // Update progress
  const updatedProgress: CardProgress = {
    ...progress,
    ease_factor: nextEaseFactor,
    interval_days: nextIntervalDays,
    next_review_at: nextReviewDate,
    learning_step: nextLearningStep,
    cards_since_last_seen: 0, // Reset when card is shown
    attempts: progress.attempts + 1,
    successes: result.success ? progress.successes + 1 : progress.successes,
    last_seen_at: new Date().toISOString(),
    hint_used: result.neededHelp ? 1 : (progress.hint_used ?? 0), // Track hint usage (persist if previously used)
  };

  console.log(`💾 Saving progress for "${word}": success=${result.success}, quality=${quality}, next_review_at=${updatedProgress.next_review_at}, attempts=${updatedProgress.attempts}, successes=${updatedProgress.successes}`);
  await createOrUpdateCardProgress(updatedProgress);

  // Increment child's total cards completed if successful
  const shouldCountCompletion = result.countAsCompleted !== false;
  if (result.success && shouldCountCompletion) {
    await incrementChildCardsCompleted(childId);
  }
  
  // Note: Level progression is handled at session start in getCardQueue()
  // This ensures level never exceeds session count (max 1 level up per session)
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
      // Increment spacing counter for all learning cards
      await incrementCardsSinceLastSeen(childId);
      const card = await createLearningCardFromProgress(childId, currentLesson, progress, matchingCard);
      console.log(`=== getNextCard END ===\n`);
      return card;
    }
  }
  
  // 2. Get LEARNING cards (step 0-2) with spacing check
  const learningCards = await getLearningCards(childId, 10);
  const safeLearningCards = learningCards || [];
  console.log(`[2] Learning cards: ${safeLearningCards.map(p => `${p.word} (step=${p.learning_step ?? 3}, since=${p.cards_since_last_seen ?? 0})`).join(', ')}`);
  
  // Filter by spacing requirements and exclude word
  const learningCardsFiltered = safeLearningCards.filter(progress => {
    if (excludeWord && progress.word === excludeWord) {
      return false;
    }
    
    const step = progress.learning_step ?? 3;
    const cardsSince = progress.cards_since_last_seen ?? 0;
    
    // Check if card is ready based on learning step and spacing
    if (step === 0) {
      return cardsSince >= 2; // Step 0: show after 2 cards
    } else if (step === 1) {
      return cardsSince >= 2; // Step 1: show after 2-3 cards (use 2 as minimum)
    } else if (step === 2) {
      return cardsSince >= 3; // Step 2: show after 3 cards
    }
    return false; // Step 3+ should not be in learning cards
  });
  
  console.log(`[2] Learning cards ready (spacing met): ${learningCardsFiltered.map(p => p.word).join(', ')}`);
  
  if (learningCardsFiltered.length > 0) {
    // Check recent card types to balance selection
    // If there are no words at all, allow phonemes
    const recentCounts = await getRecentCardTypeCounts(childId, 10);
    const shouldPrioritizeWords = (recentCounts.wordCount > 0 && recentCounts.phonemeCount > 0) && 
      (recentCounts.phonemeCount / recentCounts.wordCount) > (2 / 3);
    
    // Separate learning cards by type (hierarchy: phonemes > CVC > words > sentences)
    const learningCardsWithTypes = learningCardsFiltered.map(progress => {
      const matchingCard = allStaticCards.find(c => c.plainText === progress.word);
      const isPhoneme = matchingCard && (matchingCard.type === 'letter' || matchingCard.type === 'digraph');
      const isCVC = matchingCard && matchingCard.type === 'cvc';
      const isWord = matchingCard && matchingCard.type === 'word';
      return { progress, matchingCard, isPhoneme, isCVC, isWord };
    }).filter(item => item.matchingCard); // Only include cards that exist in static cards
    
    // Check CVC mastery
    const cvcMastered = await hasCVCMastery(childId);
    
    // If we should prioritize words, filter to word cards first (CVC before regular words if not mastered)
    let prioritizedCards = learningCardsWithTypes;
    if (shouldPrioritizeWords) {
      if (!cvcMastered) {
        // CVC not mastered - prioritize CVC words
        const cvcCards = learningCardsWithTypes.filter(item => item.isCVC);
        if (cvcCards.length > 0) {
          prioritizedCards = cvcCards;
        } else {
          // No CVC cards, fall back to regular words
          const wordCards = learningCardsWithTypes.filter(item => item.isWord);
          if (wordCards.length > 0) {
            prioritizedCards = wordCards;
          }
        }
      } else {
        // CVC mastered - prioritize regular words
        const wordCards = learningCardsWithTypes.filter(item => item.isWord);
        if (wordCards.length > 0) {
          prioritizedCards = wordCards;
        } else {
          // No regular words, fall back to CVC
          const cvcCards = learningCardsWithTypes.filter(item => item.isCVC);
          if (cvcCards.length > 0) {
            prioritizedCards = cvcCards;
          }
        }
      }
    }
    
    // Prioritize by step (lower step = higher priority) and then by cards_since_last_seen
    prioritizedCards.sort((a, b) => {
      const stepA = a.progress.learning_step ?? 3;
      const stepB = b.progress.learning_step ?? 3;
      if (stepA !== stepB) {
        return stepA - stepB;
      }
      const sinceA = a.progress.cards_since_last_seen ?? 0;
      const sinceB = b.progress.cards_since_last_seen ?? 0;
      return sinceB - sinceA; // Higher cards_since_last_seen = more ready
    });
    
    if (prioritizedCards.length > 0) {
      const { progress, matchingCard } = prioritizedCards[0];
      if (matchingCard) {
        console.log(`✅ Selected: [LEARNING] ${progress.word} (step=${progress.learning_step})`);
        // Reset the spacing counter for this specific card (it's being shown now)
        await resetCardsSinceLastSeen(childId, progress.word);
        // Increment spacing counter for all other learning cards
        await incrementCardsSinceLastSeen(childId);
        const card = await createLearningCardFromProgress(childId, currentLesson, progress, matchingCard);
        console.log(`=== getNextCard END ===\n`);
        return card;
      }
    }
  }
  
  // 3. Get new phonemes for current lesson (only if we haven't had too many phonemes recently)
  // Check if we've already introduced MIN_NEW_CARDS_PER_SESSION new cards in this session
  const database = await initDatabase();
  const sessionNewCards = await database.getAllAsync<{ word: string }>(
    `SELECT word FROM card_progress 
     WHERE child_id = ? AND learning_step = 0 AND last_seen_at >= datetime('now', '-1 hour')
     ORDER BY last_seen_at DESC
     LIMIT ?`,
    [childId, MIN_NEW_CARDS_PER_SESSION]
  );
  
  const canIntroduceNewCard = sessionNewCards.length < MIN_NEW_CARDS_PER_SESSION;
  console.log(`[3] New cards this session: ${sessionNewCards.length}/${MIN_NEW_CARDS_PER_SESSION}, can introduce: ${canIntroduceNewCard}`);
  
  // Check recent card types - only introduce new phonemes if we haven't had too many recently
  // If there are no words at all (wordCount === 0 and phonemeCount === 0), allow phonemes
  const recentCounts = await getRecentCardTypeCounts(childId, 10);
  const shouldSkipPhonemes = (recentCounts.wordCount > 0 && recentCounts.phonemeCount > 0) && 
    (recentCounts.phonemeCount / recentCounts.wordCount) > (2 / 3);
  
  if (canIntroduceNewCard && !shouldSkipPhonemes) {
    const unintroducedPhonemes = await getUnintroducedPhonemesForLesson(childId, currentLesson);
    console.log(`[3] Unintroduced phonemes for lesson ${currentLesson}: ${unintroducedPhonemes.join(', ')}`);
    if (unintroducedPhonemes.length > 0) {
      const phonemeSymbol = unintroducedPhonemes[0];
      const phonemeCard = allStaticCards.find(
        c => (c.type === 'letter' || c.type === 'digraph') && c.plainText.toLowerCase() === phonemeSymbol.toLowerCase()
      );
      if (phonemeCard && (!excludeWord || phonemeCard.plainText !== excludeWord)) {
        console.log(`✅ Selected: [NEW PHONEME] ${phonemeCard.plainText}`);
        // Mark as introduced when we show it
        await markPhonemeAsIntroduced(childId, phonemeSymbol);
        // Increment spacing counter for all learning cards
        await incrementCardsSinceLastSeen(childId);
        const card = await createLearningCardFromDistar(childId, currentLesson, phonemeCard);
        console.log(`=== getNextCard END ===\n`);
        return card;
      } else if (phonemeCard && excludeWord === phonemeCard.plainText) {
        console.log(`[3] Skipped phoneme ${phonemeCard.plainText} (excluded)`);
      }
    }
  } else {
    if (!canIntroduceNewCard) {
      console.log(`[3] Skipping new phonemes - already at max new cards per session`);
    } else {
      console.log(`[3] Skipping new phonemes - too many phonemes recently (${recentCounts.phonemeCount} phonemes, ${recentCounts.wordCount} words)`);
    }
  }
  
  // 4. Get MEDIUM priority due review cards (hint used)
  const mediumPriorityDue = await getDueReviewCardsByPriority(childId, 'medium', 5);
  console.log(`[4] MEDIUM priority due cards: ${mediumPriorityDue.map(p => p.word).join(', ')}`);
  const mediumPriorityFiltered = excludeWord 
    ? mediumPriorityDue.filter(p => p.word !== excludeWord)
    : mediumPriorityDue;
  console.log(`[4] MEDIUM priority after exclude: ${mediumPriorityFiltered.map(p => p.word).join(', ')}`);
  if (mediumPriorityFiltered.length > 0) {
    const progress = mediumPriorityFiltered[0];
    const matchingCard = allStaticCards.find(c => c.plainText === progress.word);
    if (matchingCard) {
      console.log(`✅ Selected: [MEDIUM] ${progress.word}`);
      // Increment spacing counter for all learning cards
      await incrementCardsSinceLastSeen(childId);
      const card = await createLearningCardFromProgress(childId, currentLesson, progress, matchingCard);
      console.log(`=== getNextCard END ===\n`);
      return card;
    }
  }
  
  // 5. Get unlocked word cards (all phonemes introduced)
  // Check if we can still introduce new cards
  if (canIntroduceNewCard) {
    const seenWords = await database.getAllAsync<{ word: string }>(
      `SELECT DISTINCT word FROM card_progress WHERE child_id = ?`,
      [childId]
    );
    const seenWordsSet = new Set(seenWords.map(w => w.word));
    console.log(`[5] Already seen words: ${Array.from(seenWordsSet).join(', ')}`);
    
    // Get introduced phonemes
    const introducedPhonemes = await getIntroducedPhonemes(childId);
    console.log(`[5] Introduced phonemes: ${introducedPhonemes.join(', ')}`);
    
    // Get unlocked cards
    const unlockedCards = getUnlockedCards(allStaticCards, introducedPhonemes);
    console.log(`[5] All unlocked cards: ${unlockedCards.map(c => c.plainText).join(', ')}`);
    
    // Filter to words/sentences that haven't been seen (hierarchy: CVC > words > sentences)
    const newUnlockedCards = unlockedCards.filter(
      card => card.type !== 'letter' && card.type !== 'digraph' && !seenWordsSet.has(card.plainText) && (!excludeWord || card.plainText !== excludeWord)
    );
    console.log(`[5] New unlocked cards (not seen, not excluded): ${newUnlockedCards.map(c => c.plainText).join(', ')}`);
    
    if (newUnlockedCards.length > 0) {
      // Check CVC mastery
      const cvcMastered = await hasCVCMastery(childId);
      
      // Prioritize by hierarchy: CVC (if not mastered) > words > sentences
      let targetCard: DistarCard | null = null;
      if (!cvcMastered) {
        // CVC not mastered - prioritize CVC words
        const cvcCards = newUnlockedCards.filter(c => c.type === 'cvc');
        if (cvcCards.length > 0) {
          targetCard = cvcCards[0];
        } else {
          // No CVC cards, fall back to regular words
          const wordCards = newUnlockedCards.filter(c => c.type === 'word');
          targetCard = wordCards.length > 0 ? wordCards[0] : newUnlockedCards[0];
        }
      } else {
        // CVC mastered - prioritize regular words
        const wordCards = newUnlockedCards.filter(c => c.type === 'word');
        if (wordCards.length > 0) {
          targetCard = wordCards[0];
        } else {
          // No regular words, fall back to CVC or sentences
          const cvcCards = newUnlockedCards.filter(c => c.type === 'cvc');
          targetCard = cvcCards.length > 0 ? cvcCards[0] : newUnlockedCards[0];
        }
      }
      
      if (targetCard) {
        console.log(`✅ Selected: [UNLOCKED] ${targetCard.plainText} (${targetCard.type})`);
        // Increment spacing counter for all learning cards
        await incrementCardsSinceLastSeen(childId);
        const card = await createLearningCardFromDistar(childId, currentLesson, targetCard);
        console.log(`=== getNextCard END ===\n`);
        return card;
      }
    }
  } else {
    console.log(`[5] Skipping unlocked cards - already at max new cards per session`);
  }
  
  // 6. Get LOW priority due review cards (fluent)
  const lowPriorityDue = await getDueReviewCardsByPriority(childId, 'low', 5);
  console.log(`[6] LOW priority due cards: ${lowPriorityDue.map(p => p.word).join(', ')}`);
  const lowPriorityFiltered = excludeWord 
    ? lowPriorityDue.filter(p => p.word !== excludeWord)
    : lowPriorityDue;
  console.log(`[6] LOW priority after exclude: ${lowPriorityFiltered.map(p => p.word).join(', ')}`);
  if (lowPriorityFiltered.length > 0) {
    const progress = lowPriorityFiltered[0];
    const matchingCard = allStaticCards.find(c => c.plainText === progress.word);
    if (matchingCard) {
      console.log(`✅ Selected: [LOW] ${progress.word}`);
      // Increment spacing counter for all learning cards
      await incrementCardsSinceLastSeen(childId);
      const card = await createLearningCardFromProgress(childId, currentLesson, progress, matchingCard);
      console.log(`=== getNextCard END ===\n`);
      return card;
    }
  }
  
  // 7. If we've exhausted all priority options, try to get any due card as fallback
  const fallbackDue = await getDueReviewCards(childId, 10);
  const safeFallbackDue = fallbackDue || [];
  console.log(`[7] Fallback due cards: ${safeFallbackDue.map(p => p.word).join(', ')}`);
  const fallbackFiltered = excludeWord 
    ? safeFallbackDue.filter(p => p.word !== excludeWord)
    : safeFallbackDue;
  console.log(`[7] Fallback after exclude: ${fallbackFiltered.map(p => p.word).join(', ')}`);
  if (fallbackFiltered.length > 0) {
    const progress = fallbackFiltered[0];
    const matchingCard = allStaticCards.find(c => c.plainText === progress.word);
    if (matchingCard) {
      console.log(`✅ Selected: [FALLBACK] ${progress.word}`);
      // Increment spacing counter for all learning cards
      await incrementCardsSinceLastSeen(childId);
      const card = await createLearningCardFromProgress(childId, currentLesson, progress, matchingCard);
      console.log(`=== getNextCard END ===\n`);
      return card;
    }
  }
  
  // 8. Last resort: Get ANY card the child has seen before (allow continuous practice)
  // This ensures children can always keep practicing, even if no new cards or due cards available
  const allProgressCards = await getAllCardsForChild(childId);
  console.log(`[8] All progress cards: ${allProgressCards.map(p => `${p.word} (successes: ${p.successes}, next_review: ${p.next_review_at})`).join(', ')}`);
  const allProgressFiltered = excludeWord 
    ? allProgressCards.filter(p => p.word !== excludeWord)
    : allProgressCards;
  console.log(`[8] Progress cards after exclude: ${allProgressFiltered.map(p => p.word).join(', ')}`);
  
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
    
    console.log(`[8] Sorted progress cards: ${sortedProgress.map(p => `${p.word} (successes: ${p.successes})`).join(', ')}`);
    const progress = sortedProgress[0];
    const matchingCard = allStaticCards.find(c => c.plainText === progress.word);
    if (matchingCard) {
      console.log(`✅ Selected: [PRACTICE] ${progress.word}`);
      // Increment spacing counter for all learning cards
      await incrementCardsSinceLastSeen(childId);
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


