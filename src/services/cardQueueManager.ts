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
import { generateWord, generateImage, segmentPhonemes } from './ai/edgeFunctions';
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
  // Get all words this child has already seen to exclude them
  const database = await initDatabase();
  const existingWords = await database.getAllAsync<{ word: string }>(
    `SELECT DISTINCT word FROM card_progress WHERE child_id = ?`,
    [childId]
  );
  let excludedWords = existingWords.map(w => w.word);
  
  // Retry up to 5 times to get a unique word
  const maxRetries = 5;
  let attempts = 0;
  
  while (attempts < maxRetries) {
    try {
      // Generate word via AI, passing excluded words for variation
      const generated = await generateWord({
        level,
        phonemes,
        childId,
        excludedWords: excludedWords, // Pass excluded words to get variation
      });

      console.log('Generated word response:', { 
        word: generated.word, 
        hasImageUrl: !!generated.imageUrl,
        imageUrlLength: generated.imageUrl?.length || 0 
      });

      // Check if we already have progress for this word
      const existingProgress = await getCardProgress(childId, generated.word);

      if (existingProgress) {
        // Word already exists, add it to excluded list and try again
        excludedWords.push(generated.word);
        attempts++;
        console.log(`Word "${generated.word}" already exists, retrying (${attempts}/${maxRetries})...`);
        continue;
      }

      // If image URL is missing, generate it separately
      let finalImageUrl = generated.imageUrl;
      if (!finalImageUrl || finalImageUrl.trim() === '') {
        console.log('Image URL missing from word generation, generating image separately...');
        try {
          const imagePrompt = `A simple, friendly cartoon illustration of "${generated.word}", child-friendly style, white background, no text`;
          finalImageUrl = await generateImage(imagePrompt);
          console.log('Image generated successfully:', !!finalImageUrl);
        } catch (imageError) {
          console.error('Failed to generate image:', imageError);
          // Continue without image - it's optional
        }
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
          imageUrl: finalImageUrl,
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
        imageUrl: finalImageUrl,
        progress,
        level,
      };
    } catch (error) {
      console.error(`Error generating new card (attempt ${attempts + 1}/${maxRetries}):`, error);
      attempts++;
      
      // If we've exhausted retries, return null
      if (attempts >= maxRetries) {
        console.error('Failed to generate unique card after', maxRetries, 'attempts');
        return null;
      }
      
      // Wait a bit before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 100 * attempts));
    }
  }
  
  // If we get here, we've exhausted all retries
  console.error('Failed to generate unique card after', maxRetries, 'attempts');
  return null;
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
    
    // If image is missing, generate it now
    if (!imageUrl || imageUrl.trim() === '') {
      console.log('Image missing for existing card, generating now...', progress.word);
      try {
        const imagePrompt = `A simple, friendly cartoon illustration of "${progress.word}", child-friendly style, white background, no text`;
        imageUrl = await generateImage(imagePrompt);
        
        // Cache the generated image
        if (imageUrl) {
          await createOrUpdateContentCache({
            id: `${childId}-image-${progress.word}`,
            content_type: 'image',
            content_key: progress.word,
            content_data: JSON.stringify({ imageUrl }),
            file_path: null,
            created_at: new Date().toISOString(),
            expires_at: null,
          });
          console.log('Image generated and cached for:', progress.word);
        }
      } catch (imageError) {
        console.error('Failed to generate image for existing card:', imageError);
        // Continue without image - it's optional
      }
    }
    
    // Return card even if imageUrl is missing (can generate on demand)
    if (progress.word && phonemes.length > 0) {
      // Update last_seen_at immediately when card is loaded (not just on completion)
      // This prevents the same card from being shown repeatedly
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
      };
    }
  }
  
  // No available cards (all were seen recently), generate a new one
  console.log('All existing cards were recently seen, generating new card...');
  const card = await generateNewCard(childId, currentLevel, levelData.phonemes);
  return card;
}

