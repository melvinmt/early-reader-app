/**
 * Debug Card Output Test
 * Outputs all cards per day for manual review
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getCardQueue, recordCardCompletion, CARDS_PER_SESSION, getAllStaticCards } from '@/services/cardQueueManager';
import { IntegrationTestHelper } from '../session/integration-test-setup';
import * as configModule from '@/config/locale';
import * as levelsModule from '@/data/levels';
import * as databaseModule from '@/services/storage/database';
import * as fs from 'fs';
import * as path from 'path';

// Mock ONLY external dependencies (database, config, levels)
vi.mock('@/services/storage/database');
vi.mock('@/config/locale');
vi.mock('@/data/levels');

const mockDatabase = vi.mocked(databaseModule);
const mockConfig = vi.mocked(configModule);
const mockLevels = vi.mocked(levelsModule);

describe('Debug Card Output', () => {
  let testHelper: IntegrationTestHelper;
  const baseDate = new Date(2026, 0, 1, 12, 0, 0);

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

  it('outputs all cards per day for 100 days to file', async () => {
    const child = await testHelper.createChild({ current_level: 1 });
    const allStaticCards = getAllStaticCards();
    const maxDays = 100;
    
    const output: string[] = [];
    const log = (msg: string) => {
      output.push(msg);
    };
    
    log('================================================================================');
    log('CARD OUTPUT PER DAY - 100 DAYS SIMULATION');
    log('================================================================================');
    log('');

    for (let day = 1; day <= maxDays; day++) {
      const dayDate = new Date(baseDate);
      dayDate.setDate(baseDate.getDate() + (day - 1));
      vi.setSystemTime(dayDate);

      const updatedChild = await testHelper.db.getChild(child.id);
      const currentLevel = updatedChild?.current_level ?? 1;
      
      // Get introduced phonemes BEFORE the session
      const introducedPhonemesBefore = await testHelper.db.getIntroducedPhonemes(child.id);
      
      // Get the card queue
      const queue = await getCardQueue(child.id);
      
      // Get introduced phonemes AFTER the session
      const introducedPhonemesAfter = await testHelper.db.getIntroducedPhonemes(child.id);
      const newlyIntroduced = introducedPhonemesAfter.filter(p => !introducedPhonemesBefore.includes(p));
      
      log('--------------------------------------------------------------------------------');
      log(`DAY ${day} | Date: ${dayDate.toISOString().split('T')[0]} | Level: ${currentLevel} | isReplay: ${queue.isReplay}`);
      log(`Introduced phonemes (${introducedPhonemesAfter.length}): [${introducedPhonemesAfter.join(', ')}]`);
      if (newlyIntroduced.length > 0) {
        log(`NEW phonemes introduced: [${newlyIntroduced.join(', ')}]`);
      }
      log('--------------------------------------------------------------------------------');
      
      // Group cards by type
      const phonemeCards: string[] = [];
      const cvcCards: string[] = [];
      const wordCards: string[] = [];
      const sentenceCards: string[] = [];
      const unknownCards: string[] = [];
      
      for (const card of queue.cards) {
        const staticCard = allStaticCards.find(c => c.plainText === card.word);
        const type = staticCard?.type ?? 'unknown';
        const lesson = staticCard?.lesson ?? '?';
        const cardInfo = `${card.word} (L${lesson})`;
        
        switch (type) {
          case 'letter':
          case 'digraph':
            phonemeCards.push(cardInfo);
            break;
          case 'cvc':
            cvcCards.push(cardInfo);
            break;
          case 'word':
            wordCards.push(cardInfo);
            break;
          case 'sentence':
            sentenceCards.push(cardInfo);
            break;
          default:
            unknownCards.push(cardInfo);
        }
      }
      
      log('');
      log(`PHONEMES (${phonemeCards.length}): ${phonemeCards.join(', ') || '(none)'}`);
      log(`CVC (${cvcCards.length}): ${cvcCards.join(', ') || '(none)'}`);
      log(`WORDS (${wordCards.length}): ${wordCards.join(', ') || '(none)'}`);
      log(`SENTENCES (${sentenceCards.length}): ${sentenceCards.join(', ') || '(none)'}`);
      if (unknownCards.length > 0) {
        log(`UNKNOWN (${unknownCards.length}): ${unknownCards.join(', ')}`);
      }
      
      log('');
      log(`FULL CARD LIST (${queue.cards.length} cards):`);
      queue.cards.forEach((card, index) => {
        const staticCard = allStaticCards.find(c => c.plainText === card.word);
        const type = staticCard?.type ?? 'unknown';
        const lesson = staticCard?.lesson ?? '?';
        const progress = card.progress;
        const progressInfo = progress 
          ? `step=${progress.learning_step ?? 3}, attempts=${progress.attempts}, successes=${progress.successes}`
          : 'NEW';
        log(`  ${(index + 1).toString().padStart(2)}. ${card.word.padEnd(20)} | type=${type.padEnd(8)} | lesson=${String(lesson).padStart(2)} | ${progressInfo}`);
      });

      // Complete all cards successfully
      for (const card of queue.cards) {
        await recordCardCompletion(child.id, card.word, {
          success: true,
          attempts: 1,
          matchScore: 0.9,
          neededHelp: false,
        });
      }
      
      // Show level after session
      const afterChild = await testHelper.db.getChild(child.id);
      log('');
      log(`After session: Level ${currentLevel} → ${afterChild?.current_level}`);
      log('');
    }
    
    log('================================================================================');
    log('END OF SIMULATION');
    log('================================================================================');
    
    // Write to file
    const outputPath = path.join(process.cwd(), 'simulation-100-days.txt');
    fs.writeFileSync(outputPath, output.join('\n'), 'utf8');
    console.log(`\nSimulation output written to: ${outputPath}`);
    
    // Basic assertion to pass the test
    expect(true).toBe(true);
  });
});
