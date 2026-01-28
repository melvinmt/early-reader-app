/**
 * Database Interface
 * 
 * Defines the contract for database operations.
 * This allows us to use expo-sqlite in production and better-sqlite3 in tests,
 * ensuring tests run the ACTUAL SQL queries and business logic.
 */

export interface DatabaseResult<T> {
  rows: T[];
}

/**
 * Generic database interface that both expo-sqlite and better-sqlite3 can implement
 */
export interface DatabaseAdapter {
  getAllAsync<T>(sql: string, params?: any[]): Promise<T[]>;
  runAsync(sql: string, params?: any[]): Promise<void>;
  execAsync(sql: string): Promise<void>;
}

/**
 * Global database adapter - can be swapped for testing
 */
let databaseAdapter: DatabaseAdapter | null = null;
let isInitialized = false;

/**
 * Set the database adapter (for testing)
 */
export function setDatabaseAdapter(adapter: DatabaseAdapter): void {
  databaseAdapter = adapter;
  isInitialized = false;
}

/**
 * Get the current database adapter
 */
export function getDatabaseAdapter(): DatabaseAdapter | null {
  return databaseAdapter;
}

/**
 * Reset the database adapter (for testing cleanup)
 */
export function resetDatabaseAdapter(): void {
  databaseAdapter = null;
  isInitialized = false;
}

/**
 * Check if using test adapter
 */
export function isUsingTestAdapter(): boolean {
  return databaseAdapter !== null;
}

/**
 * Mark database as initialized
 */
export function markInitialized(): void {
  isInitialized = true;
}

/**
 * Check if database is initialized
 */
export function isDatabaseInitialized(): boolean {
  return isInitialized;
}
