/**
 * Supabase Edge Function client for AI services
 * All AI API keys are stored server-side in Supabase Edge Functions
 */

import { supabase } from '../supabase/client';

/**
 * Ensures we have a valid, non-expired session before calling Edge Functions
 * This is critical because Supabase validates JWT at the platform level before the function runs
 */
async function ensureValidSession() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    throw new Error(`Session error: ${sessionError.message}`);
  }
  
  if (!session) {
    throw new Error('No active session. Please sign in first.');
  }

  // Check if token is expired or about to expire (within 60 seconds)
  const now = Date.now() / 1000;
  const expiresAt = session.expires_at || 0;
  const timeUntilExpiry = expiresAt - now;

  if (timeUntilExpiry < 60) {
    // Token is expired or about to expire, try to refresh
    console.log('Token expired or expiring soon, refreshing...');
    const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.error('Failed to refresh session:', refreshError);
      throw new Error('Session expired and could not be refreshed. Please sign in again.');
    }
    
    if (!newSession) {
      throw new Error('Session expired. Please sign in again.');
    }
    
    return newSession;
  }

  return session;
}

export interface GeneratedWord {
  word: string;
  phonemes: string[];
  imageUrl: string;
  level: number;
}

export interface GenerateWordParams {
  level: number;
  phonemes: string[];
  childId: string;
  excludedWords?: string[]; // Words to exclude for variation
}

/**
 * Generate a word using Gemini AI via Supabase Edge Function
 */
export async function generateWord(params: GenerateWordParams): Promise<GeneratedWord> {
  try {
    // Ensure we have a valid session before calling Edge Function
    await ensureValidSession();

    // supabase.functions.invoke() automatically includes the Authorization header
    // with the current session token
    const { data, error } = await supabase.functions.invoke('generate-word', {
      body: {
        level: params.level,
        phonemes: params.phonemes,
        childId: params.childId,
        excludedWords: params.excludedWords || [],
      },
    });

    if (error) {
      console.error('Edge Function error:', error);
      // If it's an auth error, try refreshing and retrying once
      if (error.message?.includes('401') || error.message?.includes('JWT') || error.message?.includes('Unauthorized')) {
        console.log('Auth error detected, refreshing session and retrying...');
        const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !newSession) {
          throw new Error('Session expired. Please sign in again.');
        }
        // Retry with refreshed session
        const { data: retryData, error: retryError } = await supabase.functions.invoke('generate-word', {
          body: {
            level: params.level,
            phonemes: params.phonemes,
            childId: params.childId,
          },
        });
        if (retryError) {
          throw new Error(`Failed to generate word: ${retryError.message}`);
        }
        return retryData as GeneratedWord;
      }
      throw new Error(`Failed to generate word: ${error.message}`);
    }

    if (!data) {
      throw new Error('Edge Function returned no data');
    }

    return data as GeneratedWord;
  } catch (error: any) {
    console.error('Error generating word:', error);
    throw error;
  }
}

/**
 * Generate an image using Google Imagen via Supabase Edge Function
 */
export async function generateImage(prompt: string): Promise<string> {
  try {
    // Ensure we have a valid session before calling Edge Function
    await ensureValidSession();

    // supabase.functions.invoke() automatically includes the Authorization header
    const { data, error } = await supabase.functions.invoke('generate-image', {
      body: {
        prompt,
      },
    });

    if (error) {
      if (error.message?.includes('401') || error.message?.includes('JWT') || error.message?.includes('Unauthorized')) {
        // Try to refresh the session and retry
        const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !newSession) {
          throw new Error('Session expired. Please sign in again.');
        }
        const { data: retryData, error: retryError } = await supabase.functions.invoke('generate-image', {
          body: { prompt },
        });
        if (retryError) {
          throw new Error(`Failed to generate image: ${retryError.message}`);
        }
        return retryData?.imageUrl as string;
      }
      throw new Error(`Failed to generate image: ${error.message}`);
    }

    if (!data?.imageUrl) {
      throw new Error('Edge Function returned no image URL');
    }

    return data.imageUrl as string;
  } catch (error: any) {
    console.error('Error generating image:', error);
    throw error;
  }
}

/**
 * Get ephemeral token for OpenAI Realtime API WebRTC connection
 */
export async function getEphemeralToken(): Promise<string> {
  try {
    // Ensure we have a valid session before calling Edge Function
    await ensureValidSession();

    // supabase.functions.invoke() automatically includes the Authorization header
    const { data, error } = await supabase.functions.invoke('get-realtime-token', {
      body: {},
    });

    if (error) {
      if (error.message?.includes('401') || error.message?.includes('JWT') || error.message?.includes('Unauthorized')) {
        // Try to refresh the session and retry
        const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !newSession) {
          throw new Error('Session expired. Please sign in again.');
        }
        const { data: retryData, error: retryError } = await supabase.functions.invoke('get-realtime-token', {
          body: {},
        });
        if (retryError) {
          throw new Error(`Failed to get ephemeral token: ${retryError.message}`);
        }
        return retryData?.token as string;
      }
      throw new Error(`Failed to get ephemeral token: ${error.message}`);
    }

    if (!data?.token) {
      throw new Error('Edge Function returned no token');
    }

    return data.token as string;
  } catch (error: any) {
    console.error('Error getting ephemeral token:', error);
    throw error;
  }
}

/**
 * Segment word into phonemes using AI
 */
export async function segmentPhonemes(word: string): Promise<string[]> {
  try {
    // Try to ensure valid session, but fallback gracefully if it fails
    try {
      await ensureValidSession();
    } catch (sessionError) {
      console.warn('No valid session, using fallback phoneme segmentation');
      return word.split('');
    }

    // supabase.functions.invoke() automatically includes the Authorization header
    const { data, error } = await supabase.functions.invoke('segment-phonemes', {
      body: {
        word,
      },
    });

    if (error) {
      if (error.message?.includes('401') || error.message?.includes('JWT') || error.message?.includes('Unauthorized')) {
        console.warn('Authentication failed, using fallback phoneme segmentation');
        return word.split('');
      }
      throw new Error(`Failed to segment phonemes: ${error.message}`);
    }

    if (!data?.phonemes) {
      throw new Error('Edge Function returned no phonemes');
    }

    return data.phonemes as string[];
  } catch (error: any) {
    console.error('Error segmenting phonemes:', error);
    // Fallback to simple character-based segmentation
    return word.split('');
  }
}

