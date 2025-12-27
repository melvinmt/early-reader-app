/**
 * DISTAR Order Tests
 * REQ-DISTAR-001, REQ-DISTAR-003
 * 
 * Validates phoneme introduction order and progressive difficulty
 */

import { describe, it, expect } from 'vitest';
import { DISTAR_CARDS } from '@/data/distarCards.en-US';
import { DISTAR_PHONEMES } from '@/data/distarPhonemes';

describe('REQ-DISTAR-001: Phoneme Introduction Order', () => {
  it('phoneme cards match DISTAR_PHONEMES lesson assignments', () => {
    DISTAR_CARDS.filter(c => c.type === 'letter' || c.type === 'digraph').forEach(card => {
      const phoneme = DISTAR_PHONEMES.find(
        p => p.symbol.toLowerCase() === card.plainText.toLowerCase()
      );
      
      if (phoneme) {
        expect(
          card.lesson,
          `Phoneme card ${card.id} (${card.plainText}) should be at lesson ${phoneme.lesson}, not ${card.lesson}`
        ).toBe(phoneme.lesson);
      }
    });
  });

  it('phonemes are introduced in DISTAR book order', () => {
    // Verify DISTAR_PHONEMES are sorted by lesson
    const lessons = DISTAR_PHONEMES.map(p => p.lesson);
    const sortedLessons = [...lessons].sort((a, b) => a - b);
    expect(lessons).toEqual(sortedLessons);

    // Verify specific known order
    const m = DISTAR_PHONEMES.find(p => p.symbol === 'm');
    const s = DISTAR_PHONEMES.find(p => p.symbol === 's');
    const a = DISTAR_PHONEMES.find(p => p.symbol === 'a');
    
    expect(m?.lesson).toBe(1);
    expect(s?.lesson).toBe(1);
    expect(a?.lesson).toBe(3);
  });

  it('all DISTAR phonemes have corresponding cards', () => {
    DISTAR_PHONEMES.forEach(phoneme => {
      const card = DISTAR_CARDS.find(
        c => (c.type === 'letter' || c.type === 'digraph') &&
        c.plainText.toLowerCase() === phoneme.symbol.toLowerCase()
      );
      
      expect(
        card,
        `DISTAR phoneme ${phoneme.symbol} (lesson ${phoneme.lesson}) has no corresponding card`
      ).toBeTruthy();
    });
  });
});

describe('REQ-DISTAR-003: Progressive Difficulty', () => {
  it('first word cards appear after first phoneme cards', () => {
    const phonemeCards = DISTAR_CARDS.filter(c => c.type === 'letter' || c.type === 'digraph');
    const wordCards = DISTAR_CARDS.filter(c => c.type === 'word');
    
    const minPhonemeLesson = Math.min(...phonemeCards.map(c => c.lesson));
    const minWordLesson = Math.min(...wordCards.map(c => c.lesson));
    
    expect(
      minWordLesson,
      'First word cards should appear after first phoneme cards'
    ).toBeGreaterThanOrEqual(minPhonemeLesson);
  });

  it('first sentence cards appear after first word cards', () => {
    const wordCards = DISTAR_CARDS.filter(c => c.type === 'word');
    const sentenceCards = DISTAR_CARDS.filter(c => c.type === 'sentence');
    
    const minWordLesson = Math.min(...wordCards.map(c => c.lesson));
    const minSentenceLesson = Math.min(...sentenceCards.map(c => c.lesson));
    
    expect(
      minSentenceLesson,
      'First sentence cards should appear after first word cards'
    ).toBeGreaterThanOrEqual(minWordLesson);
  });

  it('card types are mixed within lesson ranges (not strictly sequential)', () => {
    // Check lessons 5-20 for mixed types
    const lessons5to20 = DISTAR_CARDS.filter(c => c.lesson >= 5 && c.lesson <= 20);
    const types = new Set(lessons5to20.map(c => c.type));
    
    // Should have multiple types (not just one type)
    // This validates that words can appear early when phonemes are known
    expect(
      types.size,
      'Lessons 5-20 should have mixed card types (letters, words)'
    ).toBeGreaterThan(1);
  });

  it('each lesson has appropriate card type mix', () => {
    // For lessons that introduce phonemes, we should see phoneme cards
    const phonemeLessons = new Set(
      DISTAR_PHONEMES.map(p => p.lesson)
    );
    
    phonemeLessons.forEach(lesson => {
      const phonemeCards = DISTAR_CARDS.filter(
        c => c.lesson === lesson && (c.type === 'letter' || c.type === 'digraph')
      );
      
      expect(
        phonemeCards.length,
        `Lesson ${lesson} introduces phonemes but has no phoneme cards`
      ).toBeGreaterThan(0);
    });
  });
});

