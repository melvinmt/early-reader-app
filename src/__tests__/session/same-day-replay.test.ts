/**
 * Same-Day Replay Test
 * 
 * Verifies that when a child replays lessons on the same day:
 * 1. They get the same/similar cards (review cards)
 * 2. No duplicate words within a single session
 * 3. They can retake as often as they like
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCardQueue, recordCardCompletion, CARDS_PER_SESSION } from '@/services/cardQueueManager';
import { IntegrationTestHelper } from './integration-test-setup';
import * as configModule from '@/config/locale';
import * as levelsModule from '@/data/levels';
import * as databaseModule from '@/services/storage/database';

// Mock ONLY external dependencies
vi.mock('@/services/storage/database');
vi.mock('@/config/locale');
vi.mock('@/data/levels');

const mockDatabase = vi.mocked(databaseModule);
const mockConfig = vi.mocked(configModule);
const mockLevels = vi.mocked(levelsModule);

describe('Same-Day Replay - No Progression Until Next Day', () => {
  let testHelper: IntegrationTestHelper;

  beforeEach(async () => {
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
    mockDatabase.incrementChildCardsCompleted.mockResolvedValue();

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
  });

  it('replaying same day returns the exact same session', async () => {
    const child = await testHelper.createChild({ current_level: 1 });
    
    // First session
    const session1 = await getCardQueue(child.id);
    expect(session1.cards.length).toBe(CARDS_PER_SESSION);
    
    const session1Words = session1.cards.map(c => c.word);
    
    // Complete all cards
    for (const card of session1.cards) {
      await recordCardCompletion(child.id, card.word, {
        success: true,
        attempts: 1,
        matchScore: 0.9,
        neededHelp: false,
      });
    }
    
    // Second session same day - should get mostly the same cards (as reviews)
    const session2 = await getCardQueue(child.id);
    expect(session2.cards.length).toBe(CARDS_PER_SESSION);
    
    const session2Words = session2.cards.map(c => c.word);
    
    // Exact same session, same order
    expect(session2Words).toEqual(session1Words);
  });

  it('same-day replays do not advance level', async () => {
    const child = await testHelper.createChild({ current_level: 1 });
    
    // First session - level should advance from 1 to 2
    const session1 = await getCardQueue(child.id);
    const childAfterSession1Start = await testHelper.db.getChild(child.id);
    const levelAfterSession1Start = childAfterSession1Start?.current_level ?? 1;
    
    // Complete all cards in session 1
    for (const card of session1.cards) {
      await recordCardCompletion(child.id, card.word, {
        success: true,
        attempts: 1,
        matchScore: 0.9,
        neededHelp: false,
      });
    }
    
    const childAfterSession1 = await testHelper.db.getChild(child.id);
    const levelAfterSession1 = childAfterSession1?.current_level ?? 1;
    
    console.log(`After session 1: level = ${levelAfterSession1}`);
    
    // Second session same day (replay)
    const session2 = await getCardQueue(child.id);
    const childAfterSession2Start = await testHelper.db.getChild(child.id);
    const levelAfterSession2Start = childAfterSession2Start?.current_level ?? 1;
    
    // Complete all cards in session 2
    for (const card of session2.cards) {
      await recordCardCompletion(child.id, card.word, {
        success: true,
        attempts: 1,
        matchScore: 0.9,
        neededHelp: false,
      });
    }
    
    const childAfterSession2 = await testHelper.db.getChild(child.id);
    const levelAfterSession2 = childAfterSession2?.current_level ?? 1;
    
    console.log(`After session 2: level = ${levelAfterSession2}`);
    
    // Third session same day (replay)
    const session3 = await getCardQueue(child.id);
    const childAfterSession3Start = await testHelper.db.getChild(child.id);
    const levelAfterSession3 = childAfterSession3Start?.current_level ?? 1;
    
    console.log(`After session 3 start: level = ${levelAfterSession3}`);
    
    // Level should NOT advance on same-day replays
    expect(levelAfterSession2).toBe(levelAfterSession1);
    expect(levelAfterSession3).toBe(levelAfterSession1);
  });

  it('can retake lessons multiple times on same day', async () => {
    const child = await testHelper.createChild({ current_level: 5 });
    
    // Retake 5 times
    for (let attempt = 1; attempt <= 5; attempt++) {
      const session = await getCardQueue(child.id);
      expect(session.cards.length).toBe(CARDS_PER_SESSION);
      
      // Complete all cards
      for (const card of session.cards) {
        await recordCardCompletion(child.id, card.word, {
          success: true,
          attempts: 1,
          matchScore: 0.9,
          neededHelp: false,
        });
      }
      
      console.log(`Completed attempt ${attempt}`);
    }
    
    // Child should still be able to get cards
    const finalSession = await getCardQueue(child.id);
    expect(finalSession.cards.length).toBe(CARDS_PER_SESSION);
  });

  it('never has consecutive duplicate words in a session', async () => {
    const child = await testHelper.createChild({ current_level: 10 });
    
    // Get a session
    const session = await getCardQueue(child.id);
    expect(session.cards.length).toBe(CARDS_PER_SESSION);
    
    // Check for consecutive duplicates
    for (let i = 1; i < session.cards.length; i++) {
      expect(session.cards[i].word).not.toBe(session.cards[i - 1].word);
    }
    
    // Complete all cards
    for (const card of session.cards) {
      await recordCardCompletion(child.id, card.word, {
        success: true,
        attempts: 1,
        matchScore: 0.9,
        neededHelp: false,
      });
    }
    
    // Get another session and check again
    const session2 = await getCardQueue(child.id);
    for (let i = 1; i < session2.cards.length; i++) {
      expect(session2.cards[i].word).not.toBe(session2.cards[i - 1].word);
    }
    
    console.log('No consecutive duplicates found in sessions');
  });
});
