import * as Crypto from 'expo-crypto';
import {
  getDueReviewCards,
  createOrUpdateCardProgress,
  getCardProgress,
  getContentCache,
  createOrUpdateContentCache,
} from './storage';
import { generateContent, generateImage } from './ai/edgeFunctions';
import { getLevelConfig, ContentType } from '@/data/levels';
import { calculateSM2 } from '@/utils/sm2';
import { CardProgress, ContentCache } from '@/types/database';
import { ContentGenerationResponse } from './ai/edgeFunctions';

export interface Card {
  id: string;
  content: string;
  contentType: ContentType;
  phonemes: string[];
  wordCount: number;
  imageUri: string;
  isReview: boolean;
  progress?: CardProgress;
}

export class CardQueueManager {
  private childId: string;
  private currentLevel: number;
  private queue: Card[] = [];
  private seenContent: Set<string> = new Set();

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
      // Get cached content data
      const contentCache = await getContentCache('word', progress.word);
      const imageCache = await getContentCache('image', progress.word);

      if (contentCache && imageCache) {
        const contentData = JSON.parse(contentCache.content_data);
        this.queue.push({
          id: progress.id,
          content: progress.word,
          contentType: contentData.contentType || 'word',
          phonemes: contentData.phonemes || [],
          wordCount: contentData.wordCount || 1,
          imageUri: imageCache.file_path || '',
          isReview: true,
          progress,
        });
        this.seenContent.add(progress.word);
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

    const excludeContent = Array.from(this.seenContent);

    for (let i = 0; i < count; i++) {
      try {
        // Generate content based on level's content type
        const contentData: ContentGenerationResponse = await generateContent({
          contentType: levelConfig.contentType,
          knownSounds: levelConfig.knownSounds,
          targetPattern: levelConfig.pattern,
          difficulty: levelConfig.difficulty,
          excludeContent,
        });

        if (this.seenContent.has(contentData.content)) {
          continue; // Skip if already seen
        }

        // Generate image
        const imageData = await generateImage({
          word: contentData.content,
          imagePrompt: contentData.imagePrompt,
        });

        // Save to cache
        const contentId = Crypto.randomUUID();
        const imageId = Crypto.randomUUID();

        // Save content data
        await createOrUpdateContentCache({
          id: contentId,
          content_type: 'word', // Using 'word' as general content type for caching
          content_key: contentData.content,
          content_data: JSON.stringify(contentData),
          file_path: null,
          created_at: new Date().toISOString(),
          expires_at: null,
        });

        // Save image
        await createOrUpdateContentCache({
          id: imageId,
          content_type: 'image',
          content_key: contentData.content,
          content_data: imageData.imageBase64,
          file_path: null,
          created_at: new Date().toISOString(),
          expires_at: null,
        });

        // Create card
        const cardId = Crypto.randomUUID();
        this.queue.push({
          id: cardId,
          content: contentData.content,
          contentType: contentData.contentType,
          phonemes: contentData.phonemes,
          wordCount: contentData.wordCount,
          imageUri: `data:image/png;base64,${imageData.imageBase64}`,
          isReview: false,
        });

        this.seenContent.add(contentData.content);
        excludeContent.push(contentData.content);
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
   * Peek at next card without removing it
   */
  peekNextCard(): Card | null {
    return this.queue[0] || null;
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Record card attempt and update SM-2 progress
   */
  async recordAttempt(
    content: string,
    quality: number,
    attempts: number,
    neededHelp: boolean
  ): Promise<void> {
    const existing = await getCardProgress(this.childId, content);

    const input = {
      quality,
      easeFactor: existing?.ease_factor || 2.5,
      intervalDays: existing?.interval_days || 0,
      repetitions: existing?.attempts || 0,
    };

    const result = calculateSM2(input);

    const progress: CardProgress = {
      id: existing?.id || Crypto.randomUUID(),
      child_id: this.childId,
      word: content,
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
    const levelConfig = getLevelConfig(this.currentLevel);
    if (!levelConfig) return false;

    // Check mastery threshold - count cards with good ease factor and interval
    // TODO: Query database for mastered cards count
    // A card is mastered when ease_factor >= 2.5 AND interval_days >= 7
    return false;
  }

  /**
   * Get current level info
   */
  getCurrentLevelInfo(): { level: number; contentType: ContentType; description: string } | null {
    const config = getLevelConfig(this.currentLevel);
    if (!config) return null;
    
    return {
      level: config.level,
      contentType: config.contentType,
      description: config.description,
    };
  }
}
