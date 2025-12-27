/**
 * DISTAR Phoneme Definitions
 * Based on the DISTAR phonics methodology pioneered by Siegfried Engelmann
 * All 44 phonemes with their phonetic pronunciations for TTS
 * 
 * Pronunciations are optimized for ElevenLabs TTS to correctly produce the sounds:
 * - Single consonants need vowel sounds added (e.g., "t" → "tuh") to avoid letter names
 * - Short vowels need distinct spellings (e.g., "ooo" → "awww" for short 'o')
 * - Repeated letters (e.g., "www") are avoided as TTS reads them as letter names
 */

export interface DistarPhoneme {
  symbol: string;           // 'm', 'ā', 'th', etc.
  pronunciation: string;     // How ElevenLabs should say it: "mmm", "aaa"
  exampleWord: string;       // "ram", "and", "eat"
  lesson: number;           // Lesson number introduced
  type: 'voiced' | 'whispered';
  hasMacron?: boolean;      // Long vowel with macron
  isDigraph?: boolean;      // Two-letter sound
}

/**
 * All 44 DISTAR phonemes in lesson order
 * Pronunciations optimized for ElevenLabs TTS
 */
export const DISTAR_PHONEMES: DistarPhoneme[] = [
  // Lesson 1
  { symbol: 'm', pronunciation: 'mmm', exampleWord: 'ram', lesson: 1, type: 'voiced' },
  { symbol: 's', pronunciation: 'sss', exampleWord: 'bus', lesson: 1, type: 'whispered' },
  
  // Lesson 3
  // "aaah" like apple - "aah" is often read as 'father'
  { symbol: 'a', pronunciation: 'aaah', exampleWord: 'and', lesson: 3, type: 'voiced' },
  
  // Lesson 5
  { symbol: 'ē', pronunciation: 'eee', exampleWord: 'eat', lesson: 5, type: 'voiced', hasMacron: true },
  
  // Lesson 7
  // "tuh" (clipped) - "t" alone is read as the letter name "tee"
  { symbol: 't', pronunciation: 'tuh', exampleWord: 'cat', lesson: 7, type: 'whispered' },
  
  // Lesson 9
  { symbol: 'r', pronunciation: 'rrr', exampleWord: 'bar', lesson: 9, type: 'voiced' },
  
  // Lesson 12
  // "duh" - "d" alone is read as "dee"
  { symbol: 'd', pronunciation: 'duh', exampleWord: 'mad', lesson: 12, type: 'voiced' },
  
  // Lesson 14
  // "ihhh" - "iii" is often read as "eye"
  { symbol: 'i', pronunciation: 'ihhh', exampleWord: 'if', lesson: 14, type: 'voiced' },
  
  // Lesson 16
  { symbol: 'th', pronunciation: 'thhhh', exampleWord: 'this', lesson: 16, type: 'voiced', isDigraph: true },
  
  // Lesson 19
  // "kuh" - "c" alone is read as "see"
  { symbol: 'c', pronunciation: 'kuh', exampleWord: 'tack', lesson: 19, type: 'whispered' },
  
  // Lesson 21
  // "awww" - "ooo" is read as "moon". Short 'o' is "aw" (ox)
  { symbol: 'o', pronunciation: 'awww', exampleWord: 'ox', lesson: 21, type: 'voiced' },
  
  // Lesson 23
  { symbol: 'n', pronunciation: 'nnn', exampleWord: 'pan', lesson: 23, type: 'voiced' },
  
  // Lesson 25
  { symbol: 'f', pronunciation: 'fff', exampleWord: 'stuff', lesson: 25, type: 'whispered' },
  
  // Lesson 27
  // "uhhh" - "uuu" is read as "tube". Short 'u' is "uh"
  { symbol: 'u', pronunciation: 'uhhh', exampleWord: 'under', lesson: 27, type: 'voiced' },
  
  // Lesson 29
  { symbol: 'l', pronunciation: 'lll', exampleWord: 'pal', lesson: 29, type: 'voiced' },
  
  // Lesson 31
  // "wuh" - "www" is read as "Double-U Double-U..."
  { symbol: 'w', pronunciation: 'wuh', exampleWord: 'wow', lesson: 31, type: 'voiced' },
  
  // Lesson 33
  // "guh" - "g" alone is read as "jee"
  { symbol: 'g', pronunciation: 'guh', exampleWord: 'tag', lesson: 33, type: 'voiced' },
  
  // Lesson 35
  { symbol: 'sh', pronunciation: 'shhh', exampleWord: 'wish', lesson: 35, type: 'whispered', isDigraph: true },
  
  // Lesson 37
  { symbol: 'ā', pronunciation: 'aaa', exampleWord: 'ate', lesson: 37, type: 'voiced', hasMacron: true },
  
  // Lesson 39
  // "huh" - "h" alone is read as "aitch"
  { symbol: 'h', pronunciation: 'huh', exampleWord: 'hat', lesson: 39, type: 'whispered' },
  
  // Lesson 41
  // "kuh" - "k" alone is read as "kay"
  { symbol: 'k', pronunciation: 'kuh', exampleWord: 'tack', lesson: 41, type: 'whispered' },
  
  // Lesson 43
  // "ohhh" - safer than "ooo" for long O
  { symbol: 'ō', pronunciation: 'ohhh', exampleWord: 'over', lesson: 43, type: 'voiced', hasMacron: true },
  
  // Lesson 45
  { symbol: 'v', pronunciation: 'vvv', exampleWord: 'love', lesson: 45, type: 'voiced' },
  
  // Lesson 47
  // "puh" - "p" alone is read as "pee"
  { symbol: 'p', pronunciation: 'puh', exampleWord: 'sap', lesson: 47, type: 'whispered' },
  
  // Lesson 49
  // Fixed typo "olrr" -> "arrr"
  { symbol: 'ar', pronunciation: 'arrr', exampleWord: 'car', lesson: 49, type: 'voiced', isDigraph: true },
  
  // Lesson 51
  { symbol: 'ch', pronunciation: 'ch', exampleWord: 'touch', lesson: 51, type: 'whispered', isDigraph: true },
  
  // Lesson 53
  // "ehhh" - "eee" is Long E. Short E needs "eh" sound
  { symbol: 'e', pronunciation: 'ehhh', exampleWord: 'end', lesson: 53, type: 'voiced' },
  
  // Lesson 55
  // "buh" - "b" alone is read as "bee"
  { symbol: 'b', pronunciation: 'buh', exampleWord: 'grab', lesson: 55, type: 'voiced' },
  
  // Lesson 57
  // Fixed typo "iling" -> "ing"
  { symbol: 'ing', pronunciation: 'ing', exampleWord: 'sing', lesson: 57, type: 'voiced', isDigraph: true },
  
  // Lesson 59
  // "eye" for long I sound
  { symbol: 'ī', pronunciation: 'eye', exampleWord: 'ice', lesson: 59, type: 'voiced', hasMacron: true },
  
  // Lesson 61
  // "yuh" - "yyye" doesn't work well
  { symbol: 'y', pronunciation: 'yuh', exampleWord: 'yard', lesson: 61, type: 'voiced' },
  
  // Lesson 63
  { symbol: 'er', pronunciation: 'urrr', exampleWord: 'brother', lesson: 63, type: 'voiced', isDigraph: true },
  
  // Lesson 65
  { symbol: 'oo', pronunciation: 'oooooo', exampleWord: 'moon', lesson: 65, type: 'voiced', isDigraph: true },
  
  // Lesson 67
  // "juh" - "j" alone may be read as "jay"
  { symbol: 'j', pronunciation: 'juh', exampleWord: 'judge', lesson: 67, type: 'voiced' },
  
  // Lesson 69
  // "hwuh" - represents the breathy/whispered WH
  { symbol: 'wh', pronunciation: 'hwuh', exampleWord: 'why', lesson: 69, type: 'whispered', isDigraph: true },
  
  // Lesson 71
  // "eye" for long Y sound (like in "my")
  { symbol: 'ȳ', pronunciation: 'eye', exampleWord: 'my', lesson: 71, type: 'voiced', hasMacron: true },
  
  // Lesson 73
  // "yooo" for long U (like in "use")
  { symbol: 'ū', pronunciation: 'yooo', exampleWord: 'use', lesson: 73, type: 'voiced', hasMacron: true },
  
  // Lesson 75
  // "kwuh" - "kwww" doesn't work well
  { symbol: 'qu', pronunciation: 'kwuh', exampleWord: 'quick', lesson: 75, type: 'whispered', isDigraph: true },
  
  // Lesson 77
  // "ks" - cleaner than "ksss"
  { symbol: 'x', pronunciation: 'ks', exampleWord: 'ox', lesson: 77, type: 'whispered' },
  
  // Lesson 79
  { symbol: 'z', pronunciation: 'zzz', exampleWord: 'buzz', lesson: 79, type: 'voiced' },
  
  // Lesson 81
  { symbol: 'ea', pronunciation: 'eee', exampleWord: 'leave', lesson: 81, type: 'voiced', isDigraph: true },
  
  // Lesson 83
  { symbol: 'ai', pronunciation: 'aaa', exampleWord: 'rain', lesson: 83, type: 'voiced', isDigraph: true },
  
  // Lesson 89
  // "ow" - cleaner than "owww"
  { symbol: 'ou', pronunciation: 'ow', exampleWord: 'loud', lesson: 89, type: 'voiced', isDigraph: true },
];

/**
 * Get phoneme by symbol
 */
export function getPhoneme(symbol: string): DistarPhoneme | undefined {
  return DISTAR_PHONEMES.find(p => p.symbol === symbol);
}

/**
 * Get all phonemes up to a given lesson
 */
export function getPhonemesUpToLesson(lesson: number): DistarPhoneme[] {
  return DISTAR_PHONEMES.filter(p => p.lesson <= lesson);
}

/**
 * Get phonemes introduced in a specific lesson
 */
export function getPhonemesForLesson(lesson: number): DistarPhoneme[] {
  return DISTAR_PHONEMES.filter(p => p.lesson === lesson);
}
