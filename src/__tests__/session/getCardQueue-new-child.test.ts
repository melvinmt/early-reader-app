/**
 * getCardQueue New Child Tests - CRITICAL BUG TEST
 * 
 * This test specifically validates the bug where a new child only gets 3 cards
 * instead of 10. This is the REAL-WORLD scenario that was failing.
 * 
 * WHAT THIS TEST VALIDATES:
 * ✅ Brand new child (no introduced phonemes, no card progress) gets 10 cards
 * ✅ System introduces phonemes as needed to unlock cards
 * ✅ getCardQueue() generates full session even for new children
 * 
 * This test would have caught the "only 3 cards" bug.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCardQueue } from '@/services/cardQueueManager';
import type { Child } from '@/types/database';
import { DISTAR_CARDS } from '@/data/distarCards.en-US';
import * as databaseModule from '@/services/storage/database';
import * as curriculumModule from '@/services/curriculum/curriculumService';
import * as configModule from '@/config/locale';
import * as levelsModule from '@/data/levels';

// Mock all dependencies
vi.mock('@/services/storage/database');
vi.mock('@/services/curriculum/curriculumService');
vi.mock('@/config/locale');
vi.mock('@/data/levels');

const mockDatabase = vi.mocked(databaseModule);
const mockCurriculum = vi.mocked(curriculumModule);
const mockConfig = vi.mocked(configModule);
const mockLevels = vi.mocked(levelsModule);

describe('REQ-SESSION-001: getCardQueue New Child Bug Test (CRITICAL)', () => {
  const childId = 'test-child-new';
  const CARDS_PER_SESSION = 10;
  
  const mockChild: Child = {
    id: childId,
    parent_id: 'parent-1',
    name: 'New Child',
    age: 5,
    created_at: new Date().toISOString(),
    current_level: 1,
    total_cards_completed: 0,
  };

  // Track seen words and introduced phonemes across calls
  let seenWordsSet: Set<string> = new Set();
  let introducedPhonemesSet: Set<string> = new Set();

  beforeEach(() => {
    vi.clearAllMocks();
    seenWordsSet.clear();
    introducedPhonemesSet.clear();
    
    // Setup default mocks
    mockConfig.getLocale.mockReturnValue('en-US');
    mockDatabase.getChild.mockResolvedValue(mockChild);
    mockDatabase.getDueReviewCards.mockResolvedValue([]);
    
    // Mock getIntroducedPhonemes to return tracked phonemes
    mockDatabase.getIntroducedPhonemes.mockImplementation(async (id: string) => {
      return Array.from(introducedPhonemesSet);
    });
    
    // Mock initDatabase to track seen words
    mockDatabase.initDatabase.mockResolvedValue({
      getAllAsync: vi.fn().mockImplementation(async (sql: string, params: any[]) => {
        if (sql.includes('SELECT DISTINCT word')) {
          return Array.from(seenWordsSet).map(word => ({ word }));
        }
        return [];
      }),
      runAsync: vi.fn().mockResolvedValue({}),
    } as any);
    
    // Track words when progress is created
    mockDatabase.createOrUpdateCardProgress.mockImplementation(async (progress: any) => {
      seenWordsSet.add(progress.word);
    });
    mockDatabase.getCardProgress.mockResolvedValue(null);
    
    mockLevels.getLevel.mockReturnValue({
      lesson: 1,
      mastery_threshold: 20,
    } as any);
    
    // Mock getUnintroducedPhonemesForLesson - for lesson 1, return phonemes not yet introduced
    mockCurriculum.getUnintroducedPhonemesForLesson.mockImplementation(async (id: string, lesson: number) => {
      if (lesson === 1) {
        // Lesson 1 phonemes: typically m, s, a, e, etc.
        const lesson1Phonemes = ['m', 's', 'a', 'e', 'i', 'o', 'u'];
        return lesson1Phonemes.filter(p => !introducedPhonemesSet.has(p.toLowerCase()));
      }
      return [];
    });
    
    // Mock markPhonemeAsIntroduced to track introduced phonemes
    mockCurriculum.markPhonemeAsIntroduced.mockImplementation(async (id: string, phoneme: string) => {
      introducedPhonemesSet.add(phoneme.toLowerCase());
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

  it('CRITICAL: Brand new child gets 10 cards (not just 3)', async () => {
    // Setup: Brand new child with NO introduced phonemes and NO card progress
    // This is the exact scenario from the user's bug report
    
    const result = await getCardQueue(childId);
    
    // CRITICAL ASSERTION: Should return 10 cards, not just 3
    // This is the bug that was happening - only 3 cards were generated
    expect(
      result.cards.length,
      `Brand new child should get ${CARDS_PER_SESSION} cards, not ${result.cards.length}. This test catches the "only 3 cards" bug.`
    ).toBe(CARDS_PER_SESSION);
    
    // Verify phonemes were introduced during card generation
    const introducedPhonemes = Array.from(introducedPhonemesSet);
    expect(introducedPhonemes.length).toBeGreaterThan(0);
    
    // Verify cards are valid
    result.cards.forEach((card, index) => {
      expect(card.word, `Card ${index} missing word`).toBeTruthy();
      expect(card.phonemes.length, `Card ${index} missing phonemes`).toBeGreaterThan(0);
    });
  });

  it('introduces phonemes progressively to unlock more cards', async () => {
    // This test validates that phonemes are introduced as needed
    // to ensure we can generate 10 cards
    
    const result = await getCardQueue(childId);
    
    // Should have introduced phonemes during generation
    const introducedPhonemes = Array.from(introducedPhonemesSet);
    expect(introducedPhonemes.length).toBeGreaterThan(0);
    
    // Should have generated 10 cards
    expect(result.cards.length).toBe(CARDS_PER_SESSION);
    
    // Verify that cards match the introduced phonemes
    result.cards.forEach(card => {
      const distarCard = DISTAR_CARDS.find(c => c.plainText === card.word);
      if (distarCard) {
        // All phonemes in the card should be introduced
        distarCard.phonemes.forEach(phoneme => {
          expect(
            introducedPhonemesSet.has(phoneme.toLowerCase()),
            `Card "${card.word}" uses phoneme "${phoneme}" which should be introduced`
          ).toBe(true);
        });
      }
    });
  });
});

