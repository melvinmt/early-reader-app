import { v4 as uuidv4 } from 'uuid';
import {
  getDueReviewCards,
  createOrUpdateCardProgress,
  getCardProgress,
  getContentCache,
  createOrUpdateContentCache,
} from './storage';
import { generateWord, generateImage } from './ai/edgeFunctions';
import { getLevelConfig } from '@/data/levels';
import { calculateSM2 } from '@/utils/sm2';
import { CardProgress, ContentCache } from '@/types/database';
import { WordGenerationResponse } from './ai/edgeFunctions';

export interface Card {
  id: string;
  word: string;
  phonemes: string[];
  imageUri: string;
  isReview: boolean;
  progress?: CardProgress;
}

export class CardQueueManager {
  private childId: string;
  private currentLevel: number;
  private queue: Card[] = [];
  private seenWords: Set<string> = new Set();

  constructor(childId: string, currentLevel: number) {
    this.childId = childId;
    this.currentLevel = currentLevel;
  }

  /**
   * Build the card queue prioritizing review cards over new cards
   */
  async buildQueue(): Promise<void> {
    this.queue = [];

    // 1. Get due review cards (highest priority)
    const reviewCards = await getDueReviewCards(this.childId, 5);
    for (const progress of reviewCards) {
      // Get cached word data
      const wordCache = await getContentCache('word', progress.word);
      const imageCache = await getContentCache('image', progress.word);

      if (wordCache && imageCache) {
        const wordData = JSON.parse(wordCache.content_data);
        this.queue.push({
          id: progress.id,
          word: progress.word,
          phonemes: wordData.phonemes || [],
          imageUri: imageCache.file_path || '',
          isReview: true,
          progress,
        });
        this.seenWords.add(progress.word);
      }
    }

    // 2. Generate new cards if queue is low
    if (this.queue.length < 10) {
      const newCardsNeeded = 10 - this.queue.length;
      await this.generateNewCards(newCardsNeeded);
    }
  }

  /**
   * Generate new cards appropriate for child's level
   */
  private async generateNewCards(count: number): Promise<void> {
    const levelConfig = getLevelConfig(this.currentLevel);
    if (!levelConfig) {
      console.error(`No level config found for level ${this.currentLevel}`);
      return;
    }

    const excludeWords = Array.from(this.seenWords);

    for (let i = 0; i < count; i++) {
      try {
        // Generate word
        const wordData: WordGenerationResponse = await generateWord({
          knownSounds: levelConfig.knownSounds,
          targetPattern: levelConfig.pattern,
          difficulty: levelConfig.difficulty,
          excludeWords,
          count: 1,
        });

        if (this.seenWords.has(wordData.word)) {
          continue; // Skip if already seen
        }

        // Generate image
        const imageData = await generateImage({
          word: wordData.word,
          imagePrompt: wordData.imagePrompt,
        });

        // Save to cache
        const wordId = uuidv4();
        const imageId = uuidv4();

        // Save word data
        await createOrUpdateContentCache({
          id: wordId,
          content_type: 'word',
          content_key: wordData.word,
          content_data: JSON.stringify(wordData),
          file_path: null,
          created_at: new Date().toISOString(),
          expires_at: null,
        });

        // Save image (in a real app, you'd save the base64 to file system)
        // For now, we'll store the base64 in content_data
        await createOrUpdateContentCache({
          id: imageId,
          content_type: 'image',
          content_key: wordData.word,
          content_data: imageData.imageBase64,
          file_path: null, // TODO: Save to file system and set path
          created_at: new Date().toISOString(),
          expires_at: null,
        });

        // Create card
        const cardId = uuidv4();
        this.queue.push({
          id: cardId,
          word: wordData.word,
          phonemes: wordData.phonemes,
          imageUri: `data:image/png;base64,${imageData.imageBase64}`, // Temporary
          isReview: false,
        });

        this.seenWords.add(wordData.word);
      } catch (error) {
        console.error('Error generating card:', error);
        // Continue with next card
      }
    }
  }

  /**
   * Get next card from queue
   */
  getNextCard(): Card | null {
    return this.queue.shift() || null;
  }

  /**
   * Record card attempt and update SM-2 progress
   */
  async recordAttempt(
    word: string,
    quality: number,
    attempts: number,
    neededHelp: boolean
  ): Promise<void> {
    const existing = await getCardProgress(this.childId, word);

    const input = {
      quality,
      easeFactor: existing?.ease_factor || 2.5,
      intervalDays: existing?.interval_days || 0,
      repetitions: existing?.attempts || 0,
    };

    const result = calculateSM2(input);

    const progress: CardProgress = {
      id: existing?.id || uuidv4(),
      child_id: this.childId,
      word,
      ease_factor: result.nextEaseFactor,
      interval_days: result.nextInterval,
      next_review_at: result.nextReviewDate,
      attempts: attempts,
      successes: neededHelp ? existing?.successes || 0 : (existing?.successes || 0) + 1,
      last_seen_at: new Date().toISOString(),
    };

    await createOrUpdateCardProgress(progress);
  }

  /**
   * Check if child should level up
   */
  async checkLevelUp(): Promise<boolean> {
    // TODO: Implement level-up logic
    // Check if child has mastered enough cards (ease_factor >= 2.5 AND interval_days >= 7)
    return false;
  }
}
