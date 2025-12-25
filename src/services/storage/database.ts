import * as SQLite from 'expo-sqlite';
import { Parent, Child, CardProgress, ContentCache, Session } from '@/types/database';

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
      FOREIGN KEY (child_id) REFERENCES children(id),
      UNIQUE(child_id, word)
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
  `);
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
     (id, child_id, word, ease_factor, interval_days, next_review_at, attempts, successes, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(child_id, word) DO UPDATE SET
       ease_factor = excluded.ease_factor,
       interval_days = excluded.interval_days,
       next_review_at = excluded.next_review_at,
       attempts = excluded.attempts,
       successes = excluded.successes,
       last_seen_at = excluded.last_seen_at`,
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








