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

// Mock curriculum and config (but use real database via integration helper)
vi.mock('@/services/curriculum/curriculumService', async () => {
  const actual = await vi.importActual('@/services/curriculum/curriculumService');
  return {
    ...actual,
    // Keep real implementations but allow spying
  };
});

vi.mock('@/config/locale');
vi.mock('@/data/levels');

const mockConfig = vi.mocked(configModule);
const mockLevels = vi.mocked(levelsModule);
const mockCurriculum = vi.mocked(curriculumModule);

describe('REQ-SESSION-001: getCardQueue Integration Tests', () => {
  let testHelper: IntegrationTestHelper;
  const CARDS_PER_SESSION = 10;

  beforeEach(async () => {
    testHelper = new IntegrationTestHelper();
    await testHelper.setup();
    
    // Setup default mocks
    mockConfig.getLocale.mockReturnValue('en-US');
    mockLevels.getLevel.mockReturnValue({
      lesson: 1,
      mastery_threshold: 20,
    } as any);
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
      
      // Create 5 due cards
      const pastDate = new Date(Date.now() - 86400000);
      for (let i = 0; i < 5; i++) {
        await testHelper.createCardProgress(child.id, `word${i}`, {
          next_review_at: pastDate.toISOString(),
        });
      }
      
      const result = await getCardQueue(child.id);
      
      // Should have 5 due cards + 5 new cards = 10 total
      expect(result.cards.length).toBe(CARDS_PER_SESSION);
      
      const dueCards = result.cards.filter(c => c.progress !== null);
      expect(dueCards.length).toBe(5);
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

