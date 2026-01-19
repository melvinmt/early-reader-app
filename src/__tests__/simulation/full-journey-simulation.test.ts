/**
 * Full Journey Simulation Test (Progression Logging)
 *
 * Simulates a child progressing through early lessons and logs
 * every level advancement and lesson-completion signal.
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

// Mock ONLY external dependencies (database, config, levels)
vi.mock('@/services/storage/database');
vi.mock('@/config/locale');
vi.mock('@/data/levels');

const mockDatabase = vi.mocked(databaseModule);
const mockConfig = vi.mocked(configModule);
const mockLevels = vi.mocked(levelsModule);

describe('Full Journey Simulation - Progression Logs', () => {
  let testHelper: IntegrationTestHelper;
  const runFullJourney = process.env.FULL_JOURNEY_SIM === '1';
  const maxSessions = runFullJourney ? 500 : 25;
  const maxReappearanceGap = 3;

  const hashWord = (word: string): number => {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash * 31 + word.charCodeAt(i)) % 100000;
    }
    return hash;
  };

  const shouldFailCard = (word: string, index: number, session: number): boolean => {
    // Deterministic "sometimes fail" rule (no randomness)
    return (hashWord(word) + index + session) % 5 === 0;
  };

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
  });

  it('logs progression, handles failures, and advances levels', async () => {
    const child = await testHelper.createChild({ current_level: 1 });

    let lastLevel = child.current_level;
    let pendingReviewWords = new Set<string>();
    const failedAtSession = new Map<string, number>();

    for (let session = 1; session <= maxSessions; session++) {
      const queue = await getCardQueue(child.id);
      console.log(
        `[SIM] Session ${session}: level=${lastLevel} cards=${queue.cards.length}`
      );
      expect(queue.cards.length).toBe(CARDS_PER_SESSION);

      if (pendingReviewWords.size > 0) {
        const currentWords = new Set(queue.cards.map(c => c.word));
        const repeats = Array.from(pendingReviewWords).filter(w => currentWords.has(w));
        console.log(
          `[SIM] Review repeats from previous failures: ${repeats.join(', ') || 'none'}`
        );

        for (const word of pendingReviewWords) {
          const progress = await testHelper.db.getCardProgress(child.id, word);
          const attempts = progress?.attempts ?? 0;
          const successes = progress?.successes ?? 0;
          console.log(
            `[SIM] Review stats for "${word}": attempts=${attempts} successes=${successes} next_review_at=${progress?.next_review_at ?? 'n/a'}`
          );
          expect(progress).not.toBeNull();
          if (progress) {
            // Failure + retry should leave attempts higher than successes
            expect(progress.attempts).toBeGreaterThan(progress.successes);
          }
        }

        // Ensure failed cards reappear within a bounded number of sessions
        for (const [word, failedSession] of failedAtSession.entries()) {
          const gap = session - failedSession;
          if (gap > maxReappearanceGap) {
            expect(
              currentWords.has(word),
              `Failed card "${word}" did not reappear within ${maxReappearanceGap} sessions`
            ).toBe(true);
          }
        }
      }

      const failedThisSession = new Set<string>();

      for (let i = 0; i < queue.cards.length; i++) {
        const card = queue.cards[i];
        const shouldFail = shouldFailCard(card.word, i, session);

        if (shouldFail) {
          failedThisSession.add(card.word);
          failedAtSession.set(card.word, session);
          console.log(`[SIM] FAIL -> RETRY: "${card.word}"`);

          await recordCardCompletion(child.id, card.word, {
            success: false,
            attempts: 3,
            matchScore: 0.4,
            neededHelp: true,
            pronunciationFailed: true,
          });

          // Retry success with lower quality (penalized)
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

      const updatedChild = await testHelper.db.getChild(child.id);
      if (!updatedChild) {
        throw new Error('Child missing during simulation');
      }

      const lessonPhonemes = getPhonemesForLessonNumber(updatedChild.current_level);
      const introduced = await testHelper.db.getIntroducedPhonemes(child.id);
      const missing = lessonPhonemes.filter(p => !introduced.map(i => i.toLowerCase()).includes(p.toLowerCase()));
      const complete = await isLessonComplete(child.id, updatedChild.current_level);

      console.log(
        `[SIM] After session ${session}: level=${updatedChild.current_level} ` +
        `introduced=[${introduced.join(', ')}] ` +
        `required=[${lessonPhonemes.join(', ')}] ` +
        `missing=[${missing.join(', ')}] ` +
        `lessonComplete=${complete}`
      );

      if (updatedChild.current_level !== lastLevel) {
        console.log(
          `[SIM] LEVEL UP: ${lastLevel} -> ${updatedChild.current_level}`
        );
        lastLevel = updatedChild.current_level;
      }

      if (runFullJourney && session === maxSessions) {
        console.log(`[SIM] Completed ${maxSessions} sessions`);
      }

      pendingReviewWords = failedThisSession;
    }

    const finalChild = await testHelper.db.getChild(child.id);
    expect(finalChild?.current_level).toBeGreaterThan(1);

    if (runFullJourney) {
      expect(finalChild?.current_level).toBeGreaterThan(1);
    }
  });
});
