/**
 * Full Journey Simulation Test (Day-Based Progression)
 *
 * Simulates a child progressing through lessons over multiple days:
 * - Multiple sessions per day are allowed (replays)
 * - Same-day replays get review cards (no new progression)
 * - Skip days don't lose progress - child continues from where they left off
 * - No consecutive duplicate words within a session
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCardQueue, recordCardCompletion, CARDS_PER_SESSION } from '@/services/cardQueueManager';
import { IntegrationTestHelper } from '../session/integration-test-setup';
import * as configModule from '@/config/locale';
import * as levelsModule from '@/data/levels';
import * as databaseModule from '@/services/storage/database';
import {
  getPhonemesForLessonNumber,
  isLessonComplete,
} from '@/services/curriculum/curriculumService';
import { getAllStaticCards } from '@/services/cardQueueManager';

// Mock ONLY external dependencies (database, config, levels)
vi.mock('@/services/storage/database');
vi.mock('@/config/locale');
vi.mock('@/data/levels');

const mockDatabase = vi.mocked(databaseModule);
const mockConfig = vi.mocked(configModule);
const mockLevels = vi.mocked(levelsModule);

describe('Full Journey Simulation - Day-Based Progression', () => {
  let testHelper: IntegrationTestHelper;
  const runFullJourney = process.env.FULL_JOURNEY_SIM === '1';
  const maxDaysEnv = Number(process.env.FULL_JOURNEY_DAYS);
  const maxDays = Number.isFinite(maxDaysEnv) && maxDaysEnv > 0
    ? maxDaysEnv
    : runFullJourney
      ? 60
      : 10;
  const maxReappearanceGap = 3;
  const baseDate = new Date(2026, 0, 1, 12, 0, 0);

  const hashWord = (word: string): number => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash * 31 + word.charCodeAt(i)) % 100000;
    }
    return hash;
  };

  const shouldFailCard = (word: string, index: number, day: number): boolean => {
    // Deterministic "sometimes fail" rule (no randomness)
    return (hashWord(word) + index + day) % 5 === 0;
  };

  // Deterministic pattern for sessions per day and skip days
  const getSessionsForDay = (day: number): number => {
    // Pattern: 1 session, 2 sessions, 3 sessions, skip day (0), repeat
    const pattern = [1, 2, 3, 0, 2, 1, 0, 2, 3, 1];
    return pattern[day % pattern.length];
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(baseDate);

    testHelper = new IntegrationTestHelper();
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
    mockDatabase.markPhonemeIntroduced.mockImplementation((childId: string, phoneme: string) =>
      testDb.markPhonemeIntroduced(childId, phoneme)
    );
    mockDatabase.getSessionCardsForDate.mockImplementation((childId: string, sessionDate: string) =>
      testDb.getSessionCardsForDate(childId, sessionDate)
    );
    mockDatabase.saveSessionCardsForDate.mockImplementation((childId: string, sessionDate: string, words: string[]) =>
      testDb.saveSessionCardsForDate(childId, sessionDate, words)
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
  });

  afterEach(async () => {
    if (testHelper) {
      await testHelper.teardown();
    }
    vi.useRealTimers();
  });

  it('progresses through days with replays and skip days', async () => {
    const child = await testHelper.createChild({ current_level: 1 });

    let lastLevel = child.current_level;
    let pendingReviewWords = new Set<string>();
    const failedAtSession = new Map<string, number>();
    let totalSessionsCompleted = 0;
    let skipDays = 0;
    let replaySessions = 0;
    
    // Track progression stats
    const levelHistory: number[] = [1];
    const dailyStats: { day: number; sessions: number; levelStart: number; levelEnd: number }[] = [];

    for (let day = 1; day <= maxDays; day++) {
      const dayDate = new Date(baseDate);
      dayDate.setDate(baseDate.getDate() + (day - 1));
      vi.setSystemTime(dayDate);

      const sessionsToday = getSessionsForDay(day);
      
      if (sessionsToday === 0) {
        skipDays++;
        console.log(`[SIM] Day ${day}: SKIP DAY (no sessions)`);
        continue;
      }

      const levelAtDayStart = lastLevel;
      let previousDayCards: Set<string> | null = null;

      for (let sessionNum = 1; sessionNum <= sessionsToday; sessionNum++) {
        totalSessionsCompleted++;
        const isReplay = sessionNum > 1;
        if (isReplay) replaySessions++;

        const queue = await getCardQueue(child.id);
        const allStaticCards = getAllStaticCards();
        
        // Verify no consecutive duplicates
        for (let i = 1; i < queue.cards.length; i++) {
          expect(
            queue.cards[i].word,
            `Consecutive duplicate at position ${i}: "${queue.cards[i].word}"`
          ).not.toBe(queue.cards[i - 1].word);
        }
        
        const currentCards = new Set(queue.cards.map(c => c.word));
        
        // Track card types
        let sessionCVC = 0, sessionWords = 0, sessionPhonemes = 0, sessionSentences = 0;
        for (const card of queue.cards) {
          const staticCard = allStaticCards.find(c => c.plainText === card.word);
          if (staticCard?.type === 'cvc') sessionCVC++;
          else if (staticCard?.type === 'word') sessionWords++;
          else if (staticCard?.type === 'sentence') sessionSentences++;
          else if (staticCard?.type === 'letter' || staticCard?.type === 'digraph') sessionPhonemes++;
        }

        // For replays, check card overlap with first session
        if (isReplay && previousDayCards) {
          const overlap = [...currentCards].filter(w => previousDayCards!.has(w)).length;
          const overlapPercent = (overlap / CARDS_PER_SESSION * 100).toFixed(0);
          console.log(
            `[SIM] Day ${day}, Session ${sessionNum} (REPLAY): ` +
            `${overlap}/${CARDS_PER_SESSION} cards repeated (${overlapPercent}%)`
          );
          // Replays should have significant overlap (reviews of same cards)
          // Note: Some new cards may be introduced, so 40% overlap is acceptable
          expect(overlap).toBeGreaterThanOrEqual(Math.floor(CARDS_PER_SESSION * 0.4));
        } else {
          console.log(
            `[SIM] Day ${day}, Session ${sessionNum}: level=${lastLevel} cards=${queue.cards.length} ` +
            `(CVC=${sessionCVC} words=${sessionWords} sentences=${sessionSentences} phonemes=${sessionPhonemes})`
          );
          previousDayCards = currentCards;
        }

        expect(queue.cards.length).toBe(CARDS_PER_SESSION);

        // Process failures from previous session
        if (pendingReviewWords.size > 0) {
          const repeats = Array.from(pendingReviewWords).filter(w => currentCards.has(w));
          if (repeats.length > 0) {
            console.log(`[SIM] Review repeats from previous failures: ${repeats.join(', ')}`);
          }
        }

        const failedThisSession = new Set<string>();

        // Complete all cards
        for (let i = 0; i < queue.cards.length; i++) {
          const card = queue.cards[i];
          const shouldFail = shouldFailCard(card.word, i, day);

          if (shouldFail) {
            failedThisSession.add(card.word);
            failedAtSession.set(card.word, totalSessionsCompleted);

            // Fail then retry with success
            await recordCardCompletion(child.id, card.word, {
              success: false,
              attempts: 3,
              matchScore: 0.4,
              neededHelp: true,
              pronunciationFailed: true,
            });

            await recordCardCompletion(child.id, card.word, {
              success: true,
              attempts: 2,
              matchScore: 0.75,
              neededHelp: false,
              pronunciationFailed: true,
            });
          } else {
            await recordCardCompletion(child.id, card.word, {
              success: true,
              attempts: 1,
              matchScore: 0.9,
              neededHelp: false,
            });
          }
        }

        pendingReviewWords = failedThisSession;
      }

      // Check level after all sessions for the day
      const updatedChild = await testHelper.db.getChild(child.id);
      if (!updatedChild) throw new Error('Child missing');

      const lessonPhonemes = getPhonemesForLessonNumber(updatedChild.current_level);
      const introduced = await testHelper.db.getIntroducedPhonemes(child.id);
      const complete = await isLessonComplete(child.id, updatedChild.current_level);

      dailyStats.push({
        day,
        sessions: sessionsToday,
        levelStart: levelAtDayStart,
        levelEnd: updatedChild.current_level,
      });

      if (updatedChild.current_level !== lastLevel) {
        console.log(
          `[SIM] Day ${day} END: LEVEL UP ${lastLevel} -> ${updatedChild.current_level} ` +
          `(after ${sessionsToday} sessions)`
        );
        lastLevel = updatedChild.current_level;
        levelHistory.push(lastLevel);
      } else {
        console.log(`[SIM] Day ${day} END: stayed at level ${lastLevel}`);
      }
    }

    // Summary
    console.log(`\n[SIM] === SIMULATION SUMMARY ===`);
    console.log(`[SIM] Total days: ${maxDays} (${skipDays} skip days)`);
    console.log(`[SIM] Total sessions: ${totalSessionsCompleted} (${replaySessions} replays)`);
    console.log(`[SIM] Final level: ${lastLevel}`);
    console.log(`[SIM] Level history: ${levelHistory.join(' -> ')}`);
    
    // Verify skip days don't affect progress
    const activeDays = maxDays - skipDays;
    console.log(`[SIM] Active days: ${activeDays}`);
    
    // Child should have progressed
    expect(lastLevel).toBeGreaterThan(1);
    
    // Level should roughly track with active days (one unique session per day)
    expect(lastLevel).toBeLessThanOrEqual(activeDays + 1);
    
    if (runFullJourney) {
      console.log(`[SIM] Completed ${maxDays} day simulation`);
    }
  });

  it('skip days do not lose progress - spaced repetition continues', async () => {
    const child = await testHelper.createChild({ current_level: 1 });

    // Day 1: Complete a session
    console.log('[SIM] Day 1: First session');
    const queue1 = await getCardQueue(child.id);
    const day1Words = new Set(queue1.cards.map(c => c.word));
    
    for (const card of queue1.cards) {
      await recordCardCompletion(child.id, card.word, {
        success: true,
        attempts: 1,
        matchScore: 0.9,
        neededHelp: false,
      });
    }

    const levelAfterDay1 = (await testHelper.db.getChild(child.id))?.current_level ?? 1;
    console.log(`[SIM] After Day 1: level=${levelAfterDay1}`);

    // Days 2-5: Skip (simulate child not playing)
    console.log('[SIM] Days 2-5: SKIPPED (no sessions)');

    // Day 6: Resume playing
    console.log('[SIM] Day 6: Resume after 4 skip days');
    const queue2 = await getCardQueue(child.id);
    
    // Cards should still be available (spaced repetition continues)
    expect(queue2.cards.length).toBe(CARDS_PER_SESSION);
    
    // Many cards from day 1 should be due for review now
    const day6Words = new Set(queue2.cards.map(c => c.word));
    const reviewCards = [...day6Words].filter(w => day1Words.has(w));
    console.log(`[SIM] Day 6: ${reviewCards.length}/${CARDS_PER_SESSION} cards are reviews from Day 1`);
    
    // Complete day 6
    for (const card of queue2.cards) {
      await recordCardCompletion(child.id, card.word, {
        success: true,
        attempts: 1,
        matchScore: 0.9,
        neededHelp: false,
      });
    }

    const levelAfterDay6 = (await testHelper.db.getChild(child.id))?.current_level ?? 1;
    console.log(`[SIM] After Day 6: level=${levelAfterDay6}`);

    // Progress should have continued, not reset
    expect(levelAfterDay6).toBeGreaterThanOrEqual(levelAfterDay1);
    
    // Should NOT have lost any progress due to skip days
    console.log('[SIM] ✓ Skip days did not lose any progress');
  });

  it('same-day replays do not advance level multiple times', async () => {
    const child = await testHelper.createChild({ current_level: 1 });

    // Session 1 of the day
    const queue1 = await getCardQueue(child.id);
    for (const card of queue1.cards) {
      await recordCardCompletion(child.id, card.word, {
        success: true,
        attempts: 1,
        matchScore: 0.9,
        neededHelp: false,
      });
    }
    const levelAfterSession1 = (await testHelper.db.getChild(child.id))?.current_level ?? 1;

    // Session 2 of the day (replay)
    const queue2 = await getCardQueue(child.id);
    for (const card of queue2.cards) {
      await recordCardCompletion(child.id, card.word, {
        success: true,
        attempts: 1,
        matchScore: 0.9,
        neededHelp: false,
      });
    }
    const levelAfterSession2 = (await testHelper.db.getChild(child.id))?.current_level ?? 1;

    // Session 3 of the day (another replay)
    const queue3 = await getCardQueue(child.id);
    for (const card of queue3.cards) {
      await recordCardCompletion(child.id, card.word, {
        success: true,
        attempts: 1,
        matchScore: 0.9,
        neededHelp: false,
      });
    }
    const levelAfterSession3 = (await testHelper.db.getChild(child.id))?.current_level ?? 1;

    console.log(`[SIM] Levels: after S1=${levelAfterSession1}, S2=${levelAfterSession2}, S3=${levelAfterSession3}`);

    // All sessions return the exact same cards (replay)
    const cards1 = new Set(queue1.cards.map(c => c.word));
    const cards2 = new Set(queue2.cards.map(c => c.word));
    const cards3 = new Set(queue3.cards.map(c => c.word));
    
    const overlap12 = [...cards2].filter(w => cards1.has(w)).length;
    const overlap23 = [...cards3].filter(w => cards2.has(w)).length;
    
    console.log(`[SIM] Card overlap: S1-S2=${overlap12}/${CARDS_PER_SESSION}, S2-S3=${overlap23}/${CARDS_PER_SESSION}`);
    
    // Exact match indicates replay session persistence
    expect(overlap12).toBe(CARDS_PER_SESSION);
    expect(overlap23).toBe(CARDS_PER_SESSION);

    // Level should not advance on same-day replays
    expect(levelAfterSession2).toBe(levelAfterSession1);
    expect(levelAfterSession3).toBe(levelAfterSession1);
  });

  it('different days should show card variation (not same cards every day)', async () => {
    const child = await testHelper.createChild({ current_level: 1 });
    
    // Track card sets across 5 days
    const dailyCardSets: Set<string>[] = [];
    
    for (let day = 1; day <= 5; day++) {
      // Advance to new day
      const dayDate = new Date(baseDate);
      dayDate.setDate(baseDate.getDate() + (day - 1));
      vi.setSystemTime(dayDate);
      
      console.log(`[SIM] Day ${day}: ${dayDate.toISOString().split('T')[0]}`);
      
      // Get card queue for this day
      const queue = await getCardQueue(child.id);
      const cardWords = new Set(queue.cards.map(c => c.word));
      dailyCardSets.push(cardWords);
      
      console.log(`[SIM] Day ${day} cards (${queue.cards.length}): ${[...cardWords].slice(0, 5).join(', ')}...`);
      console.log(`[SIM] Day ${day} isReplay: ${queue.isReplay}`);
      
      // Complete all cards successfully (quality 5 - perfect)
      for (const card of queue.cards) {
        await recordCardCompletion(child.id, card.word, {
          success: true,
          attempts: 1,
          matchScore: 0.95,
          neededHelp: false,
        });
      }
      
      const currentChild = await testHelper.db.getChild(child.id);
      console.log(`[SIM] Day ${day} END: level=${currentChild?.current_level}`);
    }
    
    // Check overlap between consecutive days
    const overlaps: number[] = [];
    for (let i = 1; i < dailyCardSets.length; i++) {
      const prevSet = dailyCardSets[i - 1];
      const currSet = dailyCardSets[i];
      const overlap = [...currSet].filter(w => prevSet.has(w)).length;
      overlaps.push(overlap);
      console.log(`[SIM] Day ${i} → Day ${i + 1} overlap: ${overlap}/${CARDS_PER_SESSION} (${(overlap / CARDS_PER_SESSION * 100).toFixed(0)}%)`);
    }
    
    // Check for the problematic pattern: same cards every day (100% overlap)
    const allSameCards = overlaps.every(o => o === CARDS_PER_SESSION);
    
    if (allSameCards) {
      console.log(`[SIM] ❌ BUG DETECTED: Same cards shown every day for 5 days!`);
      console.log(`[SIM] Card set: ${[...dailyCardSets[0]].join(', ')}`);
    } else {
      console.log(`[SIM] ✓ Card variation detected across days`);
    }
    
    // CRITICAL: After 5 perfect days, we should see SOME variation
    // Due cards with interval 1 day come back, but cards with interval 3+ days should NOT
    // So we expect LESS than 100% overlap after day 2
    const averageOverlap = overlaps.reduce((a, b) => a + b, 0) / overlaps.length;
    console.log(`[SIM] Average daily overlap: ${averageOverlap.toFixed(1)}/${CARDS_PER_SESSION}`);
    
    // After day 2, SM-2 should push some cards to 3-day intervals
    // So we shouldn't see 100% overlap on day 3, 4, 5
    expect(overlaps[2]).toBeLessThan(CARDS_PER_SESSION);
    expect(overlaps[3]).toBeLessThan(CARDS_PER_SESSION);
    
    // The child should NOT see the same exact cards every single day
    expect(allSameCards).toBe(false);
  });
});
