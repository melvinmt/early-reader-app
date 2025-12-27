/**
 * Curriculum Service
 * Manages progressive learning based on DISTAR methodology
 * Handles phoneme introduction, card unlocking, and lesson progression
 */

import {
  getIntroducedPhonemes,
  isPhonemeIntroduced,
  markPhonemeIntroduced,
  getChild,
  updateChildLevel,
} from '../storage/database';
import { DISTAR_PHONEMES, getPhonemesForLesson, getPhonemesUpToLesson } from '@/data/distarPhonemes';
import type { DistarCard } from '@/data/distarCards';

/**
 * Segment a word into phonemes following DISTAR methodology
 * Handles digraphs (th, sh, ch, etc.) and special cases
 */
export function segmentWordIntoPhonemes(word: string): string[] {
  const digraphs = ['th', 'sh', 'ch', 'wh', 'ar', 'er', 'oo', 'ea', 'ai', 'ou', 'qu', 'ck'];
  const phonemes: string[] = [];
  let i = 0;
  const lowerWord = word.toLowerCase();
  
  while (i < lowerWord.length) {
    // Check for 'ing' trigraph first
    if (i < lowerWord.length - 2 && lowerWord.substring(i, i + 3) === 'ing') {
      phonemes.push('ing');
      i += 3;
      continue;
    }
    
    // Check for digraphs (two-letter sounds)
    if (i < lowerWord.length - 1) {
      const twoChars = lowerWord.substring(i, i + 2);
      if (digraphs.includes(twoChars)) {
        phonemes.push(twoChars);
        i += 2;
        continue;
      }
    }
    
    // Single character
    const char = lowerWord[i];
    // Skip silent 'e' at end of word (after consonant)
    if (char === 'e' && i === lowerWord.length - 1 && phonemes.length > 0) {
      const lastPhoneme = phonemes[phonemes.length - 1];
      if (!'aeiou'.includes(lastPhoneme)) {
        i++;
        continue;
      }
    }
    
    phonemes.push(char);
    i++;
  }
  
  return phonemes;
}

/**
 * Get phonemes for a specific lesson
 */
export function getPhonemesForLessonNumber(lesson: number): string[] {
  return DISTAR_PHONEMES.filter(p => p.lesson === lesson).map(p => p.symbol);
}

/**
 * Check if all phonemes in a card have been introduced to the child
 */
export async function isCardUnlocked(childId: string, card: DistarCard): Promise<boolean> {
  const introducedPhonemes = await getIntroducedPhonemes(childId);
  const introducedSet = new Set(introducedPhonemes);
  
  // For phoneme cards, check if this specific phoneme is introduced
  if (card.type === 'letter' || card.type === 'digraph') {
    return introducedSet.has(card.plainText.toLowerCase());
  }
  
  // For word/sentence cards, check if all phonemes are introduced
  const cardPhonemes = card.phonemes || [];
  return cardPhonemes.every(phoneme => introducedSet.has(phoneme.toLowerCase()));
}

/**
 * Mark a phoneme as introduced for a child
 */
export async function markPhonemeAsIntroduced(childId: string, phonemeSymbol: string): Promise<void> {
  await markPhonemeIntroduced(childId, phonemeSymbol.toLowerCase());
}

/**
 * Get phonemes that should be introduced for the current lesson but haven't been yet
 */
export async function getUnintroducedPhonemesForLesson(childId: string, lesson: number): Promise<string[]> {
  const lessonPhonemes = getPhonemesForLessonNumber(lesson);
  const introducedPhonemes = await getIntroducedPhonemes(childId);
  const introducedSet = new Set(introducedPhonemes);
  
  return lessonPhonemes.filter(phoneme => !introducedSet.has(phoneme.toLowerCase()));
}

/**
 * Get all cards that are unlocked for a child (based on introduced phonemes)
 */
export function getUnlockedCards(
  cards: DistarCard[],
  introducedPhonemes: string[]
): DistarCard[] {
  const introducedSet = new Set(introducedPhonemes.map(p => p.toLowerCase()));
  
  return cards.filter(card => {
    // Phoneme cards are unlocked if the phoneme is introduced
    if (card.type === 'letter' || card.type === 'digraph') {
      return introducedSet.has(card.plainText.toLowerCase());
    }
    
    // Word/sentence cards are unlocked if all their phonemes are introduced
    const cardPhonemes = card.phonemes || [];
    return cardPhonemes.every(phoneme => introducedSet.has(phoneme.toLowerCase()));
  });
}

/**
 * Check if a lesson is complete and child can advance
 * A lesson is complete when:
 * 1. All phonemes for that lesson have been introduced
 * 2. All available words for that lesson have been seen
 */
export async function isLessonComplete(childId: string, lesson: number): Promise<boolean> {
  const child = await getChild(childId);
  if (!child) return false;
  
  // Get phonemes for this lesson
  const lessonPhonemes = getPhonemesForLessonNumber(lesson);
  if (lessonPhonemes.length === 0) return false;
  
  // Check if all phonemes have been introduced
  const introducedPhonemes = await getIntroducedPhonemes(childId);
  const introducedSet = new Set(introducedPhonemes);
  
  const allPhonemesIntroduced = lessonPhonemes.every(
    phoneme => introducedSet.has(phoneme.toLowerCase())
  );
  
  if (!allPhonemesIntroduced) {
    return false;
  }
  
  // Lesson is complete if all phonemes are introduced
  // (We don't require all words to be seen, just phonemes)
  return true;
}

/**
 * Advance child to the next lesson if current lesson is complete
 */
export async function advanceLessonIfReady(childId: string): Promise<boolean> {
  const child = await getChild(childId);
  if (!child) return false;
  
  const currentLesson = child.current_level;
  
  // Check if current lesson is complete
  const isComplete = await isLessonComplete(childId, currentLesson);
  
  if (isComplete) {
    // Advance to next lesson
    const nextLesson = currentLesson + 1;
    
    // Don't advance beyond lesson 100 (max DISTAR lesson)
    if (nextLesson <= 100) {
      await updateChildLevel(childId, nextLesson);
      return true;
    }
  }
  
  return false;
}

/**
 * Get the maximum lesson number from phonemes
 */
export function getMaxLesson(): number {
  return Math.max(...DISTAR_PHONEMES.map(p => p.lesson));
}

