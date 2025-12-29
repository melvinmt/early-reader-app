/**
 * Pronunciation validation utilities
 */

export interface PronunciationResult {
  matchScore: number; // 0-1
  phonemeMatch: number; // 0-1
  wordMatch: number; // 0-1
  isCorrect: boolean; // >= 0.7 threshold
}

/**
 * Compare child's pronunciation to expected word
 * This is a simplified version - in production, use proper phoneme matching
 */
export function validatePronunciation(
  expectedWord: string,
  expectedPhonemes: string[],
  heardTranscript: string,
  heardPhonemes?: string[]
): PronunciationResult {
  // Simple word-level comparison
  const wordSimilarity = calculateWordSimilarity(
    expectedWord.toLowerCase(),
    heardTranscript.toLowerCase()
  );

  // Phoneme-level comparison (if available)
  let phonemeSimilarity = 0.5; // Default if phonemes not available
  if (heardPhonemes && heardPhonemes.length > 0) {
    phonemeSimilarity = calculatePhonemeSimilarity(expectedPhonemes, heardPhonemes);
  }

  // Weighted score: 70% phoneme, 30% word
  const matchScore = phonemeSimilarity * 0.7 + wordSimilarity * 0.3;

  return {
    matchScore,
    phonemeMatch: phonemeSimilarity,
    wordMatch: wordSimilarity,
    isCorrect: matchScore >= 0.7,
  };
}

/**
 * Calculate word similarity using Levenshtein distance
 */
function calculateWordSimilarity(word1: string, word2: string): number {
  const maxLen = Math.max(word1.length, word2.length);
  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(word1, word2);
  return 1 - distance / maxLen;
}

/**
 * Calculate phoneme similarity
 */
function calculatePhonemeSimilarity(
  expected: string[],
  heard: string[]
): number {
  if (expected.length === 0) return 0;

  let matches = 0;
  const minLen = Math.min(expected.length, heard.length);

  for (let i = 0; i < minLen; i++) {
    if (phonemesMatch(expected[i], heard[i])) {
      matches++;
    }
  }

  return matches / expected.length;
}

/**
 * Check if two phonemes match (with tolerance for child speech variations)
 */
function phonemesMatch(expected: string, heard: string): boolean {
  // Exact match
  if (expected === heard) return true;

  // Common child speech variations
  const variations: Record<string, string[]> = {
    'th': ['f', 's'],
    'r': ['w'],
    'l': ['w'],
  };

  for (const [sound, alts] of Object.entries(variations)) {
    if (expected === sound && alts.includes(heard)) return true;
    if (heard === sound && alts.includes(expected)) return true;
  }

  return false;
}

/**
 * Levenshtein distance algorithm
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}


















