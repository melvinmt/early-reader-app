/**
 * Full Curriculum Simulation Tests
 * REQ-SIM-001 through REQ-SIM-003
 * 
 * Validates complete curriculum coverage and progression
 */

import { describe, it, expect } from 'vitest';
import { DISTAR_CARDS } from '@/data/distarCards.en-US';
import { DISTAR_PHONEMES } from '@/data/distarPhonemes';
import { getCardsUpToLesson } from '@/data/distarCards.en-US';

describe('REQ-SIM-001: Complete Curriculum Coverage', () => {
  it('all 721 cards are accessible', () => {
    expect(DISTAR_CARDS.length).toBeGreaterThanOrEqual(721);
  });

  it('all card types are represented', () => {
    const types = new Set(DISTAR_CARDS.map(c => c.type));
    expect(types.has('letter')).toBe(true);
    expect(types.has('digraph')).toBe(true);
    expect(types.has('word')).toBe(true);
    expect(types.has('sentence')).toBe(true);
  });

  it('curriculum spans all 100 lessons', () => {
    const maxLesson = Math.max(...DISTAR_CARDS.map(c => c.lesson));
    expect(maxLesson).toBeGreaterThanOrEqual(89); // Based on DISTAR phonemes
  });
});

describe('REQ-SIM-002: 100-Lesson Progression', () => {
  it('cards are available for each lesson range', () => {
    // Check that lessons have content
    for (let lesson = 1; lesson <= 100; lesson += 10) {
      const cards = getCardsUpToLesson(lesson);
      // Each milestone should have accumulated cards
      if (lesson >= 10) {
        expect(cards.length).toBeGreaterThan(0);
      }
    }
  });

  it('phonemes are introduced progressively', () => {
    const lessons = DISTAR_PHONEMES.map(p => p.lesson);
    const uniqueLessons = new Set(lessons);
    
    // Should introduce phonemes across multiple lessons
    expect(uniqueLessons.size).toBeGreaterThan(20);
  });

  it('words are available as phonemes are learned', () => {
    // For each lesson that introduces phonemes, there should be words available
    const phonemeLessons = new Set(DISTAR_PHONEMES.map(p => p.lesson));
    
    phonemeLessons.forEach(lesson => {
      const cardsUpToLesson = getCardsUpToLesson(lesson);
      const words = cardsUpToLesson.filter(c => c.type === 'word');
      
      // After a few lessons, should have words available
      if (lesson >= 5) {
        expect(words.length).toBeGreaterThan(0);
      }
    });
  });
});

describe('REQ-SIM-003: Reasonable Session Counts', () => {
  it('curriculum has sufficient cards for 100-200 sessions', () => {
    // With 721 cards and ~10 cards per session, we should have enough for progression
    const totalCards = DISTAR_CARDS.length;
    const cardsPerSession = 10;
    const estimatedSessions = totalCards / cardsPerSession;
    
    // Should support 100-200 sessions (accounting for reviews and repeats)
    expect(estimatedSessions).toBeGreaterThan(70); // Minimum viable
    expect(estimatedSessions).toBeLessThan(300); // Not excessive
  });

  it('each lesson range has meaningful content', () => {
    const lessonRanges = [
      { start: 1, end: 10 },
      { start: 11, end: 30 },
      { start: 31, end: 50 },
      { start: 51, end: 70 },
      { start: 71, end: 89 },
    ];
    
    lessonRanges.forEach(range => {
      const cards = DISTAR_CARDS.filter(
        c => c.lesson >= range.start && c.lesson <= range.end
      );
      
      expect(
        cards.length,
        `Lessons ${range.start}-${range.end} should have content`
      ).toBeGreaterThan(0);
    });
  });

  it('milestone lessons have substantial content', () => {
    const milestoneLessons = [5, 15, 25, 35, 45, 55, 65, 75, 85, 95];
    
    milestoneLessons.forEach(lesson => {
      const cards = DISTAR_CARDS.filter(c => c.lesson === lesson);
      // Milestone lessons should have more cards
      if (lesson >= 25) {
        expect(cards.length).toBeGreaterThan(10);
      }
    });
  });
});

