/**
 * Speech Recognition Service
 * 
 * Wraps @react-native-voice/voice for pronunciation validation.
 * Implements extremely fuzzy matching for children's voices.
 */

import Voice from '@react-native-voice/voice';

export interface SpeechRecognitionResult {
  available: boolean;
  isRecognizing: boolean;
  recognizedText: string | null;
  matchScore: number; // 0-1 confidence score
}

export interface FuzzyMatchResult {
  matched: boolean;
  confidence: number; // 0-1
}

class SpeechRecognitionService {
  private isListening = false;
  private recognizedText: string | null = null;
  private isAvailable = false;
  private availabilityChecked = false;

  /**
   * Check if speech recognition is available on the device
   */
  async checkAvailability(): Promise<boolean> {
    if (this.availabilityChecked) {
      return this.isAvailable;
    }

    try {
      const available = await Voice.isAvailable();
      this.isAvailable = available;
      this.availabilityChecked = true;
      return available;
    } catch (error) {
      console.warn('Speech recognition not available:', error);
      this.isAvailable = false;
      this.availabilityChecked = true;
      return false;
    }
  }

  /**
   * Start listening for speech recognition
   * Force-starts by checking actual Voice API state, not just our flag
   */
  async startListening(locale: string = 'en-US'): Promise<{ available: boolean; error?: string }> {
    try {
      // Check actual Voice API state - our isListening flag can get out of sync
      const actuallyRecognizing = await this.isRecognizing();
      
      if (this.isListening && actuallyRecognizing) {
        console.log('🎤 Already listening (verified), skipping start');
        return { available: true };
      }
      
      // If our flag says listening but Voice API says not - we're desynced
      if (this.isListening && !actuallyRecognizing) {
        console.log('🎤 State desync detected - our flag says listening but Voice API says not. Resetting.');
        this.isListening = false;
      }

      console.log('🎤 Checking availability...');
      const available = await this.checkAvailability();
      if (!available) {
        console.error('🎤 Speech recognition not available on this device');
        return { available: false, error: 'Speech recognition not available' };
      }

      // Force stop any existing session before starting
      // This ensures clean state
      try {
        await Voice.stop();
      } catch (e) {
        // Ignore errors from stopping - it might not have been started
      }

      // Clear previous results
      this.recognizedText = null;

      console.log('🎤 Calling Voice.start() with locale:', locale);
      await Voice.start(locale);
      this.isListening = true;
      console.log('🎤 Voice.start() succeeded - now listening');
      return { available: true };
    } catch (error: any) {
      console.error('🎤 Voice.start() failed:', error);
      console.error('🎤 Error details:', {
        message: error?.message,
        code: error?.code,
        name: error?.name,
        stack: error?.stack,
      });
      this.isListening = false;
      return { 
        available: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Stop listening for speech recognition
   * Always tries to stop, even if we think we're not listening (to handle desyncs)
   */
  async stopListening(): Promise<void> {
    try {
      await Voice.stop();
    } catch (error) {
      // Ignore errors - may not have been started
    }
    this.isListening = false;
  }

  /**
   * Cancel speech recognition
   */
  async cancel(): Promise<void> {
    try {
      await Voice.cancel();
      this.isListening = false;
      this.recognizedText = null;
    } catch (error) {
      console.error('Error canceling speech recognition:', error);
    }
  }

  /**
   * Destroy the speech recognizer instance
   */
  async destroy(): Promise<void> {
    try {
      await Voice.destroy();
      this.isListening = false;
      this.recognizedText = null;
    } catch (error) {
      console.error('Error destroying speech recognition:', error);
    }
  }

  /**
   * Get current recognition status
   */
  async isRecognizing(): Promise<boolean> {
    try {
      return await Voice.isRecognizing();
    } catch (error) {
      return false;
    }
  }

  /**
   * Health check: Verify that Voice API state matches our internal state
   * Returns true if healthy, false if desync detected
   */
  async healthCheck(expectedListening: boolean): Promise<boolean> {
    try {
      const actualListening = await Voice.isRecognizing();
      if (expectedListening !== actualListening) {
        console.warn('⚠️ Speech recognition state desync:', {
          expected: expectedListening,
          actual: actualListening,
        });
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error in speech recognition health check:', error);
      return false;
    }
  }

  /**
   * Set recognized text (called from event handlers)
   */
  setRecognizedText(text: string | null): void {
    this.recognizedText = text;
  }

  /**
   * Get recognized text
   */
  getRecognizedText(): string | null {
    return this.recognizedText;
  }

  /**
   * Fuzzy string matching for children's voices
   * 
   * Accounts for:
   * - Dropped consonants (e.g., "cat" -> "ca")
   * - Vowel substitutions (e.g., "cat" -> "cot")
   * - Unclear endings (e.g., "cat" -> "cah")
   * - Partial matches for multi-word phrases
   * 
   * Uses moderate threshold (55%) - forgiving but not too loose
   */
  fuzzyMatch(recognized: string, target: string): FuzzyMatchResult {
    if (!recognized || !target) {
      return { matched: false, confidence: 0 };
    }

    // Normalize: lowercase, remove punctuation, collapse whitespace
    const normalizedRecognized = recognized
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const normalizedTarget = target
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Exact match
    if (normalizedRecognized === normalizedTarget) {
      return { matched: true, confidence: 1.0 };
    }

    // Check if recognized text contains target (or vice versa)
    if (normalizedRecognized.includes(normalizedTarget) || normalizedTarget.includes(normalizedRecognized)) {
      return { matched: true, confidence: 0.8 };
    }

    // For multi-word phrases, check individual word matches
    const recognizedWords = normalizedRecognized.split(/\s+/);
    const targetWords = normalizedTarget.split(/\s+/);
    
    if (targetWords.length > 1) {
      let matchedWords = 0;
      for (const targetWord of targetWords) {
        for (const recognizedWord of recognizedWords) {
          if (this.wordSimilarity(recognizedWord, targetWord) >= 0.55) {
            matchedWords++;
            break;
          }
        }
      }
      const wordMatchRatio = matchedWords / targetWords.length;
      if (wordMatchRatio >= 0.6) {
        return { matched: true, confidence: wordMatchRatio };
      }
    }

    // Single word or phrase similarity
    const similarity = this.wordSimilarity(normalizedRecognized, normalizedTarget);
    const threshold = 0.55; // Moderate threshold - forgiving but not too loose
    return {
      matched: similarity >= threshold,
      confidence: similarity,
    };
  }

  /**
   * Calculate word similarity using multiple heuristics
   */
  private wordSimilarity(word1: string, word2: string): number {
    if (word1 === word2) return 1.0;
    if (word1.length === 0 || word2.length === 0) return 0;

    // Length similarity (children may drop endings)
    const lengthRatio = Math.min(word1.length, word2.length) / Math.max(word1.length, word2.length);
    
    // First letter match (important for children)
    const firstLetterMatch = word1[0] === word2[0] ? 0.3 : 0;
    
    // Character overlap
    const charOverlap = this.calculateCharOverlap(word1, word2);
    
    // Vowel similarity (children may substitute vowels)
    const vowelSimilarity = this.calculateVowelSimilarity(word1, word2);
    
    // Combine scores (weighted)
    const similarity = 
      (lengthRatio * 0.2) +
      firstLetterMatch +
      (charOverlap * 0.3) +
      (vowelSimilarity * 0.2);

    return Math.min(1.0, similarity);
  }

  /**
   * Calculate character overlap between two words
   */
  private calculateCharOverlap(word1: string, word2: string): number {
    const chars1 = new Set(word1.split(''));
    const chars2 = new Set(word2.split(''));
    
    let overlap = 0;
    for (const char of chars1) {
      if (chars2.has(char)) {
        overlap++;
      }
    }
    
    const maxChars = Math.max(chars1.size, chars2.size);
    return maxChars > 0 ? overlap / maxChars : 0;
  }

  /**
   * Calculate vowel similarity (children often substitute vowels)
   */
  private calculateVowelSimilarity(word1: string, word2: string): number {
    const vowels = new Set(['a', 'e', 'i', 'o', 'u']);
    const vowels1 = word1.split('').filter(c => vowels.has(c));
    const vowels2 = word2.split('').filter(c => vowels.has(c));
    
    if (vowels1.length === 0 && vowels2.length === 0) return 1.0;
    if (vowels1.length === 0 || vowels2.length === 0) return 0.5;
    
    // Check if vowel patterns are similar (same positions)
    const minLength = Math.min(vowels1.length, vowels2.length);
    let matches = 0;
    for (let i = 0; i < minLength; i++) {
      if (vowels1[i] === vowels2[i]) {
        matches++;
      }
    }
    
    return matches / Math.max(vowels1.length, vowels2.length);
  }
}

export const speechRecognitionService = new SpeechRecognitionService();

