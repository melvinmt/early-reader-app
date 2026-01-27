/**
 * Real Database Simulation Test
 * 
 * This simulation uses the ACTUAL database logic (not mocked),
 * ensuring we test exactly what the production app does.
 * 
 * Uses better-sqlite3 as the SQLite driver instead of expo-sqlite,
 * but runs the SAME SQL queries and business logic.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setupRealDatabase,
  cleanupRealDatabase,
  createTestChild,
  getTestChild,
  setupFakeTimers,
  advanceToDay,
  cleanupFakeTimers,
} from './realDatabaseSetup';
import { getCardQueue, recordCardCompletion, CARDS_PER_SESSION } from '@/services/cardQueueManager';

// We don't mock the database module - we use the real one with our test adapter!
// The only thing we mock is the locale config
vi.mock('@/config/locale', () => ({
  getLocale: () => 'en-US',
}));

// Mock the levels module
vi.mock('@/data/levels', () => ({
  getLevel: (level: number) => ({
    lesson: level,
    mastery_threshold: 20,
  }),
  getPhonemesUpToLevel: () => [],
  LEVELS: [],
}));

describe('Real Database Simulation', () => {
  const baseDate = new Date(2026, 0, 1, 12, 0, 0);
  let adapter: Awaited<ReturnType<typeof setupRealDatabase>>;

  beforeEach(async () => {
    // Set up real database with actual SQL logic
    adapter = await setupRealDatabase();
    setupFakeTimers(baseDate);
  });

  afterEach(() => {
    cleanupFakeTimers();
    cleanupRealDatabase();
  });

  it('uses real database queries for session management', async () => {
    const child = await createTestChild(adapter, { current_level: 1 });
    
    // Day 1: Get first session
    const queue1 = await getCardQueue(child.id);
    
    // Verify we got 20 cards
    expect(queue1.cards.length).toBe(CARDS_PER_SESSION);
    expect(queue1.isReplay).toBe(false);
    
    // Verify session cards were saved in the ACTUAL database
    const savedCards = await adapter.getAllAsync<{ word: string }>(
      `SELECT word FROM session_cards WHERE child_id = ? ORDER BY position ASC`,
      [child.id]
    );
    expect(savedCards.length).toBe(CARDS_PER_SESSION);
    expect(savedCards.map(c => c.word)).toEqual(queue1.cards.map(c => c.word));
    
    // Complete all cards
    for (const card of queue1.cards) {
      await recordCardCompletion(child.id, card.word, {
        success: true,
        attempts: 1,
        matchScore: 0.9,
        neededHelp: false,
      });
    }
    
    // Verify card progress was saved in the ACTUAL database
    const progress = await adapter.getAllAsync<{ word: string; attempts: number }>(
      `SELECT word, attempts FROM card_progress WHERE child_id = ?`,
      [child.id]
    );
    expect(progress.length).toBe(CARDS_PER_SESSION);
    expect(progress.every(p => p.attempts === 1)).toBe(true);
    
    // Verify child level was updated in the ACTUAL database
    const updatedChild = await getTestChild(adapter, child.id);
    expect(updatedChild?.current_level).toBe(2);
  });

  it('same-day replay returns exact same cards from real database', async () => {
    const child = await createTestChild(adapter, { current_level: 1 });
    
    // First session of the day
    const queue1 = await getCardQueue(child.id);
    expect(queue1.isReplay).toBe(false);
    
    for (const card of queue1.cards) {
      await recordCardCompletion(child.id, card.word, {
        success: true,
        attempts: 1,
        matchScore: 0.9,
        neededHelp: false,
      });
    }
    
    // Second session SAME DAY - should be replay
    const queue2 = await getCardQueue(child.id);
    expect(queue2.isReplay).toBe(true);
    
    // Verify EXACT same cards (from real database lookup)
    const cards1 = queue1.cards.map(c => c.word).sort();
    const cards2 = queue2.cards.map(c => c.word).sort();
    expect(cards1).toEqual(cards2);
  });

  it('different days generate different sessions from real database', async () => {
    const child = await createTestChild(adapter, { current_level: 1 });
    
    // Day 1
    advanceToDay(baseDate, 1);
    const queue1 = await getCardQueue(child.id);
    expect(queue1.isReplay).toBe(false);
    
    for (const card of queue1.cards) {
      await recordCardCompletion(child.id, card.word, {
        success: true,
        attempts: 1,
        matchScore: 0.9,
        neededHelp: false,
      });
    }
    
    // Day 2
    advanceToDay(baseDate, 2);
    const queue2 = await getCardQueue(child.id);
    expect(queue2.isReplay).toBe(false); // NEW day = NEW session
    
    // Verify different session dates in database
    const sessionDates = await adapter.getAllAsync<{ session_date: string }>(
      `SELECT DISTINCT session_date FROM session_cards WHERE child_id = ? ORDER BY session_date`,
      [child.id]
    );
    expect(sessionDates.length).toBe(2);
    expect(sessionDates[0].session_date).toBe('2026-01-01');
    expect(sessionDates[1].session_date).toBe('2026-01-02');
  });

  it('new cards are always introduced (testing the fix)', async () => {
    const child = await createTestChild(adapter, { current_level: 1 });
    
    const dailyCardSets: Set<string>[] = [];
    const dailyNewCards: Set<string>[] = [];
    
    for (let day = 1; day <= 5; day++) {
      advanceToDay(baseDate, day);
      
      const queue = await getCardQueue(child.id);
      const currentCards = new Set(queue.cards.map(c => c.word));
      
      // Calculate new cards (not seen on previous day)
      const previousCards = day > 1 ? dailyCardSets[day - 2] : new Set<string>();
      const newCards = new Set([...currentCards].filter(w => !previousCards.has(w)));
      
      console.log(`[REAL-SIM] Day ${day}: ${queue.cards.length} cards, ${newCards.size} new, isReplay=${queue.isReplay}`);
      
      dailyCardSets.push(currentCards);
      dailyNewCards.push(newCards);
      
      // Complete all cards
      for (const card of queue.cards) {
        await recordCardCompletion(child.id, card.word, {
          success: true,
          attempts: 1,
          matchScore: 0.9,
          neededHelp: false,
        });
      }
      
      // Verify child level advances each day
      const updatedChild = await getTestChild(adapter, child.id);
      expect(updatedChild?.current_level).toBe(day + 1);
    }
    
    // After the fix: Each day after day 1 should have at least 2 new cards
    for (let i = 1; i < dailyNewCards.length; i++) {
      console.log(`[REAL-SIM] Day ${i + 1} had ${dailyNewCards[i].size} new cards`);
      expect(dailyNewCards[i].size).toBeGreaterThanOrEqual(2);
    }
    
    // Calculate overlap between consecutive days
    for (let i = 1; i < dailyCardSets.length; i++) {
      const prev = dailyCardSets[i - 1];
      const curr = dailyCardSets[i];
      const overlap = [...curr].filter(w => prev.has(w)).length;
      const overlapPercent = (overlap / CARDS_PER_SESSION * 100).toFixed(0);
      console.log(`[REAL-SIM] Day ${i} → Day ${i + 1} overlap: ${overlap}/${CARDS_PER_SESSION} (${overlapPercent}%)`);
      
      // Should NOT be 100% overlap (some new cards)
      expect(overlap).toBeLessThan(CARDS_PER_SESSION);
    }
  });

  it('failed cards are prioritized but dont block new cards (the bug we fixed)', async () => {
    const child = await createTestChild(adapter, { current_level: 1 });
    
    // Day 1: Get session and FAIL all cards
    advanceToDay(baseDate, 1);
    const queue1 = await getCardQueue(child.id);
    
    for (const card of queue1.cards) {
      // Fail each card (attempts > successes)
      await recordCardCompletion(child.id, card.word, {
        success: false,
        attempts: 3,
        matchScore: 0.3,
        neededHelp: true,
      });
      // Then succeed to move on
      await recordCardCompletion(child.id, card.word, {
        success: true,
        attempts: 1,
        matchScore: 0.7,
        neededHelp: true,
      });
    }
    
    // Verify all cards have attempts > successes (failed cards)
    const failedProgress = await adapter.getAllAsync<{ word: string; attempts: number; successes: number }>(
      `SELECT word, attempts, successes FROM card_progress WHERE child_id = ? AND attempts > successes`,
      [child.id]
    );
    console.log(`[REAL-SIM] Day 1 failed cards: ${failedProgress.length}`);
    expect(failedProgress.length).toBeGreaterThan(0);
    
    // Day 2: Even with many failed cards, we should get NEW cards
    advanceToDay(baseDate, 2);
    const queue2 = await getCardQueue(child.id);
    
    const day1Cards = new Set(queue1.cards.map(c => c.word));
    const day2Cards = new Set(queue2.cards.map(c => c.word));
    const newOnDay2 = [...day2Cards].filter(w => !day1Cards.has(w));
    
    console.log(`[REAL-SIM] Day 2 new cards: ${newOnDay2.length} (should be >= 2)`);
    console.log(`[REAL-SIM] New cards: ${newOnDay2.join(', ')}`);
    
    // CRITICAL: Even with all cards failed, we MUST get at least 2 new cards
    // This tests the fix we made to prioritizedDue.slice(0, maxDueCards)
    expect(newOnDay2.length).toBeGreaterThanOrEqual(2);
  });

  it('phonemes are introduced progressively in real database', async () => {
    const child = await createTestChild(adapter, { current_level: 1 });
    
    // Day 1: Should introduce first phonemes (m, s from lesson 1)
    advanceToDay(baseDate, 1);
    await getCardQueue(child.id);
    
    let phonemes = await adapter.getAllAsync<{ phoneme_symbol: string }>(
      `SELECT phoneme_symbol FROM introduced_phonemes WHERE child_id = ?`,
      [child.id]
    );
    console.log(`[REAL-SIM] Day 1 phonemes: ${phonemes.map(p => p.phoneme_symbol).join(', ')}`);
    expect(phonemes.length).toBeGreaterThan(0);
    
    // Complete cards to advance level
    const queue1 = await getCardQueue(child.id);
    for (const card of queue1.cards) {
      await recordCardCompletion(child.id, card.word, {
        success: true,
        attempts: 1,
        matchScore: 0.9,
        neededHelp: false,
      });
    }
    
    // Day 5: Should have more phonemes
    advanceToDay(baseDate, 5);
    await getCardQueue(child.id);
    
    phonemes = await adapter.getAllAsync<{ phoneme_symbol: string }>(
      `SELECT phoneme_symbol FROM introduced_phonemes WHERE child_id = ?`,
      [child.id]
    );
    console.log(`[REAL-SIM] Day 5 phonemes: ${phonemes.map(p => p.phoneme_symbol).join(', ')}`);
    
    // Should have introduced more phonemes over 5 days
    expect(phonemes.length).toBeGreaterThan(2);
  });
});
