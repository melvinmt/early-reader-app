/**
 * DISTAR Phoneme Definitions
 * Based on "Teach Your Child to Read in 100 Easy Lessons" pronunciation guide
 * All 44 phonemes with their phonetic pronunciations for ElevenLabs TTS
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
 * Based on the pronunciation guide provided
 */
export const DISTAR_PHONEMES: DistarPhoneme[] = [
  // Lesson 1
  { symbol: 'm', pronunciation: 'mmm', exampleWord: 'ram', lesson: 1, type: 'voiced' },
  { symbol: 's', pronunciation: 'sss', exampleWord: 'bus', lesson: 1, type: 'whispered' },
  
  // Lesson 3
  { symbol: 'a', pronunciation: 'aah', exampleWord: 'and', lesson: 3, type: 'voiced' },
  
  // Lesson 5
  { symbol: 'ē', pronunciation: 'eee', exampleWord: 'eat', lesson: 5, type: 'voiced', hasMacron: true },
  
  // Lesson 7
  { symbol: 't', pronunciation: 't', exampleWord: 'cat', lesson: 7, type: 'whispered' },
  
  // Lesson 9
  { symbol: 'r', pronunciation: 'rrr', exampleWord: 'bar', lesson: 9, type: 'voiced' },
  
  // Lesson 12
  { symbol: 'd', pronunciation: 'd', exampleWord: 'mad', lesson: 12, type: 'voiced' },
  
  // Lesson 14
  { symbol: 'i', pronunciation: 'iii', exampleWord: 'if', lesson: 14, type: 'voiced' },
  
  // Lesson 16
  { symbol: 'th', pronunciation: 'thhhh', exampleWord: 'this', lesson: 16, type: 'voiced', isDigraph: true },
  
  // Lesson 19
  { symbol: 'c', pronunciation: 'c', exampleWord: 'tack', lesson: 19, type: 'whispered' },
  
  // Lesson 21
  { symbol: 'o', pronunciation: 'ooo', exampleWord: 'ox', lesson: 21, type: 'voiced' },
  
  // Lesson 23
  { symbol: 'n', pronunciation: 'nnn', exampleWord: 'pan', lesson: 23, type: 'voiced' },
  
  // Lesson 25
  { symbol: 'f', pronunciation: 'fff', exampleWord: 'stuff', lesson: 25, type: 'whispered' },
  
  // Lesson 27
  { symbol: 'u', pronunciation: 'uuu', exampleWord: 'under', lesson: 27, type: 'voiced' },
  
  // Lesson 29
  { symbol: 'l', pronunciation: 'lll', exampleWord: 'pal', lesson: 29, type: 'voiced' },
  
  // Lesson 31
  { symbol: 'w', pronunciation: 'www', exampleWord: 'wow', lesson: 31, type: 'voiced' },
  
  // Lesson 33
  { symbol: 'g', pronunciation: 'g', exampleWord: 'tag', lesson: 33, type: 'voiced' },
  
  // Lesson 35
  { symbol: 'sh', pronunciation: 'shhh', exampleWord: 'wish', lesson: 35, type: 'whispered', isDigraph: true },
  
  // Lesson 37
  { symbol: 'ā', pronunciation: 'aaa', exampleWord: 'ate', lesson: 37, type: 'voiced', hasMacron: true },
  
  // Lesson 39
  { symbol: 'h', pronunciation: 'h', exampleWord: 'hat', lesson: 39, type: 'whispered' },
  
  // Lesson 41
  { symbol: 'k', pronunciation: 'k', exampleWord: 'tack', lesson: 41, type: 'whispered' },
  
  // Lesson 43
  { symbol: 'ō', pronunciation: 'ooo', exampleWord: 'over', lesson: 43, type: 'voiced', hasMacron: true },
  
  // Lesson 45
  { symbol: 'v', pronunciation: 'vvv', exampleWord: 'love', lesson: 45, type: 'voiced' },
  
  // Lesson 47
  { symbol: 'p', pronunciation: 'p', exampleWord: 'sap', lesson: 47, type: 'whispered' },
  
  // Lesson 49
  { symbol: 'ar', pronunciation: 'olrr', exampleWord: 'car', lesson: 49, type: 'voiced', isDigraph: true },
  
  // Lesson 51
  { symbol: 'ch', pronunciation: 'ch', exampleWord: 'touch', lesson: 51, type: 'whispered', isDigraph: true },
  
  // Lesson 53
  { symbol: 'e', pronunciation: 'eee', exampleWord: 'end', lesson: 53, type: 'voiced' },
  
  // Lesson 55
  { symbol: 'b', pronunciation: 'b', exampleWord: 'grab', lesson: 55, type: 'voiced' },
  
  // Lesson 57
  { symbol: 'ing', pronunciation: 'iling', exampleWord: 'sing', lesson: 57, type: 'voiced', isDigraph: true },
  
  // Lesson 59
  { symbol: 'ī', pronunciation: 'iii', exampleWord: 'ice', lesson: 59, type: 'voiced', hasMacron: true },
  
  // Lesson 61
  { symbol: 'y', pronunciation: 'yyye', exampleWord: 'yard', lesson: 61, type: 'voiced' },
  
  // Lesson 63
  { symbol: 'er', pronunciation: 'urrr', exampleWord: 'brother', lesson: 63, type: 'voiced', isDigraph: true },
  
  // Lesson 65
  { symbol: 'oo', pronunciation: 'oooooo', exampleWord: 'moon', lesson: 65, type: 'voiced', isDigraph: true },
  
  // Lesson 67
  { symbol: 'j', pronunciation: 'j', exampleWord: 'judge', lesson: 67, type: 'voiced' },
  
  // Lesson 69
  { symbol: 'wh', pronunciation: 'www', exampleWord: 'why', lesson: 69, type: 'whispered', isDigraph: true },
  
  // Lesson 71
  { symbol: 'ȳ', pronunciation: 'yyye', exampleWord: 'my', lesson: 71, type: 'voiced', hasMacron: true },
  
  // Lesson 73
  { symbol: 'ū', pronunciation: 'ooo', exampleWord: 'use', lesson: 73, type: 'voiced', hasMacron: true },
  
  // Lesson 75
  { symbol: 'qu', pronunciation: 'kwww', exampleWord: 'quick', lesson: 75, type: 'whispered', isDigraph: true },
  
  // Lesson 77
  { symbol: 'x', pronunciation: 'ksss', exampleWord: 'ox', lesson: 77, type: 'whispered' },
  
  // Lesson 79
  { symbol: 'z', pronunciation: 'zzz', exampleWord: 'buzz', lesson: 79, type: 'voiced' },
  
  // Lesson 81
  { symbol: 'ea', pronunciation: 'eee', exampleWord: 'leave', lesson: 81, type: 'voiced', isDigraph: true },
  
  // Lesson 83
  { symbol: 'ai', pronunciation: 'aaa', exampleWord: 'rain', lesson: 83, type: 'voiced', isDigraph: true },
  
  // Lesson 89
  { symbol: 'ou', pronunciation: 'owww', exampleWord: 'loud', lesson: 89, type: 'voiced', isDigraph: true },
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






