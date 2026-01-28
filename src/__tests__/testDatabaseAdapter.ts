/**
 * Test Database Adapter using better-sqlite3
 * 
 * This adapter uses the SAME SQL queries as the production database,
 * but runs in Node.js using better-sqlite3 instead of expo-sqlite.
 * 
 * This ensures simulations test the ACTUAL database logic.
 */

import Database from 'better-sqlite3';
import type { DatabaseAdapter } from '@/services/storage/databaseInterface';

/**
 * Creates a better-sqlite3 adapter that mimics expo-sqlite's async API
 */
export function createTestDatabaseAdapter(): DatabaseAdapter & { close: () => void; db: Database.Database } {
  // Create in-memory database for testing
  const db = new Database(':memory:');
  
  // Enable foreign keys like we do in production
  db.pragma('foreign_keys = ON');
  
  return {
    db,
    
    async getAllAsync<T>(sql: string, params: any[] = []): Promise<T[]> {
      try {
        const stmt = db.prepare(sql);
        return stmt.all(...params) as T[];
      } catch (error) {
        console.error('getAllAsync error:', sql, params, error);
        throw error;
      }
    },
    
    async runAsync(sql: string, params: any[] = []): Promise<void> {
      try {
        const stmt = db.prepare(sql);
        stmt.run(...params);
      } catch (error) {
        console.error('runAsync error:', sql, params, error);
        throw error;
      }
    },
    
    async execAsync(sql: string): Promise<void> {
      try {
        db.exec(sql);
      } catch (error) {
        console.error('execAsync error:', sql, error);
        throw error;
      }
    },
    
    close(): void {
      db.close();
    },
  };
}

/**
 * SQL schema - SAME as production database.ts
 * This is duplicated here to ensure tests use the exact same schema.
 */
export async function initializeTestSchema(adapter: DatabaseAdapter): Promise<void> {
  // Parents table
  await adapter.execAsync(`
    CREATE TABLE IF NOT EXISTS parents (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      created_at TEXT NOT NULL,
      subscription_status TEXT DEFAULT 'none',
      settings TEXT DEFAULT '{}'
    );
  `);

  // Children table
  await adapter.execAsync(`
    CREATE TABLE IF NOT EXISTS children (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      current_level INTEGER DEFAULT 1,
      total_cards_completed INTEGER DEFAULT 0,
      FOREIGN KEY (parent_id) REFERENCES parents(id)
    );
  `);

  // Card progress table
  await adapter.execAsync(`
    CREATE TABLE IF NOT EXISTS card_progress (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      word TEXT NOT NULL,
      ease_factor REAL DEFAULT 2.5,
      interval_days INTEGER DEFAULT 0,
      next_review_at TEXT NOT NULL,
      attempts INTEGER DEFAULT 0,
      successes INTEGER DEFAULT 0,
      last_seen_at TEXT,
      hint_used INTEGER DEFAULT 0,
      learning_step INTEGER DEFAULT 0,
      cards_since_last_seen INTEGER DEFAULT 0,
      FOREIGN KEY (child_id) REFERENCES children(id),
      UNIQUE(child_id, word)
    );
  `);

  // Introduced phonemes table
  await adapter.execAsync(`
    CREATE TABLE IF NOT EXISTS introduced_phonemes (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      phoneme_symbol TEXT NOT NULL,
      introduced_at TEXT NOT NULL,
      FOREIGN KEY (child_id) REFERENCES children(id),
      UNIQUE(child_id, phoneme_symbol)
    );
  `);

  // Content cache table
  await adapter.execAsync(`
    CREATE TABLE IF NOT EXISTS content_cache (
      id TEXT PRIMARY KEY,
      content_type TEXT NOT NULL,
      content_key TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(content_type, content_key)
    );
  `);

  // Sessions table
  await adapter.execAsync(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      cards_completed INTEGER DEFAULT 0,
      duration_seconds INTEGER DEFAULT 0,
      FOREIGN KEY (child_id) REFERENCES children(id)
    );
  `);

  // Session cards table (persist exact session for replays)
  await adapter.execAsync(`
    CREATE TABLE IF NOT EXISTS session_cards (
      id TEXT PRIMARY KEY,
      child_id TEXT NOT NULL,
      session_date TEXT NOT NULL,
      position INTEGER NOT NULL,
      word TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (child_id) REFERENCES children(id),
      UNIQUE(child_id, session_date, position)
    );
  `);

  // Create indexes
  await adapter.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_card_progress_child ON card_progress(child_id);
    CREATE INDEX IF NOT EXISTS idx_card_progress_review ON card_progress(next_review_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_child ON sessions(child_id);
    CREATE INDEX IF NOT EXISTS idx_session_cards_child_date ON session_cards(child_id, session_date);
    CREATE INDEX IF NOT EXISTS idx_content_cache_type ON content_cache(content_type, content_key);
    CREATE INDEX IF NOT EXISTS idx_introduced_phonemes_child ON introduced_phonemes(child_id);
  `);
}
