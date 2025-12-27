/**
 * No Consecutive Repeats Tests - STATIC DATA ONLY
 * REQ-SESSION-002
 * 
 * ⚠️ WARNING: These tests only validate STATIC curriculum data, NOT runtime behavior!
 * 
 * These tests check that the curriculum HAS unique cards, but they
 * DO NOT test that getNextCard() or getCardQueue() actually prevents
 * consecutive cards at runtime.
 * 
 * For runtime validation, see:
 * - consecutive-cards.test.ts (tests actual exclusion logic)
 * 
 * ⚠️ This test is REDUNDANT - consecutive-cards.test.ts covers runtime behavior
 */

import { describe, it, expect } from 'vitest';
import { DISTAR_CARDS } from '@/data/distarCards.en-US';

describe('REQ-SESSION-002: No Consecutive Repeats', () => {
  it('curriculum has sufficient unique cards to avoid repeats', () => {
    // Ensure we have enough unique cards to form sessions without repeats
    const uniqueWords = new Set(DISTAR_CARDS.map(c => c.plainText.toLowerCase()));
    
    // Should have many unique cards
    expect(uniqueWords.size).toBeGreaterThan(100);
  });

  it('card plainText values are unique identifiers', () => {
    // Each card's plainText should be unique (or at least have unique IDs)
    const cardIds = new Set(DISTAR_CARDS.map(c => c.id));
    expect(cardIds.size).toBe(DISTAR_CARDS.length);
  });
});

