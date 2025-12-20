import { supabase } from '../supabase/client';

export interface WordGenerationRequest {
  knownSounds: string[];
  targetPattern: string;
  difficulty: number;
  excludeWords?: string[];
  count?: number;
}

export interface WordGenerationResponse {
  word: string;
  phonemes: string[];
  syllables: number;
  difficulty: number;
  imagePrompt: string;
}

export interface ImageGenerationRequest {
  word: string;
  imagePrompt?: string;
}

export interface ImageGenerationResponse {
  imageBase64: string;
}

/**
 * Generate words using Gemini 3 Flash via Supabase Edge Function
 */
export async function generateWord(
  request: WordGenerationRequest
): Promise<WordGenerationResponse> {
  const { data, error } = await supabase.functions.invoke('generate-word', {
    body: request,
  });

  if (error) {
    throw new Error(`Word generation failed: ${error.message}`);
  }

  return data;
}

/**
 * Generate image using Nano Banana via Supabase Edge Function
 */
export async function generateImage(
  request: ImageGenerationRequest
): Promise<ImageGenerationResponse> {
  const { data, error } = await supabase.functions.invoke('generate-image', {
    body: request,
  });

  if (error) {
    throw new Error(`Image generation failed: ${error.message}`);
  }

  return data;
}


