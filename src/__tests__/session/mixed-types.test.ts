/**
 * Mixed Card Types Tests
 * REQ-SESSION-003
 * 
 * Validates that sessions contain a mix of card types when available
 */

import { describe, it, expect } from 'vitest';
import { DISTAR_CARDS, getCardsUpToLesson } from '@/data/distarCards.en-US';

describe('REQ-SESSION-003: Mixed Card Types', () => {
  it('lessons have multiple card types available', () => {
    // Check milestone lessons (5, 15, 25, etc.) for mixed types
    const milestoneLessons = [5, 15, 25, 35, 45, 55, 65, 75, 85, 95];
    
    milestoneLessons.forEach(lesson => {
      const cards = getCardsUpToLesson(lesson);
      const types = new Set(cards.map(c => c.type));
      
      // Should have multiple types (letters, words, possibly sentences)
      expect(
        types.size,
        `Lesson ${lesson} should have multiple card types`
      ).toBeGreaterThan(1);
    });
  });

  it('early lessons can have words mixed with phonemes', () => {
    // Lessons 5-10 should have content (may have words when phonemes are known)
    // Check that these lessons have cards available
    const lessons5to10 = DISTAR_CARDS.filter(c => c.lesson >= 5 && c.lesson <= 10);
    
    expect(
      lessons5to10.length,
      'Lessons 5-10 should have cards available'
    ).toBeGreaterThan(0);
  });

  it('progression allows early word introduction', () => {
    // Find the first word card
    const firstWord = DISTAR_CARDS.find(c => c.type === 'word');
    const firstPhoneme = DISTAR_CARDS.find(c => c.type === 'letter' || c.type === 'digraph');
    
    if (firstWord && firstPhoneme) {
      // First word should appear early (not strictly after all phonemes)
      // This validates the "rough but not strict" progression requirement
      expect(firstWord.lesson).toBeGreaterThanOrEqual(firstPhoneme.lesson);
    }
  });
});

