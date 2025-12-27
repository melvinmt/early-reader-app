/**
 * getCardQueue Tests - REAL Implementation Only
 * 
 * These tests use the ACTUAL cardQueueManager with REAL curriculum logic.
 * NO MOCKING of curriculum logic - we test what users actually experience.
 * 
 * WHAT THIS TEST VALIDATES:
 * ✅ Brand new child with ZERO phonemes gets 10 cards
 * ✅ Real getCardQueue() behavior with real curriculum logic
 * ✅ Actual phoneme introduction flow
 * ✅ Real-world scenarios that users actually experience
 * ✅ Multiple sessions work correctly
 * ✅ Different lesson levels work correctly
 * ✅ No consecutive duplicate cards
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCardQueue, recordCardCompletion } from '@/services/cardQueueManager';
import { DISTAR_CARDS } from '@/data/distarCards.en-US';
import { IntegrationTestHelper } from './integration-test-setup';
import * as configModule from '@/config/locale';
import * as levelsModule from '@/data/levels';
import * as databaseModule from '@/services/storage/database';

// Mock ONLY external dependencies (database, config, levels)
// DO NOT MOCK curriculum service - we want REAL logic
vi.mock('@/services/storage/database');
vi.mock('@/config/locale');
vi.mock('@/data/levels');
// DO NOT MOCK curriculum service - use REAL implementation

const mockDatabase = vi.mocked(databaseModule);
const mockConfig = vi.mocked(configModule);
const mockLevels = vi.mocked(levelsModule);

describe('getCardQueue - REAL Implementation Tests', () => {
  let testHelper: IntegrationTestHelper;
  const CARDS_PER_SESSION = 10;

  beforeEach(async () => {
    testHelper = new IntegrationTestHelper();
    const testDb = testHelper.db;
    
    // Setup database mocks to use test database
    mockDatabase.getChild.mockImplementation((id: string) => testDb.getChild(id));
    mockDatabase.createChild.mockImplementation((child: any) => testDb.createChild(child));
    mockDatabase.updateChildLevel.mockImplementation((childId: string, level: number) => 
      testDb.updateChildLevel(childId, level)
    );
    mockDatabase.getCardProgress.mockImplementation((childId: string, word: string) => 
      testDb.getCardProgress(childId, word)
    );
    mockDatabase.createOrUpdateCardProgress.mockImplementation((progress: any) => 
      testDb.createOrUpdateCardProgress(progress)
    );
    mockDatabase.getDueReviewCards.mockImplementation((childId: string, limit: number) => 
      testDb.getDueReviewCards(childId, limit)
    );
    mockDatabase.getAllCardsForChild.mockImplementation((childId: string) => 
      testDb.getAllCardsForChild(childId)
    );
    mockDatabase.getIntroducedPhonemes.mockImplementation((childId: string) => 
      testDb.getIntroducedPhonemes(childId)
    );
    mockDatabase.markPhonemeIntroduced.mockImplementation((childId: string, phoneme: string) => 
      testDb.markPhonemeIntroduced(childId, phoneme)
    );
    mockDatabase.initDatabase.mockResolvedValue({
      getAllAsync: vi.fn().mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('SELECT DISTINCT word')) {
          const cards = await testDb.getAllCardsForChild(params[0]);
          return cards.map(c => ({ word: c.word }));
        }
        return [];
      }),
      runAsync: vi.fn().mockResolvedValue({}),
    } as any);
    mockDatabase.incrementChildCardsCompleted.mockImplementation(async (childId: string) => {
      const child = await testDb.getChild(childId);
      if (child) {
        await testDb.updateChildLevel(childId, child.current_level);
      }
    });
    
    mockConfig.getLocale.mockReturnValue('en-US');
    mockLevels.getLevel.mockImplementation((level: number) => ({
      lesson: level,
      mastery_threshold: 20,
    } as any));
    
    // Curriculum service is NOT mocked - it will use REAL implementation
    // The real implementation will call our mocked database functions
  });

  afterEach(async () => {
    if (testHelper) {
      await testHelper.teardown();
    }
  });

  describe('Brand New Child - REAL User Scenario', () => {
    it('CRITICAL: Brand new child with ZERO phonemes gets 10 cards', async () => {
      // REAL scenario: Brand new child, no phonemes, no progress
      // This is what users actually experience
      const child = await testHelper.createChild({ current_level: 1 });
      // DO NOT introduce phonemes - test the real scenario
      
      const result = await getCardQueue(child.id);
      
      // CRITICAL: Should get 10 cards, not 3
      expect(
        result.cards.length,
        `Brand new child should get ${CARDS_PER_SESSION} cards, got ${result.cards.length}. This is the bug!`
      ).toBe(CARDS_PER_SESSION);
      
      // Verify phonemes were introduced automatically
      const introduced = await testHelper.db.getIntroducedPhonemes(child.id);
      expect(introduced.length).toBeGreaterThan(0);
      
      // Verify all cards are valid
      result.cards.forEach((card, index) => {
        expect(card.word, `Card ${index} missing word`).toBeTruthy();
        expect(card.phonemes.length, `Card ${index} missing phonemes`).toBeGreaterThan(0);
        expect(card.imageUrl, `Card ${index} missing imageUrl`).toBeTruthy();
      });
    });

    it('progresses through multiple sessions correctly', async () => {
      const child = await testHelper.createChild({ current_level: 1 });
      
      // Session 1
      const session1 = await getCardQueue(child.id);
      expect(session1.cards.length).toBe(CARDS_PER_SESSION);
      
      // Complete all cards
      for (const card of session1.cards) {
        await recordCardCompletion(child.id, card.word, {
          success: true,
          attempts: 1,
          matchScore: 0.9,
          neededHelp: false,
        });
      }
      
      // Session 2 - should get 10 more cards
      const session2 = await getCardQueue(child.id);
      expect(session2.cards.length).toBe(CARDS_PER_SESSION);
      
      // Should have different cards (some overlap with reviews is OK)
      const words1 = new Set(session1.cards.map(c => c.word));
      const words2 = new Set(session2.cards.map(c => c.word));
      const overlap = [...words1].filter(w => words2.has(w));
      expect(overlap.length).toBeLessThan(CARDS_PER_SESSION);
    });
  });

  describe('Different Lesson Levels - REAL Scenarios', () => {
    const lessons = [1, 5, 10, 25, 50, 75, 100];
    
    lessons.forEach(lesson => {
      it(`Lesson ${lesson}: Brand new child gets cards`, async () => {
        // REAL scenario: Brand new child at this lesson level
        const child = await testHelper.createChild({ current_level: lesson });
        // NO phonemes introduced - test real scenario
        
        const result = await getCardQueue(child.id);
        
        // Should get cards (may be fewer than 10 for very high lessons)
        // But should always get at least some cards
        expect(result.cards.length).toBeGreaterThan(0);
        expect(result.currentLevel).toBe(lesson);
        
        // All cards should be valid
        result.cards.forEach(card => {
          expect(card.word).toBeTruthy();
          expect(card.phonemes.length).toBeGreaterThan(0);
          expect(card.level).toBe(lesson);
        });
      });
    });
  });

  describe('Child with Progress - REAL Scenarios', () => {
    it('combines due review cards with new cards', async () => {
      const child = await testHelper.createChild({ current_level: 1 });
      
      // Use actual cards from curriculum instead of assuming specific words exist
      // Find words available for lesson 1 (or expand to higher lessons if needed)
      let realWords = DISTAR_CARDS
        .filter(c => c.type === 'word' && c.lesson <= 1)
        .slice(0, 3)
        .map(c => c.plainText);
      
      // If lesson 1 doesn't have enough words, expand search to early lessons
      if (realWords.length < 3) {
        realWords = DISTAR_CARDS
          .filter(c => c.type === 'word' && c.lesson <= 5)
          .slice(0, 3)
          .map(c => c.plainText);
      }
      
      // Only proceed if we have words for this test
      if (realWords.length >= 3) {
        const pastDate = new Date(Date.now() - 86400000); // 1 day ago
        for (const word of realWords) {
          await testHelper.createCardProgress(child.id, word, {
            next_review_at: pastDate.toISOString(), // Due
          });
        }
        
        const result = await getCardQueue(child.id);
        
        // Should have 3 due cards + 7 new cards = 10 total
        expect(result.cards.length).toBe(CARDS_PER_SESSION);
        
        // Should include due cards
        const dueCards = result.cards.filter(c => c.progress !== null);
        expect(dueCards.length).toBeGreaterThanOrEqual(3);
      } else {
        // Skip test if not enough words available (test mode might not have enough)
        console.warn('Not enough word cards available for lesson 1-5 - skipping due review test');
      }
    });
  });

  describe('No Consecutive Cards - REAL Validation', () => {
    it('never returns same card twice in a row across multiple sessions', async () => {
      const child = await testHelper.createChild({ current_level: 1 });
      const seenCards: string[] = [];
      
      // Generate 5 sessions
      for (let i = 0; i < 5; i++) {
        const result = await getCardQueue(child.id);
        // After completing all cards, we might have fewer cards available
        // But we should still get some cards (either new ones or due reviews)
        expect(result.cards.length).toBeGreaterThan(0);
        
        // Check for consecutive duplicates within session
        result.cards.forEach((card, index) => {
          if (index > 0) {
            expect(
              card.word,
              `Session ${i+1}, card ${index}: "${card.word}" should not be same as previous card "${result.cards[index-1].word}"`
            ).not.toBe(result.cards[index-1].word);
          }
        });
        
        // Check against last card of previous session
        if (seenCards.length > 0) {
          expect(
            result.cards[0].word,
            `Session ${i+1}: First card "${result.cards[0].word}" should not be same as last card of previous session "${seenCards[seenCards.length-1]}"`
          ).not.toBe(seenCards[seenCards.length-1]);
        }
        
        // Track cards
        result.cards.forEach(card => seenCards.push(card.word));
        
        // Complete cards to progress - set them as due immediately for next session
        const pastDate = new Date(Date.now() - 86400000); // 1 day ago
        for (const card of result.cards) {
          await recordCardCompletion(child.id, card.word, {
            success: true,
            attempts: 1,
            matchScore: 0.9,
            neededHelp: false,
          });
          // Make card due immediately for next session
          const progress = await testHelper.db.getCardProgress(child.id, card.word);
          if (progress) {
            progress.next_review_at = pastDate.toISOString();
            await testHelper.db.createOrUpdateCardProgress(progress);
          }
        }
      }
    });
  });
});

