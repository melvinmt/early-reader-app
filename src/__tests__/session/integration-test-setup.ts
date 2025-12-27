/**
 * Integration Test Setup Infrastructure
 * 
 * Provides utilities for integration tests that use a real or properly mocked database.
 * 
 * This infrastructure enables tests that validate actual runtime behavior with
 * realistic database interactions, as opposed to unit tests with simple mocks.
 * 
 * Usage:
 * - For tests that need real database: Use TestDatabase class
 * - For tests that need mocked database: Use the mocking utilities
 * - For tests that need both: Use the hybrid approach
 */

import { vi } from 'vitest';
import type { Child, CardProgress, IntroducedPhoneme } from '@/types/database';

/**
 * Test Database Interface
 * 
 * Provides a consistent interface for both real and mocked databases
 * in integration tests.
 */
export interface TestDatabaseInterface {
  // Child operations
  getChild(id: string): Promise<Child | null>;
  createChild(child: Child): Promise<void>;
  updateChildLevel(childId: string, level: number): Promise<void>;
  
  // Card progress operations
  getCardProgress(childId: string, word: string): Promise<CardProgress | null>;
  createOrUpdateCardProgress(progress: CardProgress): Promise<void>;
  getDueReviewCards(childId: string, limit: number): Promise<CardProgress[]>;
  getAllCardsForChild(childId: string): Promise<CardProgress[]>;
  
  // Introduced phonemes operations
  getIntroducedPhonemes(childId: string): Promise<string[]>;
  markPhonemeIntroduced(childId: string, phonemeSymbol: string): Promise<void>;
  
  // Utility
  clearAll(): Promise<void>;
  reset(): Promise<void>;
}

/**
 * In-Memory Test Database
 * 
 * Implements TestDatabaseInterface using in-memory storage.
 * Useful for fast integration tests without real database overhead.
 */
export class InMemoryTestDatabase implements TestDatabaseInterface {
  private children: Map<string, Child> = new Map();
  private cardProgress: Map<string, CardProgress> = new Map();
  private introducedPhonemes: Map<string, IntroducedPhoneme> = new Map();

  async getChild(id: string): Promise<Child | null> {
    return this.children.get(id) || null;
  }

  async createChild(child: Child): Promise<void> {
    this.children.set(child.id, child);
  }

  async updateChildLevel(childId: string, level: number): Promise<void> {
    const child = this.children.get(childId);
    if (child) {
      this.children.set(childId, { ...child, current_level: level });
    }
  }

  async getCardProgress(childId: string, word: string): Promise<CardProgress | null> {
    const key = `${childId}-${word}`;
    return this.cardProgress.get(key) || null;
  }

  async createOrUpdateCardProgress(progress: CardProgress): Promise<void> {
    const key = `${progress.child_id}-${progress.word}`;
    this.cardProgress.set(key, progress);
  }

  async getDueReviewCards(childId: string, limit: number): Promise<CardProgress[]> {
    const now = new Date().toISOString();
    const due = Array.from(this.cardProgress.values())
      .filter(p => p.child_id === childId && p.next_review_at <= now)
      .sort((a, b) => new Date(a.next_review_at).getTime() - new Date(b.next_review_at).getTime())
      .slice(0, limit);
    return due;
  }

  async getAllCardsForChild(childId: string): Promise<CardProgress[]> {
    return Array.from(this.cardProgress.values())
      .filter(p => p.child_id === childId)
      .sort((a, b) => {
        if (!a.last_seen_at && b.last_seen_at) return -1;
        if (a.last_seen_at && !b.last_seen_at) return 1;
        if (a.last_seen_at && b.last_seen_at) {
          return new Date(a.last_seen_at).getTime() - new Date(b.last_seen_at).getTime();
        }
        return (a.attempts || 0) - (b.attempts || 0);
      });
  }

  async getIntroducedPhonemes(childId: string): Promise<string[]> {
    return Array.from(this.introducedPhonemes.values())
      .filter(p => p.child_id === childId)
      .map(p => p.phoneme_symbol);
  }

  async markPhonemeIntroduced(childId: string, phonemeSymbol: string): Promise<void> {
    const key = `${childId}-${phonemeSymbol}`;
    if (!this.introducedPhonemes.has(key)) {
      const id = `${childId}-${phonemeSymbol}-${Date.now()}`;
      this.introducedPhonemes.set(key, {
        id,
        child_id: childId,
        phoneme_symbol: phonemeSymbol,
        introduced_at: new Date().toISOString(),
      });
    }
  }

  async clearAll(): Promise<void> {
    this.children.clear();
    this.cardProgress.clear();
    this.introducedPhonemes.clear();
  }

  async reset(): Promise<void> {
    await this.clearAll();
  }
}

/**
 * Mock Database Setup Helper
 * 
 * Note: This function should be called after importing the database module in the test file.
 * The test file must mock '@/services/storage/database' before importing the function being tested.
 * 
 * This helper provides the mock implementations but doesn't set them up directly.
 * Instead, return these implementations from vi.mock in the test file.
 */
export function createDatabaseMockImplementations(testDb: TestDatabaseInterface) {
  return {
    getChild: vi.fn().mockImplementation((id: string) => testDb.getChild(id)),
    createChild: vi.fn().mockImplementation((child: Child) => testDb.createChild(child)),
    updateChildLevel: vi.fn().mockImplementation((childId: string, level: number) => 
      testDb.updateChildLevel(childId, level)
    ),
    getCardProgress: vi.fn().mockImplementation((childId: string, word: string) => 
      testDb.getCardProgress(childId, word)
    ),
    createOrUpdateCardProgress: vi.fn().mockImplementation((progress: CardProgress) => 
      testDb.createOrUpdateCardProgress(progress)
    ),
    getDueReviewCards: vi.fn().mockImplementation((childId: string, limit: number) => 
      testDb.getDueReviewCards(childId, limit)
    ),
    getAllCardsForChild: vi.fn().mockImplementation((childId: string) => 
      testDb.getAllCardsForChild(childId)
    ),
    getIntroducedPhonemes: vi.fn().mockImplementation((childId: string) => 
      testDb.getIntroducedPhonemes(childId)
    ),
    markPhonemeIntroduced: vi.fn().mockImplementation((childId: string, phoneme: string) => 
      testDb.markPhonemeIntroduced(childId, phoneme)
    ),
    initDatabase: vi.fn().mockResolvedValue({
      getAllAsync: vi.fn().mockImplementation(async (sql: string, params: any[]) => {
        // For "SELECT DISTINCT word FROM card_progress WHERE child_id = ?"
        if (sql.includes('SELECT DISTINCT word')) {
          const cards = await testDb.getAllCardsForChild(params[0]);
          return cards.map(c => ({ word: c.word }));
        }
        return [];
      }),
      runAsync: vi.fn().mockResolvedValue({}),
    }),
  };
}

/**
 * Test Child Factory
 */
export function createTestChild(overrides: Partial<Child> = {}): Child {
  const now = new Date().toISOString();
  return {
    id: `test-child-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    parent_id: 'test-parent-1',
    name: 'Test Child',
    age: 5,
    created_at: now,
    current_level: 1,
    total_cards_completed: 0,
    ...overrides,
  };
}

/**
 * Test Card Progress Factory
 */
export function createTestCardProgress(
  childId: string,
  word: string,
  overrides: Partial<CardProgress> = {}
): CardProgress {
  const now = new Date();
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + (overrides.interval_days || 1));
  
  return {
    id: `${childId}-${word}-${Date.now()}`,
    child_id: childId,
    word,
    ease_factor: 2.5,
    interval_days: 1,
    next_review_at: overrides.next_review_at || nextReview.toISOString(),
    attempts: 0,
    successes: 0,
    last_seen_at: null,
    hint_used: 0,
    ...overrides,
  };
}

/**
 * Integration Test Helper
 * 
 * Sets up a complete test environment with database and utilities.
 */
export class IntegrationTestHelper {
  public db: TestDatabaseInterface;
  
  constructor() {
    this.db = new InMemoryTestDatabase();
  }

  async setup() {
    // Note: Database mocking must be done in the test file using vi.mock
    // This helper just prepares the test database state
  }

  async teardown() {
    await this.db.reset();
  }

  async createChild(overrides: Partial<Child> = {}): Promise<Child> {
    const child = createTestChild(overrides);
    await this.db.createChild(child);
    return child;
  }

  async createCardProgress(
    childId: string,
    word: string,
    overrides: Partial<CardProgress> = {}
  ): Promise<CardProgress> {
    const progress = createTestCardProgress(childId, word, overrides);
    await this.db.createOrUpdateCardProgress(progress);
    return progress;
  }

  async introducePhonemes(childId: string, phonemes: string[]): Promise<void> {
    for (const phoneme of phonemes) {
      await this.db.markPhonemeIntroduced(childId, phoneme);
    }
  }
}

