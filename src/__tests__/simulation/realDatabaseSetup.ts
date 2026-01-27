/**
 * Real Database Setup for Simulations
 * 
 * This setup uses the ACTUAL database logic with better-sqlite3,
 * ensuring simulations test the same SQL queries and business logic
 * as the production app.
 */

import { beforeEach, afterEach, vi } from 'vitest';
import { createTestDatabaseAdapter, initializeTestSchema } from '../testDatabaseAdapter';
import { setDatabaseAdapter, resetDatabaseAdapter } from '@/services/storage/databaseInterface';
import type { Child } from '@/types/database';

// Store adapter reference for cleanup
let currentAdapter: ReturnType<typeof createTestDatabaseAdapter> | null = null;

/**
 * Setup real database for a test
 * Call this in beforeEach
 */
export async function setupRealDatabase(): Promise<ReturnType<typeof createTestDatabaseAdapter>> {
  // Create new in-memory database
  const adapter = createTestDatabaseAdapter();
  currentAdapter = adapter;
  
  // Initialize the schema (create all tables)
  await initializeTestSchema(adapter);
  
  // Set it as the global database adapter
  setDatabaseAdapter(adapter);
  
  return adapter;
}

/**
 * Cleanup database after test
 * Call this in afterEach
 */
export function cleanupRealDatabase(): void {
  if (currentAdapter) {
    currentAdapter.close();
    currentAdapter = null;
  }
  resetDatabaseAdapter();
}

/**
 * Create a test child directly in the database
 */
export async function createTestChild(
  adapter: ReturnType<typeof createTestDatabaseAdapter>,
  overrides: Partial<Child> = {}
): Promise<Child> {
  const now = new Date().toISOString();
  const child: Child = {
    id: `test-child-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    parent_id: 'test-parent-1',
    name: 'Test Child',
    age: 5,
    created_at: now,
    current_level: 1,
    total_cards_completed: 0,
    ...overrides,
  };
  
  // First create parent if needed
  await adapter.runAsync(
    `INSERT OR IGNORE INTO parents (id, email, created_at, subscription_status, settings)
     VALUES (?, ?, ?, ?, ?)`,
    [child.parent_id, 'test@example.com', now, 'none', '{}']
  );
  
  // Create child
  await adapter.runAsync(
    `INSERT INTO children (id, parent_id, name, age, created_at, current_level, total_cards_completed)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      child.id,
      child.parent_id,
      child.name,
      child.age,
      child.created_at,
      child.current_level,
      child.total_cards_completed,
    ]
  );
  
  return child;
}

/**
 * Get child from database
 */
export async function getTestChild(
  adapter: ReturnType<typeof createTestDatabaseAdapter>,
  childId: string
): Promise<Child | null> {
  const results = await adapter.getAllAsync<Child>(
    `SELECT * FROM children WHERE id = ?`,
    [childId]
  );
  return results.length > 0 ? results[0] : null;
}

/**
 * Helper to set up fake timers for day simulation
 */
export function setupFakeTimers(baseDate: Date = new Date(2026, 0, 1, 12, 0, 0)): void {
  vi.useFakeTimers();
  vi.setSystemTime(baseDate);
}

/**
 * Helper to advance to a specific day
 */
export function advanceToDay(baseDate: Date, dayNumber: number): void {
  const newDate = new Date(baseDate);
  newDate.setDate(baseDate.getDate() + (dayNumber - 1));
  vi.setSystemTime(newDate);
}

/**
 * Cleanup fake timers
 */
export function cleanupFakeTimers(): void {
  vi.useRealTimers();
}
