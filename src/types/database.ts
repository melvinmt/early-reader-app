// Database entity types

export interface Parent {
  id: string; // Supabase Auth user ID
  email: string;
  created_at: string; // ISO timestamp
  subscription_status: 'none' | 'trial' | 'active' | 'cancelled' | 'expired';
  settings: string; // JSON string
}

export interface Child {
  id: string;
  parent_id: string;
  name: string;
  age: number;
  created_at: string; // ISO timestamp
  current_level: number;
  total_cards_completed: number;
}

export interface CardProgress {
  id: string;
  child_id: string;
  word: string;
  ease_factor: number; // SM-2 algorithm parameter
  interval_days: number; // Days until next review
  next_review_at: string; // ISO timestamp
  attempts: number;
  successes: number;
  last_seen_at: string | null;
}

export interface ContentCache {
  id: string;
  content_type: 'word' | 'image' | 'audio' | 'lesson';
  content_key: string; // Unique identifier for content
  content_data: string; // JSON string or base64 encoded data
  file_path: string | null; // Local file system path if applicable
  created_at: string; // ISO timestamp
  expires_at: string | null; // Optional expiration timestamp
}

export interface Session {
  id: string;
  child_id: string;
  started_at: string; // ISO timestamp
  ended_at: string | null;
  cards_completed: number;
  duration_seconds: number;
}






