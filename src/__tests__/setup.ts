/**
 * Test Setup
 * Mock database and test utilities for DISTAR curriculum tests
 */

import { vi } from 'vitest';
import type { Child, CardProgress, IntroducedPhoneme } from '@/types/database';

// Mock database storage (in-memory)
class MockDatabase {
  private children: Map<string, Child> = new Map();
  private cardProgress: Map<string, CardProgress> = new Map();
  private introducedPhonemes: Map<string, IntroducedPhoneme> = new Map();

  // Child operations
  createChild(child: Child): void {
    this.children.set(child.id, child);
  }

  getChild(id: string): Child | null {
    return this.children.get(id) || null;
  }

  updateChildLevel(childId: string, level: number): void {
    const child = this.children.get(childId);
    if (child) {
      this.children.set(childId, { ...child, current_level: level });
    }
  }

  incrementChildCardsCompleted(childId: string): void {
    const child = this.children.get(childId);
    if (child) {
      this.children.set(childId, {
        ...child,
        total_cards_completed: child.total_cards_completed + 1,
      });
    }
  }

  // Card progress operations
  createOrUpdateCardProgress(progress: CardProgress): void {
    const key = `${progress.child_id}-${progress.word}`;
    this.cardProgress.set(key, progress);
  }

  getCardProgress(childId: string, word: string): CardProgress | null {
    const key = `${childId}-${word}`;
    return this.cardProgress.get(key) || null;
  }

  getDueReviewCards(childId: string, limit: number = 5): CardProgress[] {
    const now = new Date().toISOString();
    const due = Array.from(this.cardProgress.values())
      .filter(p => p.child_id === childId && p.next_review_at <= now)
      .sort((a, b) => new Date(a.next_review_at).getTime() - new Date(b.next_review_at).getTime())
      .slice(0, limit);
    return due;
  }

  getDueReviewCardsByPriority(
    childId: string,
    priority: 'high' | 'medium' | 'low',
    limit: number = 10
  ): CardProgress[] {
    const now = new Date().toISOString();
    let filtered = Array.from(this.cardProgress.values())
      .filter(p => p.child_id === childId && p.next_review_at <= now);

    if (priority === 'high') {
      filtered = filtered.filter(p => 
        (!p.hint_used || p.hint_used === 0) && (p.ease_factor < 2.3 || !p.ease_factor)
      );
      filtered.sort((a, b) => {
        const aOverdue = new Date(a.next_review_at).getTime() < new Date(now).getTime() ? 0 : 1;
        const bOverdue = new Date(b.next_review_at).getTime() < new Date(now).getTime() ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        return (a.attempts || 0) - (b.attempts || 0);
      });
    } else if (priority === 'medium') {
      filtered = filtered.filter(p => p.hint_used === 1);
      filtered.sort((a, b) => new Date(a.next_review_at).getTime() - new Date(b.next_review_at).getTime());
    } else {
      filtered = filtered.filter(p => 
        (!p.hint_used || p.hint_used === 0) && 
        (p.ease_factor || 2.5) >= 2.3 && 
        (p.interval_days || 0) >= 3
      );
      filtered.sort((a, b) => new Date(a.next_review_at).getTime() - new Date(b.next_review_at).getTime());
    }

    return filtered.slice(0, limit);
  }

  getAllCardsForChild(childId: string): CardProgress[] {
    return Array.from(this.cardProgress.values())
      .filter(p => p.child_id === childId)
      .sort((a, b) => {
        if (!a.last_seen_at && b.last_seen_at) return -1;
        if (a.last_seen_at && !b.last_seen_at) return 1;
        if (a.last_seen_at && b.last_seen_at) {
          const timeDiff = new Date(a.last_seen_at).getTime() - new Date(b.last_seen_at).getTime();
          if (timeDiff !== 0) return timeDiff;
        }
        return (a.attempts || 0) - (b.attempts || 0);
      })
      .slice(0, 100);
  }

  // Introduced phonemes operations
  markPhonemeIntroduced(childId: string, phonemeSymbol: string): void {
    const key = `${childId}-${phonemeSymbol}`;
    const existing = this.introducedPhonemes.get(key);
    if (!existing) {
      const id = `${childId}-${phonemeSymbol}-${Date.now()}`;
      this.introducedPhonemes.set(key, {
        id,
        child_id: childId,
        phoneme_symbol: phonemeSymbol,
        introduced_at: new Date().toISOString(),
      });
    }
  }

  getIntroducedPhonemes(childId: string): string[] {
    return Array.from(this.introducedPhonemes.values())
      .filter(p => p.child_id === childId)
      .map(p => p.phoneme_symbol);
  }

  isPhonemeIntroduced(childId: string, phonemeSymbol: string): boolean {
    const key = `${childId}-${phonemeSymbol}`;
    return this.introducedPhonemes.has(key);
  }

  // Reset for clean test state
  reset(): void {
    this.children.clear();
    this.cardProgress.clear();
    this.introducedPhonemes.clear();
  }
}

// Global mock database instance
export const mockDb = new MockDatabase();

// Test utilities
export function createMockChild(overrides: Partial<Child> = {}): Child {
  const now = new Date().toISOString();
  return {
    id: `child-${Date.now()}`,
    parent_id: 'parent-1',
    name: 'Test Child',
    age: 5,
    created_at: now,
    current_level: 1,
    total_cards_completed: 0,
    ...overrides,
  };
}

export function createMockCardProgress(
  childId: string,
  word: string,
  overrides: Partial<CardProgress> = {}
): CardProgress {
  const now = new Date();
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + 1);
  
  return {
    id: `${childId}-${word}-${Date.now()}`,
    child_id: childId,
    word,
    ease_factor: 2.5,
    interval_days: 1,
    next_review_at: nextReview.toISOString(),
    attempts: 0,
    successes: 0,
    last_seen_at: null,
    hint_used: 0,
    ...overrides,
  };
}

// Mock expo-sqlite (if needed for integration tests)
vi.mock('expo-sqlite', () => ({
  default: {
    openDatabaseAsync: vi.fn(),
  },
}));

