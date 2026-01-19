/**
 * Full Journey Simulation Test (Progression Logging)
 *
 * Simulates a child progressing through early lessons and logs
 * every level advancement and lesson-completion signal.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCardQueue, recordCardCompletion } from '@/services/cardQueueManager';
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

  it('logs progression and advances beyond level 1', async () => {
    const child = await testHelper.createChild({ current_level: 1 });

    let lastLevel = child.current_level;
    const maxSessions = 10;

    for (let session = 1; session <= maxSessions; session++) {
      const queue = await getCardQueue(child.id);
      console.log(
        `[SIM] Session ${session}: level=${lastLevel} cards=${queue.cards.length}`
      );

      for (const card of queue.cards) {
        await recordCardCompletion(child.id, card.word, {
          success: true,
          attempts: 1,
          matchScore: 0.9,
          neededHelp: false,
        });
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

      if (updatedChild.current_level > 1) {
        break;
      }
    }

    const finalChild = await testHelper.db.getChild(child.id);
    expect(finalChild?.current_level).toBeGreaterThan(1);
  });
});
