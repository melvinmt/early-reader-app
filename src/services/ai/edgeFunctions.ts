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
    const { data, error } = await supabase.functions.invoke('generate-word', {
      body: {
        level: params.level,
        phonemes: params.phonemes,
        childId: params.childId,
      },
    });

    if (error) {
      throw new Error(`Failed to generate word: ${error.message}`);
    }

    return data as GeneratedWord;
  } catch (error) {
    console.error('Error generating word:', error);
    throw error;
  }
}

/**
 * Generate an image using Google Imagen via Supabase Edge Function
 */
export async function generateImage(prompt: string): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-image', {
      body: {
        prompt,
      },
    });

    if (error) {
      throw new Error(`Failed to generate image: ${error.message}`);
    }

    return data.imageUrl as string;
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
}

/**
 * Get ephemeral token for OpenAI Realtime API WebRTC connection
 */
export async function getEphemeralToken(): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('get-realtime-token', {
      body: {},
    });

    if (error) {
      throw new Error(`Failed to get ephemeral token: ${error.message}`);
    }

    return data.token as string;
  } catch (error) {
    console.error('Error getting ephemeral token:', error);
    throw error;
  }
}

/**
 * Segment word into phonemes using AI
 */
export async function segmentPhonemes(word: string): Promise<string[]> {
  try {
    const { data, error } = await supabase.functions.invoke('segment-phonemes', {
      body: {
        word,
      },
    });

    if (error) {
      throw new Error(`Failed to segment phonemes: ${error.message}`);
    }

    return data.phonemes as string[];
  } catch (error) {
    console.error('Error segmenting phonemes:', error);
    // Fallback to simple character-based segmentation
    return word.split('');
  }
}

