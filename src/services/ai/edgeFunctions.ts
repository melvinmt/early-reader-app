import { supabase } from '../supabase/client';
import { ContentType } from '@/data/levels';

export interface ContentGenerationRequest {
  contentType: ContentType;
  knownSounds: string[];
  targetPattern: string;
  difficulty: number;
  excludeContent?: string[];
}

export interface ContentGenerationResponse {
  content: string;
  contentType: ContentType;
  phonemes: string[];
  wordCount: number;
  difficulty: number;
  imagePrompt: string;
}

// Legacy interface for backward compatibility
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
 * Generate content (sound, word, phrase, or sentence) using Gemini via Supabase Edge Function
 */
export async function generateContent(
  request: ContentGenerationRequest
): Promise<ContentGenerationResponse> {
  const { data, error } = await supabase.functions.invoke('generate-word', {
    body: request,
  });

  if (error) {
    throw new Error(`Content generation failed: ${error.message}`);
  }

  return data;
}

/**
 * Generate words using Gemini via Supabase Edge Function
 * @deprecated Use generateContent instead
 */
export async function generateWord(
  request: WordGenerationRequest
): Promise<WordGenerationResponse> {
  const contentRequest: ContentGenerationRequest = {
    contentType: 'word',
    knownSounds: request.knownSounds,
    targetPattern: request.targetPattern,
    difficulty: request.difficulty,
    excludeContent: request.excludeWords,
  };

  const response = await generateContent(contentRequest);

  // Map to legacy format
  return {
    word: response.content,
    phonemes: response.phonemes,
    syllables: response.wordCount,
    difficulty: response.difficulty,
    imagePrompt: response.imagePrompt,
  };
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
