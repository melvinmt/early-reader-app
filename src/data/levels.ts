export type ContentType = 'sound' | 'word' | 'phrase' | 'sentence';

export interface LevelConfig {
  level: number;
  contentType: ContentType;
  knownSounds: string[];
  pattern: string;
  difficulty: number;
  masteryThreshold: number;
  description: string;
  examples: string[];
}

export const LEVELS: LevelConfig[] = [
  // === PHASE 1: Individual Sound Practice (Levels 1-4) ===
  {
    level: 1,
    contentType: 'sound',
    knownSounds: ['a', 's'],
    pattern: 'single letter sounds',
    difficulty: 1,
    masteryThreshold: 5,
    description: 'Learning sounds: a, s',
    examples: ['a', 's'],
  },
  {
    level: 2,
    contentType: 'sound',
    knownSounds: ['a', 's', 'm', 't'],
    pattern: 'single letter sounds',
    difficulty: 1,
    masteryThreshold: 5,
    description: 'Learning sounds: m, t',
    examples: ['m', 't'],
  },
  {
    level: 3,
    contentType: 'sound',
    knownSounds: ['a', 's', 'm', 't', 'e', 'r'],
    pattern: 'single letter sounds',
    difficulty: 1,
    masteryThreshold: 5,
    description: 'Learning sounds: e, r',
    examples: ['e', 'r'],
  },
  {
    level: 4,
    contentType: 'sound',
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i'],
    pattern: 'single letter sounds',
    difficulty: 2,
    masteryThreshold: 5,
    description: 'Learning sounds: d, i',
    examples: ['d', 'i'],
  },

  // === PHASE 2: Simple CVC Words (Levels 5-10) ===
  {
    level: 5,
    contentType: 'word',
    knownSounds: ['a', 's', 'm', 't'],
    pattern: 'CVC with short a',
    difficulty: 2,
    masteryThreshold: 8,
    description: 'First CVC words with a',
    examples: ['sat', 'mat', 'Sam', 'am', 'at'],
  },
  {
    level: 6,
    contentType: 'word',
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd'],
    pattern: 'CVC with short a and e',
    difficulty: 3,
    masteryThreshold: 10,
    description: 'CVC words with a and e',
    examples: ['red', 'set', 'met', 'sad', 'dad'],
  },
  {
    level: 7,
    contentType: 'word',
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n'],
    pattern: 'CVC with short i',
    difficulty: 3,
    masteryThreshold: 10,
    description: 'CVC words with i sound',
    examples: ['sit', 'tin', 'din', 'in', 'it'],
  },
  {
    level: 8,
    contentType: 'word',
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n', 'c', 'o'],
    pattern: 'CVC with short o',
    difficulty: 4,
    masteryThreshold: 12,
    description: 'CVC words with o sound',
    examples: ['cot', 'not', 'dot', 'on', 'cod'],
  },
  {
    level: 9,
    contentType: 'word',
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n', 'c', 'o', 'g', 'h', 'u'],
    pattern: 'CVC with short u',
    difficulty: 4,
    masteryThreshold: 12,
    description: 'CVC words with u sound',
    examples: ['hug', 'rug', 'mug', 'cut', 'nut'],
  },
  {
    level: 10,
    contentType: 'word',
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n', 'c', 'o', 'g', 'h', 'u', 'l', 'f', 'b', 'p'],
    pattern: 'CVC with all short vowels',
    difficulty: 5,
    masteryThreshold: 15,
    description: 'Mixed CVC words',
    examples: ['lip', 'bun', 'fog', 'pet', 'cab'],
  },

  // === PHASE 3: Simple Phrases (Levels 11-15) ===
  {
    level: 11,
    contentType: 'phrase',
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n'],
    pattern: '2-word phrases',
    difficulty: 5,
    masteryThreshold: 10,
    description: 'Two-word phrases',
    examples: ['a mat', 'sad Sam', 'red tin'],
  },
  {
    level: 12,
    contentType: 'phrase',
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n', 'c', 'o', 'g', 'h'],
    pattern: '2-3 word phrases',
    difficulty: 6,
    masteryThreshold: 12,
    description: 'Short descriptive phrases',
    examples: ['a hot dog', 'the red hat', 'on a mat'],
  },
  {
    level: 13,
    contentType: 'phrase',
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n', 'c', 'o', 'g', 'h', 'u', 'l', 'f'],
    pattern: '3-word phrases',
    difficulty: 6,
    masteryThreshold: 12,
    description: 'Noun phrases with adjectives',
    examples: ['a full cup', 'the fun run', 'a soft rug'],
  },
  {
    level: 14,
    contentType: 'phrase',
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n', 'c', 'o', 'g', 'h', 'u', 'l', 'f', 'b', 'p'],
    pattern: 'action phrases',
    difficulty: 7,
    masteryThreshold: 12,
    description: 'Verb phrases',
    examples: ['can run', 'will sit', 'did hop'],
  },
  {
    level: 15,
    contentType: 'phrase',
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n', 'c', 'o', 'g', 'h', 'u', 'l', 'f', 'b', 'p', 'v', 'k', 'w'],
    pattern: 'longer phrases',
    difficulty: 7,
    masteryThreshold: 15,
    description: 'Complex noun and verb phrases',
    examples: ['in the van', 'a big wet dog', 'can not stop'],
  },

  // === PHASE 4: Simple Sentences (Levels 16-20) ===
  {
    level: 16,
    contentType: 'sentence',
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n'],
    pattern: 'subject-verb sentences',
    difficulty: 7,
    masteryThreshold: 10,
    description: 'Simple 3-word sentences',
    examples: ['Sam sat.', 'I am sad.', 'Dad ran.'],
  },
  {
    level: 17,
    contentType: 'sentence',
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n', 'c', 'o', 'g', 'h'],
    pattern: 'subject-verb-object sentences',
    difficulty: 8,
    masteryThreshold: 12,
    description: '4-word sentences',
    examples: ['The dog ran.', 'Mom got a hat.', 'I can sit.'],
  },
  {
    level: 18,
    contentType: 'sentence',
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n', 'c', 'o', 'g', 'h', 'u', 'l', 'f', 'b', 'p'],
    pattern: 'sentences with adjectives',
    difficulty: 8,
    masteryThreshold: 15,
    description: '5-word descriptive sentences',
    examples: ['The big dog ran fast.', 'I had a red cup.', 'Sam is on the rug.'],
  },
  {
    level: 19,
    contentType: 'sentence',
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n', 'c', 'o', 'g', 'h', 'u', 'l', 'f', 'b', 'p', 'v', 'k', 'w', 'j'],
    pattern: 'sentences with prepositions',
    difficulty: 9,
    masteryThreshold: 15,
    description: 'Sentences with location words',
    examples: ['The cat is on the bed.', 'I put it in the box.', 'We sat on the bus.'],
  },
  {
    level: 20,
    contentType: 'sentence',
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n', 'c', 'o', 'g', 'h', 'u', 'l', 'f', 'b', 'p', 'v', 'k', 'w', 'j', 'x', 'y', 'z'],
    pattern: 'compound sentences',
    difficulty: 9,
    masteryThreshold: 18,
    description: 'Two-clause sentences',
    examples: ['I ran, and Sam sat.', 'The dog is big, but it is fun.'],
  },

  // === PHASE 5: Digraphs and Blends (Levels 21-25) ===
  {
    level: 21,
    contentType: 'word',
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n', 'c', 'o', 'g', 'h', 'u', 'l', 'f', 'b', 'p', 'sh'],
    pattern: 'words with sh',
    difficulty: 6,
    masteryThreshold: 10,
    description: 'Words with sh digraph',
    examples: ['ship', 'shop', 'shut', 'fish', 'dish'],
  },
  {
    level: 22,
    contentType: 'word',
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n', 'c', 'o', 'g', 'h', 'u', 'l', 'f', 'b', 'p', 'sh', 'ch'],
    pattern: 'words with ch',
    difficulty: 6,
    masteryThreshold: 10,
    description: 'Words with ch digraph',
    examples: ['chip', 'chop', 'chat', 'chin', 'much'],
  },
  {
    level: 23,
    contentType: 'word',
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n', 'c', 'o', 'g', 'h', 'u', 'l', 'f', 'b', 'p', 'sh', 'ch', 'th'],
    pattern: 'words with th',
    difficulty: 7,
    masteryThreshold: 10,
    description: 'Words with th digraph',
    examples: ['this', 'that', 'them', 'with', 'bath'],
  },
  {
    level: 24,
    contentType: 'sentence',
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n', 'c', 'o', 'g', 'h', 'u', 'l', 'f', 'b', 'p', 'sh', 'ch', 'th'],
    pattern: 'sentences with digraphs',
    difficulty: 9,
    masteryThreshold: 15,
    description: 'Sentences using digraph words',
    examples: ['This is a big ship.', 'I had fish and chips.', 'The shop is shut.'],
  },
  {
    level: 25,
    contentType: 'sentence',
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n', 'c', 'o', 'g', 'h', 'u', 'l', 'f', 'b', 'p', 'v', 'k', 'w', 'j', 'x', 'y', 'z', 'sh', 'ch', 'th', 'wh'],
    pattern: 'complex sentences',
    difficulty: 10,
    masteryThreshold: 20,
    description: 'Full sentences with all sounds',
    examples: ['When will the ship get to the dock?', 'I think that this is the best fish.'],
  },
];

export function getLevelConfig(level: number): LevelConfig | null {
  return LEVELS.find((l) => l.level === level) || null;
}

export function getNextLevelConfig(currentLevel: number): LevelConfig | null {
  return getLevelConfig(currentLevel + 1);
}

export function getLevelsByContentType(contentType: ContentType): LevelConfig[] {
  return LEVELS.filter((l) => l.contentType === contentType);
}
