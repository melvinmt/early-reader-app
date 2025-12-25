/**
 * Supabase Edge Function client for AI services
 * All AI API keys are stored server-side in Supabase Edge Functions
 */

import { supabase } from '../supabase/client';

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
}

/**
 * Generate a word using Gemini AI via Supabase Edge Function
 */
export async function generateWord(params: GenerateWordParams): Promise<GeneratedWord> {
  try {
    // Get current session to ensure auth token is available
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No active session. Please sign in first.');
    }

    const { data, error } = await supabase.functions.invoke('generate-word', {
      body: {
        level: params.level,
        phonemes: params.phonemes,
        childId: params.childId,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      throw new Error(`Failed to generate word: ${error.message}`);
    }

    if (!data) {
      throw new Error('Edge Function returned no data');
    }

    return data as GeneratedWord;
  } catch (error: any) {
    console.error('Error generating word:', error);
    // Provide more detailed error message
    if (error?.message?.includes('401') || error?.message?.includes('Invalid JWT')) {
      throw new Error('Authentication failed. Please sign in again.');
    }
    throw error;
  }
}

/**
 * Generate an image using Google Imagen via Supabase Edge Function
 */
export async function generateImage(prompt: string): Promise<string> {
  try {
    // Get current session to ensure auth token is available
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No active session. Please sign in first.');
    }

    const { data, error } = await supabase.functions.invoke('generate-image', {
      body: {
        prompt,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      throw new Error(`Failed to generate image: ${error.message}`);
    }

    if (!data?.imageUrl) {
      throw new Error('Edge Function returned no image URL');
    }

    return data.imageUrl as string;
  } catch (error: any) {
    console.error('Error generating image:', error);
    if (error?.message?.includes('401') || error?.message?.includes('Invalid JWT')) {
      throw new Error('Authentication failed. Please sign in again.');
    }
    throw error;
  }
}

/**
 * Get ephemeral token for OpenAI Realtime API WebRTC connection
 */
export async function getEphemeralToken(): Promise<string> {
  try {
    // Get current session to ensure auth token is available
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No active session. Please sign in first.');
    }

    const { data, error } = await supabase.functions.invoke('get-realtime-token', {
      body: {},
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      throw new Error(`Failed to get ephemeral token: ${error.message}`);
    }

    if (!data?.token) {
      throw new Error('Edge Function returned no token');
    }

    return data.token as string;
  } catch (error: any) {
    console.error('Error getting ephemeral token:', error);
    if (error?.message?.includes('401') || error?.message?.includes('Invalid JWT')) {
      throw new Error('Authentication failed. Please sign in again.');
    }
    throw error;
  }
}

/**
 * Segment word into phonemes using AI
 */
export async function segmentPhonemes(word: string): Promise<string[]> {
  try {
    // Get current session to ensure auth token is available
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No active session. Please sign in first.');
    }

    const { data, error } = await supabase.functions.invoke('segment-phonemes', {
      body: {
        word,
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      throw new Error(`Failed to segment phonemes: ${error.message}`);
    }

    if (!data?.phonemes) {
      throw new Error('Edge Function returned no phonemes');
    }

    return data.phonemes as string[];
  } catch (error: any) {
    console.error('Error segmenting phonemes:', error);
    // Fallback to simple character-based segmentation
    if (error?.message?.includes('401') || error?.message?.includes('Invalid JWT')) {
      console.warn('Authentication failed, using fallback phoneme segmentation');
    }
    return word.split('');
  }
}

