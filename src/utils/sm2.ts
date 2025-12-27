// SM-2 Spaced Repetition Algorithm Implementation

export interface SM2Result {
  nextInterval: number; // Days until next review
  nextEaseFactor: number;
  nextRepetitions: number;
  nextReviewDate: string; // ISO timestamp
}

export interface SM2Input {
  quality: number; // 0-5 rating
  easeFactor: number; // Current ease factor
  intervalDays: number; // Current interval in days
  repetitions: number; // Current repetition count
}

/**
 * SM-2 Algorithm implementation
 * Quality rating system:
 * 0 - Complete failure (couldn't say word after 3 tries)
 * 1 - Major struggle (needed help)
 * 2 - Minor struggle (2-3 attempts)
 * 3 - Correct with hesitation
 * 4 - Correct with minor hesitation
 * 5 - Perfect (first try)
 */
export function calculateSM2(input: SM2Input): SM2Result {
  const { quality, easeFactor, intervalDays, repetitions } = input;

  let nextEaseFactor = easeFactor;
  let nextInterval = intervalDays;
  let nextRepetitions = repetitions;

  // If quality < 3 (failed), reset
  if (quality < 3) {
    nextRepetitions = 0;
    nextInterval = 1; // Show again in next session
  } else {
    // Update ease factor
    nextEaseFactor = Math.max(
      1.3,
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );

    // Calculate next interval
    if (repetitions === 0) {
      // First review
      nextInterval = 1;
    } else if (repetitions === 1) {
      // Second review
      nextInterval = 3;
    } else {
      // Subsequent reviews
      nextInterval = Math.round(intervalDays * nextEaseFactor);
    }

    nextRepetitions = repetitions + 1;
  }

  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);

  return {
    nextInterval,
    nextEaseFactor,
    nextRepetitions,
    nextReviewDate: nextReviewDate.toISOString(),
  };
}

/**
 * Map pronunciation validation result to SM-2 quality rating
 */
export function mapPronunciationToQuality(
  matchScore: number,
  attempts: number,
  neededHelp: boolean
): number {
  if (neededHelp) {
    return 1; // Major struggle
  }

  if (attempts >= 3 && matchScore < 0.7) {
    return 0; // Complete failure
  }

  if (matchScore >= 0.9) {
    return attempts === 1 ? 5 : 4; // Perfect or good
  }

  if (matchScore >= 0.7) {
    return attempts === 2 ? 4 : 3; // Good or okay
  }

  return 2; // Minor struggle
}

/**
 * Card priority for spaced repetition scheduling
 * Determines the order in which cards should be reviewed
 */
export type CardPriority = 'high' | 'medium' | 'low';

/**
 * Calculate card priority based on hint usage and performance
 * 
 * Priority levels:
 * - High: New cards, failed cards, overdue cards (needs attention)
 * - Medium: Hint was used, minor struggles (needs more practice)
 * - Low: Correct & fluent, long intervals (mastered)
 * 
 * @param hintUsed Whether the child used a hint
 * @param quality SM-2 quality rating (0-5)
 * @param intervalDays Current interval in days
 */
export function calculateCardPriority(
  hintUsed: boolean,
  quality: number,
  intervalDays: number
): CardPriority {
  // Hint used → medium priority (needs more practice)
  if (hintUsed || quality <= 2) {
    return 'medium';
  }
  
  // Correct & fluent → lowest priority (mastered)
  if (quality >= 4 && intervalDays >= 3) {
    return 'low';
  }
  
  // Default → high priority (needs attention)
  return 'high';
}















