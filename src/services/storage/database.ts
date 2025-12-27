import * as SQLite from 'expo-sqlite';
import { Parent, Child, CardProgress, ContentCache, Session, IntroducedPhoneme } from '@/types/database';

let db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db;
  }

  db = await SQLite.openDatabaseAsync('instareader.db');

  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Create tables
  await createTables(db);

  return db;
}

async function createTables(database: SQLite.SQLiteDatabase) {
  // Parents table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS parents (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      created_at TEXT NOT NULL,
      subscription_status TEXT DEFAULT 'none',
      settings TEXT DEFAULT '{}'
    );
  `);

  // Children table
  await database.execAsync(`
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
  await database.execAsync(`
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
      FOREIGN KEY (child_id) REFERENCES children(id),
      UNIQUE(child_id, word)
    );
  `);

  // Introduced phonemes table
  await database.execAsync(`
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
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS content_cache (
      id TEXT PRIMARY KEY,
      content_type TEXT NOT NULL,
      content_key TEXT NOT NULL,
      content_data TEXT NOT NULL,
      file_path TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT,
      UNIQUE(content_type, content_key)
    );
  `);

  // Sessions table
  await database.execAsync(`
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

  // Create indexes
  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_card_progress_child ON card_progress(child_id);
    CREATE INDEX IF NOT EXISTS idx_card_progress_review ON card_progress(next_review_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_child ON sessions(child_id);
    CREATE INDEX IF NOT EXISTS idx_content_cache_type ON content_cache(content_type, content_key);
    CREATE INDEX IF NOT EXISTS idx_introduced_phonemes_child ON introduced_phonemes(child_id);
  `);

  // Migrate existing card_progress table to add hint_used column if it doesn't exist
  try {
    await database.execAsync(`
      ALTER TABLE card_progress ADD COLUMN hint_used INTEGER DEFAULT 0;
    `);
  } catch (error: any) {
    // Column already exists, ignore error
    if (!error.message?.includes('duplicate column')) {
      console.warn('Error adding hint_used column (may already exist):', error.message);
    }
  }
}

/**
 * Clear all cards, progressions, and cache for testing purposes
 * Keeps children and parents intact
 */
export async function clearTestingData(): Promise<void> {
  const database = await initDatabase();
  
  try {
    // Clear card progress
    await database.execAsync('DELETE FROM card_progress;');
    console.log('Cleared card_progress table');
    
    // Clear content cache (words and images)
    await database.execAsync('DELETE FROM content_cache;');
    console.log('Cleared content_cache table');
    
    // Clear sessions
    await database.execAsync('DELETE FROM sessions;');
    console.log('Cleared sessions table');
    
    // Reset children's progress counters
    await database.execAsync(`
      UPDATE children 
      SET current_level = 1, total_cards_completed = 0;
    `);
    console.log('Reset children progress counters');
    
    console.log('✅ All testing data cleared (cards, progressions, cache, sessions)');
  } catch (error) {
    console.error('Error clearing testing data:', error);
    throw error;
  }
}

// Parent CRUD operations
export async function createParent(parent: Parent): Promise<void> {
  const database = await initDatabase();
  // Use INSERT OR IGNORE to handle existing parents gracefully
  await database.runAsync(
    `INSERT OR IGNORE INTO parents (id, email, created_at, subscription_status, settings)
     VALUES (?, ?, ?, ?, ?)`,
    [parent.id, parent.email, parent.created_at, parent.subscription_status, parent.settings]
  );
}

export async function getParent(id: string): Promise<Parent | null> {
  const database = await initDatabase();
  const result = await database.getFirstAsync<Parent>(
    `SELECT * FROM parents WHERE id = ?`,
    [id]
  );
  return result || null;
}

export async function updateParentSubscriptionStatus(
  id: string,
  status: Parent['subscription_status']
): Promise<void> {
  const database = await initDatabase();
  await database.runAsync(
    `UPDATE parents SET subscription_status = ? WHERE id = ?`,
    [status, id]
  );
}

// Child CRUD operations
export async function createChild(child: Child): Promise<void> {
  const database = await initDatabase();
  await database.runAsync(
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
}

export async function getChildrenByParentId(parentId: string): Promise<Child[]> {
  const database = await initDatabase();
  const result = await database.getAllAsync<Child>(
    `SELECT * FROM children WHERE parent_id = ? ORDER BY created_at ASC`,
    [parentId]
  );
  return result;
}

export async function getChild(id: string): Promise<Child | null> {
  const database = await initDatabase();
  const result = await database.getFirstAsync<Child>(
    `SELECT * FROM children WHERE id = ?`,
    [id]
  );
  return result || null;
}

export async function updateChildLevel(childId: string, level: number): Promise<void> {
  const database = await initDatabase();
  await database.runAsync(
    `UPDATE children SET current_level = ? WHERE id = ?`,
    [level, childId]
  );
}

export async function incrementChildCardsCompleted(childId: string): Promise<void> {
  const database = await initDatabase();
  await database.runAsync(
    `UPDATE children SET total_cards_completed = total_cards_completed + 1 WHERE id = ?`,
    [childId]
  );
}

// Card progress operations
export async function createOrUpdateCardProgress(progress: CardProgress): Promise<void> {
  const database = await initDatabase();
  await database.runAsync(
    `INSERT INTO card_progress 
     (id, child_id, word, ease_factor, interval_days, next_review_at, attempts, successes, last_seen_at, hint_used)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(child_id, word) DO UPDATE SET
       ease_factor = excluded.ease_factor,
       interval_days = excluded.interval_days,
       next_review_at = excluded.next_review_at,
       attempts = excluded.attempts,
       successes = excluded.successes,
       last_seen_at = excluded.last_seen_at,
       hint_used = excluded.hint_used`,
    [
      progress.id,
      progress.child_id,
      progress.word,
      progress.ease_factor,
      progress.interval_days,
      progress.next_review_at,
      progress.attempts,
      progress.successes,
      progress.last_seen_at,
      progress.hint_used ?? 0,
    ]
  );
}

export async function getDueReviewCards(childId: string, limit: number = 5): Promise<CardProgress[]> {
  const database = await initDatabase();
  const now = new Date().toISOString();
  const result = await database.getAllAsync<CardProgress>(
    `SELECT * FROM card_progress 
     WHERE child_id = ? AND next_review_at <= ?
     ORDER BY next_review_at ASC
     LIMIT ?`,
    [childId, now, limit]
  );
  return result;
}

/**
 * Get due review cards by priority
 * Priority: 'high' (new/overdue), 'medium' (hint used), 'low' (fluent)
 */
export async function getDueReviewCardsByPriority(
  childId: string,
  priority: 'high' | 'medium' | 'low',
  limit: number = 10
): Promise<CardProgress[]> {
  const database = await initDatabase();
  const now = new Date().toISOString();
  
  let query = '';
  let params: any[] = [];
  
  if (priority === 'high') {
    // High: overdue or low ease factor (struggling)
    // Order by overdue first (next_review_at < now), then by attempts
    query = `SELECT * FROM card_progress 
     WHERE child_id = ? AND next_review_at <= ? AND (hint_used = 0 OR hint_used IS NULL) AND ease_factor < 2.3
     ORDER BY 
       CASE WHEN next_review_at < ? THEN 0 ELSE 1 END ASC,
       attempts ASC,
       next_review_at ASC
     LIMIT ?`;
    params = [childId, now, now, limit];
  } else if (priority === 'medium') {
    // Medium: hint was used
    query = `SELECT * FROM card_progress 
     WHERE child_id = ? AND next_review_at <= ? AND hint_used = 1
     ORDER BY next_review_at ASC
     LIMIT ?`;
    params = [childId, now, limit];
  } else {
    // Low: fluent cards (high ease factor, long intervals)
    query = `SELECT * FROM card_progress 
     WHERE child_id = ? AND next_review_at <= ? AND (hint_used = 0 OR hint_used IS NULL) AND ease_factor >= 2.3 AND interval_days >= 3
     ORDER BY next_review_at ASC
     LIMIT ?`;
    params = [childId, now, limit];
  }
  
  const result = await database.getAllAsync<CardProgress>(query, params);
  return result;
}

/**
 * Get all cards for a child (for testing - shows all cards regardless of review date)
 */
export async function getAllCardsForChild(childId: string): Promise<CardProgress[]> {
  const database = await initDatabase();
  const result = await database.getAllAsync<CardProgress>(
    `SELECT * FROM card_progress 
     WHERE child_id = ?
     ORDER BY 
       CASE WHEN last_seen_at IS NULL THEN 0 ELSE 1 END ASC,
       last_seen_at ASC,
       attempts ASC
     LIMIT 100`,
    [childId]
  );
  return result;
}

export async function getCardProgress(childId: string, word: string): Promise<CardProgress | null> {
  const database = await initDatabase();
  const result = await database.getFirstAsync<CardProgress>(
    `SELECT * FROM card_progress WHERE child_id = ? AND word = ?`,
    [childId, word]
  );
  return result || null;
}

// Content cache operations
export async function createOrUpdateContentCache(cache: ContentCache): Promise<void> {
  const database = await initDatabase();
  await database.runAsync(
    `INSERT INTO content_cache 
     (id, content_type, content_key, content_data, file_path, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(content_type, content_key) DO UPDATE SET
       content_data = excluded.content_data,
       file_path = excluded.file_path,
       expires_at = excluded.expires_at`,
    [
      cache.id,
      cache.content_type,
      cache.content_key,
      cache.content_data,
      cache.file_path,
      cache.created_at,
      cache.expires_at,
    ]
  );
}

export async function getContentCache(
  contentType: ContentCache['content_type'],
  contentKey: string
): Promise<ContentCache | null> {
  const database = await initDatabase();
  const result = await database.getFirstAsync<ContentCache>(
    `SELECT * FROM content_cache WHERE content_type = ? AND content_key = ?`,
    [contentType, contentKey]
  );
  return result || null;
}

// Session operations
export async function createSession(session: Session): Promise<void> {
  const database = await initDatabase();
  await database.runAsync(
    `INSERT INTO sessions (id, child_id, started_at, ended_at, cards_completed, duration_seconds)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      session.id,
      session.child_id,
      session.started_at,
      session.ended_at,
      session.cards_completed,
      session.duration_seconds,
    ]
  );
}

export async function updateSession(
  sessionId: string,
  endedAt: string,
  cardsCompleted: number,
  durationSeconds: number
): Promise<void> {
  const database = await initDatabase();
  await database.runAsync(
    `UPDATE sessions 
     SET ended_at = ?, cards_completed = ?, duration_seconds = ?
     WHERE id = ?`,
    [endedAt, cardsCompleted, durationSeconds, sessionId]
  );
}

export async function getSessionsByChildId(childId: string): Promise<Session[]> {
  const database = await initDatabase();
  const result = await database.getAllAsync<Session>(
    `SELECT * FROM sessions WHERE child_id = ? ORDER BY started_at DESC`,
    [childId]
  );
  return result;
}

// Introduced phonemes operations
export async function markPhonemeIntroduced(childId: string, phonemeSymbol: string): Promise<void> {
  const database = await initDatabase();
  const id = `${childId}-${phonemeSymbol}-${Date.now()}`;
  const now = new Date().toISOString();
  
  await database.runAsync(
    `INSERT OR IGNORE INTO introduced_phonemes (id, child_id, phoneme_symbol, introduced_at)
     VALUES (?, ?, ?, ?)`,
    [id, childId, phonemeSymbol, now]
  );
}

export async function getIntroducedPhonemes(childId: string): Promise<string[]> {
  const database = await initDatabase();
  const result = await database.getAllAsync<{ phoneme_symbol: string }>(
    `SELECT phoneme_symbol FROM introduced_phonemes WHERE child_id = ?`,
    [childId]
  );
  return result.map(r => r.phoneme_symbol);
}

export async function isPhonemeIntroduced(childId: string, phonemeSymbol: string): Promise<boolean> {
  const database = await initDatabase();
  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM introduced_phonemes WHERE child_id = ? AND phoneme_symbol = ?`,
    [childId, phonemeSymbol]
  );
  return (result?.count ?? 0) > 0;
}








