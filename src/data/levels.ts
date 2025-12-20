export interface LevelConfig {
  level: number;
  knownSounds: string[];
  pattern: string;
  difficulty: number;
  masteryThreshold: number;
  description: string;
}

export const LEVELS: LevelConfig[] = [
  {
    level: 1,
    knownSounds: ['a', 's', 'm', 't'],
    pattern: 'CVC with short a',
    difficulty: 1,
    masteryThreshold: 10,
    description: 'Basic CVC words with short a sound',
  },
  {
    level: 2,
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd'],
    pattern: 'CVC with a and e',
    difficulty: 2,
    masteryThreshold: 15,
    description: 'CVC words with short a and e sounds',
  },
  {
    level: 3,
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n', 'c'],
    pattern: 'CVC with i',
    difficulty: 3,
    masteryThreshold: 20,
    description: 'More CVC words with short i sound',
  },
  {
    level: 4,
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n', 'c', 'o', 'g', 'h'],
    pattern: 'CVC with o',
    difficulty: 4,
    masteryThreshold: 25,
    description: 'CVC words with short o sound',
  },
  {
    level: 5,
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n', 'c', 'o', 'g', 'h', 'u', 'l', 'f'],
    pattern: 'CVC with u',
    difficulty: 5,
    masteryThreshold: 30,
    description: 'CVC words with short u sound',
  },
  {
    level: 6,
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n', 'c', 'o', 'g', 'h', 'u', 'l', 'f', 'b', 'p'],
    pattern: 'CVC with b and p',
    difficulty: 6,
    masteryThreshold: 35,
    description: 'CVC words with b and p sounds',
  },
  {
    level: 7,
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n', 'c', 'o', 'g', 'h', 'u', 'l', 'f', 'b', 'p', 'v', 'k'],
    pattern: 'CVC with v and k',
    difficulty: 7,
    masteryThreshold: 40,
    description: 'CVC words with v and k sounds',
  },
  {
    level: 8,
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n', 'c', 'o', 'g', 'h', 'u', 'l', 'f', 'b', 'p', 'v', 'k', 'j', 'w'],
    pattern: 'CVC with j and w',
    difficulty: 8,
    masteryThreshold: 45,
    description: 'CVC words with j and w sounds',
  },
  {
    level: 9,
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n', 'c', 'o', 'g', 'h', 'u', 'l', 'f', 'b', 'p', 'v', 'k', 'j', 'w', 'x', 'y', 'z'],
    pattern: 'CVC with all consonants',
    difficulty: 9,
    masteryThreshold: 50,
    description: 'CVC words with all consonant sounds',
  },
  {
    level: 10,
    knownSounds: ['a', 's', 'm', 't', 'e', 'r', 'd', 'i', 'n', 'c', 'o', 'g', 'h', 'u', 'l', 'f', 'b', 'p', 'v', 'k', 'j', 'w', 'x', 'y', 'z', 'th', 'sh', 'ch'],
    pattern: 'Digraphs (th, sh, ch)',
    difficulty: 10,
    masteryThreshold: 55,
    description: 'Words with digraphs th, sh, and ch',
  },
];

export function getLevelConfig(level: number): LevelConfig | null {
  return LEVELS.find((l) => l.level === level) || null;
}

export function getNextLevelConfig(currentLevel: number): LevelConfig | null {
  return getLevelConfig(currentLevel + 1);
}


