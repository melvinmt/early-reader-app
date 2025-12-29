/**
 * Learning Steps Tests
 * Validates that new cards go through learning phase (steps 0-2) with proper spacing
 * before graduating to SM-2 spaced repetition
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getNextCard, recordCardCompletion } from '@/services/cardQueueManager';
import type { Child, CardProgress } from '@/types/database';
import { DISTAR_CARDS } from '@/data/distarCards.en-US';
import * as databaseModule from '@/services/storage/database';
import * as curriculumModule from '@/services/curriculum/curriculumService';
import * as configModule from '@/config/locale';

// Mock all dependencies
vi.mock('@/services/storage/database');
vi.mock('@/services/curriculum/curriculumService');
vi.mock('@/config/locale');

const mockDatabase = vi.mocked(databaseModule);
const mockCurriculum = vi.mocked(curriculumModule);
const mockConfig = vi.mocked(configModule);

describe('Learning Steps Implementation', () => {
  const childId = 'test-child-1';
  const mockChild: Child = {
    id: childId,
    parent_id: 'parent-1',
    name: 'Test Child',
    age: 4,
    created_at: new Date().toISOString(),
    current_level: 1,
    total_cards_completed: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig.getLocale.mockReturnValue('en-US');
    mockDatabase.getChild.mockResolvedValue(mockChild);
    mockDatabase.initDatabase.mockResolvedValue({
      getAllAsync: vi.fn().mockResolvedValue([]),
    } as any);
  });

  describe('New card enters learning phase', () => {
    it('new card starts at learning_step 0', async () => {
      mockDatabase.getDueReviewCardsByPriority.mockResolvedValue([]);
      mockDatabase.getLearningCards.mockResolvedValue([]);
      mockDatabase.getIntroducedPhonemes.mockResolvedValue([]);
      mockDatabase.getAllCardsForChild.mockResolvedValue([]);
      mockCurriculum.getUnintroducedPhonemesForLesson.mockResolvedValue(['m']);
      // Mock unlocked cards to return the phoneme card 'm'
      const mCard = DISTAR_CARDS.find(c => c.plainText === 'm');
      mockCurriculum.getUnlockedCards.mockReturnValue(mCard ? [mCard] : []);
      mockDatabase.getCardProgress.mockResolvedValue(null); // New card
      mockDatabase.createOrUpdateCardProgress.mockImplementation(async (progress) => {
        // Verify learning_step is 0 for new card
        expect(progress.learning_step).toBe(0);
        expect(progress.cards_since_last_seen).toBe(0);
      });
      mockCurriculum.markPhonemeAsIntroduced.mockResolvedValue();
      mockDatabase.incrementCardsSinceLastSeen.mockResolvedValue();

      const card = await getNextCard(childId);
      
      expect(card).toBeTruthy();
      expect(card?.word).toBe('m');
      expect(mockDatabase.createOrUpdateCardProgress).toHaveBeenCalled();
    });
  });

  describe('Learning card spacing', () => {
    it('learning card at step 0 requires 2 intervening cards', async () => {
      const learningCard: CardProgress = {
        id: '1',
        child_id: childId,
        word: 'm',
        ease_factor: 2.5,
        interval_days: 1,
        next_review_at: new Date().toISOString(),
        attempts: 0,
        successes: 0,
        last_seen_at: null,
        hint_used: 0,
        learning_step: 0,
        cards_since_last_seen: 2, // Ready to show
      };

      mockDatabase.getDueReviewCardsByPriority.mockResolvedValue([]);
      mockDatabase.getLearningCards.mockResolvedValue([learningCard]);
      mockDatabase.getIntroducedPhonemes.mockResolvedValue([]);
      mockDatabase.getAllCardsForChild.mockResolvedValue([]);
      mockCurriculum.getUnintroducedPhonemesForLesson.mockResolvedValue([]);
      mockDatabase.resetCardsSinceLastSeen.mockResolvedValue();
      mockDatabase.incrementCardsSinceLastSeen.mockResolvedValue();

      const card = await getNextCard(childId);
      
      expect(card?.word).toBe('m');
      expect(mockDatabase.resetCardsSinceLastSeen).toHaveBeenCalledWith(childId, 'm');
    });

    it('learning card at step 0 is not shown if cards_since_last_seen < 2', async () => {
      const learningCard: CardProgress = {
        id: '1',
        child_id: childId,
        word: 'm',
        ease_factor: 2.5,
        interval_days: 1,
        next_review_at: new Date().toISOString(),
        attempts: 0,
        successes: 0,
        last_seen_at: null,
        hint_used: 0,
        learning_step: 0,
        cards_since_last_seen: 1, // Not ready yet
      };

      mockDatabase.getDueReviewCardsByPriority.mockResolvedValue([]);
      mockDatabase.getLearningCards.mockResolvedValue([learningCard]);
      mockDatabase.getIntroducedPhonemes.mockResolvedValue([]);
      mockDatabase.getAllCardsForChild.mockResolvedValue([]);
      mockCurriculum.getUnintroducedPhonemesForLesson.mockResolvedValue([]);

      // Should fall through to next priority level
      const card = await getNextCard(childId);
      
      // Should not return the learning card since spacing requirement not met
      expect(card?.word).not.toBe('m');
    });
  });

  describe('Learning step graduation', () => {
    it('card advances from step 0 to 1 on success', async () => {
      const progress: CardProgress = {
        id: '1',
        child_id: childId,
        word: 'm',
        ease_factor: 2.5,
        interval_days: 1,
        next_review_at: new Date().toISOString(),
        attempts: 0,
        successes: 0,
        last_seen_at: null,
        hint_used: 0,
        learning_step: 0,
        cards_since_last_seen: 0,
      };

      mockDatabase.getCardProgress.mockResolvedValue(progress);
      mockDatabase.createOrUpdateCardProgress.mockImplementation(async (updated) => {
        // Verify learning_step advanced to 1
        expect(updated.learning_step).toBe(1);
      });

      await recordCardCompletion(childId, 'm', {
        success: true,
        attempts: 1,
        matchScore: 0.95,
        neededHelp: false,
      });

      expect(mockDatabase.createOrUpdateCardProgress).toHaveBeenCalled();
    });

    it('card advances from step 2 to 3 (graduated) on success', async () => {
      const progress: CardProgress = {
        id: '1',
        child_id: childId,
        word: 'm',
        ease_factor: 2.5,
        interval_days: 1,
        next_review_at: new Date().toISOString(),
        attempts: 0,
        successes: 0,
        last_seen_at: null,
        hint_used: 0,
        learning_step: 2,
        cards_since_last_seen: 0,
      };

      mockDatabase.getCardProgress.mockResolvedValue(progress);
      mockDatabase.createOrUpdateCardProgress.mockImplementation(async (updated) => {
        // Verify learning_step advanced to 3 (graduated)
        expect(updated.learning_step).toBe(3);
        // Should have proper SM-2 interval
        expect(updated.interval_days).toBeGreaterThan(0);
      });

      await recordCardCompletion(childId, 'm', {
        success: true,
        attempts: 1,
        matchScore: 0.95,
        neededHelp: false,
      });

      expect(mockDatabase.createOrUpdateCardProgress).toHaveBeenCalled();
    });

    it('card stays at current step on failure', async () => {
      const progress: CardProgress = {
        id: '1',
        child_id: childId,
        word: 'm',
        ease_factor: 2.5,
        interval_days: 1,
        next_review_at: new Date().toISOString(),
        attempts: 0,
        successes: 0,
        last_seen_at: null,
        hint_used: 0,
        learning_step: 1,
        cards_since_last_seen: 0,
      };

      mockDatabase.getCardProgress.mockResolvedValue(progress);
      mockDatabase.createOrUpdateCardProgress.mockImplementation(async (updated) => {
        // Verify learning_step stays at 1
        expect(updated.learning_step).toBe(1);
      });

      await recordCardCompletion(childId, 'm', {
        success: false,
        attempts: 3,
        matchScore: 0.5,
        neededHelp: true,
      });

      expect(mockDatabase.createOrUpdateCardProgress).toHaveBeenCalled();
    });
  });

  describe('Session limits', () => {
    it('limits new cards to MAX_NEW_CARDS_PER_SESSION', async () => {
      // Mock that 2 new cards have already been introduced this session
      mockDatabase.getDueReviewCardsByPriority.mockResolvedValue([]);
      mockDatabase.getLearningCards.mockResolvedValue([]);
      mockDatabase.initDatabase.mockResolvedValue({
        getAllAsync: vi.fn().mockResolvedValue([
          { word: 'm' },
          { word: 's' },
        ]),
      } as any);
      mockDatabase.getIntroducedPhonemes.mockResolvedValue([]);
      // Provide a fallback card for the last resort (step 8)
      const fallbackCard: CardProgress = {
        id: 'fallback-1',
        child_id: childId,
        word: 'test',
        ease_factor: 2.5,
        interval_days: 1,
        next_review_at: new Date().toISOString(),
        attempts: 0,
        successes: 0,
        last_seen_at: null,
        hint_used: 0,
        learning_step: 3,
        cards_since_last_seen: 0,
      };
      mockDatabase.getAllCardsForChild.mockResolvedValue([fallbackCard]);
      // Also need to mock the static card lookup - find a real card from DISTAR_CARDS
      const testCard = DISTAR_CARDS.find(c => c.plainText === 'test');
      if (!testCard) {
        // If 'test' doesn't exist, use 'me' which should exist
        const meCard = DISTAR_CARDS.find(c => c.plainText === 'me');
        if (meCard) {
          fallbackCard.word = 'me';
          mockDatabase.getAllCardsForChild.mockResolvedValue([fallbackCard]);
        }
      }
      mockCurriculum.getUnintroducedPhonemesForLesson.mockResolvedValue(['a']);

      const card = await getNextCard(childId);
      
      // Should not return a new phoneme since we're at the limit
      // Should fall through to other priority levels
      expect(card).toBeTruthy();
      // Verify that markPhonemeAsIntroduced was NOT called (no new card introduced)
      expect(mockCurriculum.markPhonemeAsIntroduced).not.toHaveBeenCalled();
    });
  });
});






