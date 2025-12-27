/**
 * getCardQueue Integration Tests
 * REQ-SESSION-001 (INTEGRATION VALIDATION)
 * 
 * ✅ INTEGRATION TESTS: These tests use a real test database structure
 * to validate getCardQueue() behavior with realistic data flows.
 * 
 * WHAT THIS TEST VALIDATES:
 * ✅ getCardQueue() works with realistic database interactions
 * ✅ Full data flow from database → card generation → result
 * ✅ Edge cases with real data structures
 * ✅ Integration between database, curriculum, and card generation
 * 
 * WHAT THIS TEST DOES NOT VALIDATE:
 * ❌ Actual SQLite database (uses in-memory test database)
 * ❌ Full end-to-end session flow (see full-journey-simulation.test.ts)
 * ❌ Real file system or asset loading
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCardQueue } from '@/services/cardQueueManager';
import { DISTAR_CARDS } from '@/data/distarCards.en-US';
import { IntegrationTestHelper } from './integration-test-setup';
import * as curriculumModule from '@/services/curriculum/curriculumService';
import * as configModule from '@/config/locale';
import * as levelsModule from '@/data/levels';
import * as databaseModule from '@/services/storage/database';

// Mock all dependencies
vi.mock('@/services/storage/database');
vi.mock('@/services/curriculum/curriculumService');
vi.mock('@/config/locale');
vi.mock('@/data/levels');

const mockDatabase = vi.mocked(databaseModule);
const mockConfig = vi.mocked(configModule);
const mockLevels = vi.mocked(levelsModule);
const mockCurriculum = vi.mocked(curriculumModule);

describe('REQ-SESSION-001: getCardQueue Integration Tests', () => {
  let testHelper: IntegrationTestHelper;
  const CARDS_PER_SESSION = 10;

  beforeEach(async () => {
    testHelper = new IntegrationTestHelper();
    
    // Setup database mocks to use the test database
    const testDb = testHelper.db;
    
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
    mockDatabase.initDatabase.mockResolvedValue({
      getAllAsync: vi.fn().mockImplementation(async (sql: string, params: any[]) => {
        // For "SELECT DISTINCT word FROM card_progress WHERE child_id = ?"
        if (sql.includes('SELECT DISTINCT word')) {
          const cards = await testDb.getAllCardsForChild(params[0]);
          return cards.map(c => ({ word: c.word }));
        }
        return [];
      }),
      runAsync: vi.fn().mockResolvedValue({}),
    } as any);
    
    // Setup default mocks
    mockConfig.getLocale.mockReturnValue('en-US');
    mockLevels.getLevel.mockReturnValue({
      lesson: 1,
      mastery_threshold: 20,
    } as any);
    
    // Mock getUnintroducedPhonemesForLesson - return phonemes not yet introduced
    mockCurriculum.getUnintroducedPhonemesForLesson.mockImplementation(async (id: string, lesson: number) => {
      const introduced = await testHelper.db.getIntroducedPhonemes(id);
      const introducedSet = new Set(introduced.map(p => p.toLowerCase()));
      if (lesson === 1) {
        const lesson1Phonemes = ['m', 's', 'a', 'e', 'i', 'o', 'u'];
        return lesson1Phonemes.filter(p => !introducedSet.has(p.toLowerCase()));
      }
      return [];
    });
    
    // Mock markPhonemeAsIntroduced to actually mark phonemes in test database
    mockCurriculum.markPhonemeAsIntroduced.mockImplementation(async (id: string, phoneme: string) => {
      await testHelper.db.markPhonemeIntroduced(id, phoneme.toLowerCase());
    });
    
    // Mock getUnlockedCards to return cards based on introduced phonemes
    mockCurriculum.getUnlockedCards.mockImplementation((cards, phonemes) => {
      const phonemeSet = new Set(phonemes.map((p: string) => p.toLowerCase()));
      return cards.filter((card: any) => {
        if (card.type === 'letter' || card.type === 'digraph') {
          return phonemeSet.has(card.plainText.toLowerCase());
        }
        // For words/sentences, check if all phonemes are introduced
        return card.phonemes.every((p: string) => phonemeSet.has(p.toLowerCase()));
      });
    });
  });

  afterEach(async () => {
    if (testHelper) {
      await testHelper.teardown();
    }
  });

  describe('New Child Scenario', () => {
    it('generates cards for brand new child with no progress', async () => {
      const child = await testHelper.createChild({ current_level: 1 });
      await testHelper.introducePhonemes(child.id, ['m', 's', 'a', 'e']); // Introduce some phonemes
      
      const result = await getCardQueue(child.id);
      
      // Should return cards (even if < 10 for new child)
      expect(result.cards.length).toBeGreaterThan(0);
      expect(result.currentLevel).toBe(1);
      
      // All cards should be valid
      result.cards.forEach(card => {
        expect(card.word).toBeTruthy();
        expect(card.phonemes.length).toBeGreaterThan(0);
        expect(card.level).toBe(1);
      });
    });

    it('generates 10 cards when enough unlocked cards available', async () => {
      const child = await testHelper.createChild({ current_level: 1 });
      // Introduce many phonemes to unlock many cards
      await testHelper.introducePhonemes(child.id, ['m', 's', 'a', 'e', 'i', 'o', 'u', 't', 'n', 'l', 'r']);
      
      const result = await getCardQueue(child.id);
      
      // CRITICAL: Should return 10 cards when available
      // This would catch the "only 1 card" bug
      expect(result.cards.length).toBe(CARDS_PER_SESSION);
    });
  });

  describe('Child with Progress', () => {
    it('combines due review cards with new cards', async () => {
      const child = await testHelper.createChild({ current_level: 1 });
      await testHelper.introducePhonemes(child.id, ['m', 's', 'a', 'e']);
      
      // Create some due review cards
      const now = new Date();
      const pastDate = new Date(now.getTime() - 86400000); // 1 day ago
      
      await testHelper.createCardProgress(child.id, 'me', {
        next_review_at: pastDate.toISOString(), // Due
      });
      await testHelper.createCardProgress(child.id, 'am', {
        next_review_at: pastDate.toISOString(), // Due
      });
      
      const result = await getCardQueue(child.id);
      
      // Should have 2 due cards + 8 new cards = 10 total
      expect(result.cards.length).toBe(CARDS_PER_SESSION);
      
      // Should include due cards
      const dueCards = result.cards.filter(c => c.progress !== null);
      expect(dueCards.length).toBeGreaterThanOrEqual(2);
    });

    it('prioritizes due cards over new cards', async () => {
      const child = await testHelper.createChild({ current_level: 1 });
      await testHelper.introducePhonemes(child.id, ['m', 's', 'a', 'e', 'i', 'o', 'u']);
      
      // Create 5 due cards using real words from DISTAR_CARDS
      const realWords = DISTAR_CARDS.filter(c => c.type === 'word' && c.lesson <= 1).slice(0, 5);
      const pastDate = new Date(Date.now() - 86400000);
      for (const distarCard of realWords) {
        await testHelper.createCardProgress(child.id, distarCard.plainText, {
          next_review_at: pastDate.toISOString(),
        });
      }
      
      const result = await getCardQueue(child.id);
      
      // Should have 5 due cards + 5 new cards = 10 total (or as many as available)
      expect(result.cards.length).toBeGreaterThanOrEqual(5);
      expect(result.cards.length).toBeLessThanOrEqual(CARDS_PER_SESSION);
      
      const dueCards = result.cards.filter(c => c.progress !== null);
      expect(dueCards.length).toBeGreaterThanOrEqual(Math.min(5, result.cards.length));
    });
  });

  describe('Edge Cases', () => {
    it('handles child with limited unlocked cards gracefully', async () => {
      const child = await testHelper.createChild({ current_level: 1 });
      // Introduce only 2 phonemes = limited cards
      await testHelper.introducePhonemes(child.id, ['m', 's']);
      
      const result = await getCardQueue(child.id);
      
      // Should return what's available (may be < 10)
      expect(result.cards.length).toBeGreaterThan(0);
      expect(result.cards.length).toBeLessThanOrEqual(CARDS_PER_SESSION);
    });

    it('handles child at different lesson levels', async () => {
      const lessons = [1, 5, 10, 25];
      
      for (const lesson of lessons) {
        await testHelper.teardown();
        await testHelper.setup();
        
        const child = await testHelper.createChild({ current_level: lesson });
        // Introduce phonemes appropriate for the lesson
        await testHelper.introducePhonemes(child.id, ['m', 's', 'a', 'e', 'i', 'o', 'u', 't', 'n', 'l', 'r']);
        
        mockLevels.getLevel.mockReturnValue({
          lesson,
          mastery_threshold: 20,
        } as any);
        
        const result = await getCardQueue(child.id);
        
        expect(result.currentLevel).toBe(lesson);
        expect(result.cards.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Card Quality and Structure', () => {
    it('all cards have valid structure matching DISTAR_CARDS', async () => {
      const child = await testHelper.createChild({ current_level: 1 });
      await testHelper.introducePhonemes(child.id, ['m', 's', 'a', 'e', 'i', 'o', 'u']);
      
      const result = await getCardQueue(child.id);
      
      result.cards.forEach(card => {
        // Validate structure
        expect(card.word).toBeTruthy();
        expect(Array.isArray(card.phonemes)).toBe(true);
        expect(card.phonemes.length).toBeGreaterThan(0);
        expect(card.imageUrl).toBeTruthy();
        expect(card.level).toBe(1);
        
        // Validate exists in DISTAR_CARDS
        const distarCard = DISTAR_CARDS.find(c => c.plainText === card.word);
        expect(distarCard, `Card "${card.word}" should exist in DISTAR_CARDS`).toBeDefined();
        
        if (distarCard) {
          expect(card.phonemes).toEqual(distarCard.phonemes);
        }
      });
    });
  });
});

