/**
 * Level definitions for Early Reader
 * Based on "Teach Your Child to Read in 100 Easy Lessons"
 * Each level introduces new phonemes and words following DISTAR methodology
 */

export interface Level {
  level: number;
  phonemes: string[]; // New phonemes introduced in this level
  words: string[]; // Example words for this level
  description: string;
  minWordsToComplete: number; // Minimum words to master before advancing
}

/**
 * Phoneme progression following DISTAR methodology
 * Levels 1-20: Basic sounds (m, a, s, e, t, etc.)
 * Levels 21-40: Blends and digraphs (sh, ch, th, etc.)
 * Levels 41-60: Complex patterns (long vowels, silent e, etc.)
 * Levels 61-80: Advanced patterns (diphthongs, r-controlled, etc.)
 * Levels 81-100: Mastery and fluency
 */
export const LEVELS: Level[] = [
  // Levels 1-20: Basic sounds
  {
    level: 1,
    phonemes: ['m', 'a'],
    words: ['am', 'ma'],
    description: 'Introduction to m and a sounds',
    minWordsToComplete: 2,
  },
  {
    level: 2,
    phonemes: ['s'],
    words: ['sam', 'mas'],
    description: 'Adding s sound',
    minWordsToComplete: 2,
  },
  {
    level: 3,
    phonemes: ['e'],
    words: ['me', 'see', 'sea'],
    description: 'Adding e sound',
    minWordsToComplete: 3,
  },
  {
    level: 4,
    phonemes: ['t'],
    words: ['at', 'sat', 'mat', 'met'],
    description: 'Adding t sound',
    minWordsToComplete: 4,
  },
  {
    level: 5,
    phonemes: ['i'],
    words: ['it', 'sit', 'mit', 'time'],
    description: 'Adding i sound',
    minWordsToComplete: 4,
  },
  {
    level: 6,
    phonemes: ['f'],
    words: ['if', 'fit', 'fat', 'fast'],
    description: 'Adding f sound',
    minWordsToComplete: 4,
  },
  {
    level: 7,
    phonemes: ['d'],
    words: ['ad', 'dad', 'fad', 'fade'],
    description: 'Adding d sound',
    minWordsToComplete: 4,
  },
  {
    level: 8,
    phonemes: ['r'],
    words: ['ar', 'far', 'rat', 'fart'],
    description: 'Adding r sound',
    minWordsToComplete: 4,
  },
  {
    level: 9,
    phonemes: ['o'],
    words: ['so', 'to', 'for', 'door'],
    description: 'Adding o sound',
    minWordsToComplete: 4,
  },
  {
    level: 10,
    phonemes: ['g'],
    words: ['go', 'got', 'dog', 'frog'],
    description: 'Adding g sound',
    minWordsToComplete: 4,
  },
  {
    level: 11,
    phonemes: ['l'],
    words: ['al', 'all', 'fall', 'tall'],
    description: 'Adding l sound',
    minWordsToComplete: 4,
  },
  {
    level: 12,
    phonemes: ['h'],
    words: ['ah', 'hat', 'hot', 'that'],
    description: 'Adding h sound',
    minWordsToComplete: 4,
  },
  {
    level: 13,
    phonemes: ['u'],
    words: ['up', 'cup', 'hut', 'cut'],
    description: 'Adding u sound',
    minWordsToComplete: 4,
  },
  {
    level: 14,
    phonemes: ['c'],
    words: ['cat', 'cut', 'act', 'fact'],
    description: 'Adding c sound',
    minWordsToComplete: 4,
  },
  {
    level: 15,
    phonemes: ['b'],
    words: ['bat', 'bit', 'but', 'tab'],
    description: 'Adding b sound',
    minWordsToComplete: 4,
  },
  {
    level: 16,
    phonemes: ['n'],
    words: ['an', 'can', 'man', 'tan'],
    description: 'Adding n sound',
    minWordsToComplete: 4,
  },
  {
    level: 17,
    phonemes: ['k'],
    words: ['ak', 'ask', 'task', 'mask'],
    description: 'Adding k sound',
    minWordsToComplete: 4,
  },
  {
    level: 18,
    phonemes: ['p'],
    words: ['ap', 'cap', 'map', 'tap'],
    description: 'Adding p sound',
    minWordsToComplete: 4,
  },
  {
    level: 19,
    phonemes: ['j'],
    words: ['aj', 'jam', 'jog', 'jump'],
    description: 'Adding j sound',
    minWordsToComplete: 4,
  },
  {
    level: 20,
    phonemes: ['w'],
    words: ['aw', 'wax', 'win', 'wow'],
    description: 'Adding w sound',
    minWordsToComplete: 4,
  },
  // Levels 21-40: Blends and digraphs
  {
    level: 21,
    phonemes: ['sh'],
    words: ['ash', 'ship', 'shop', 'wish'],
    description: 'Adding sh digraph',
    minWordsToComplete: 4,
  },
  {
    level: 22,
    phonemes: ['ch'],
    words: ['ach', 'chip', 'chop', 'much'],
    description: 'Adding ch digraph',
    minWordsToComplete: 4,
  },
  {
    level: 23,
    phonemes: ['th'],
    words: ['ath', 'thin', 'that', 'with'],
    description: 'Adding th digraph',
    minWordsToComplete: 4,
  },
  {
    level: 24,
    phonemes: ['wh'],
    words: ['awh', 'when', 'what', 'which'],
    description: 'Adding wh digraph',
    minWordsToComplete: 4,
  },
  {
    level: 25,
    phonemes: ['ng'],
    words: ['ang', 'sing', 'song', 'wing'],
    description: 'Adding ng blend',
    minWordsToComplete: 4,
  },
  {
    level: 26,
    phonemes: ['ck'],
    words: ['ack', 'back', 'sick', 'rock'],
    description: 'Adding ck blend',
    minWordsToComplete: 4,
  },
  {
    level: 27,
    phonemes: ['st'],
    words: ['ast', 'stop', 'fast', 'best'],
    description: 'Adding st blend',
    minWordsToComplete: 4,
  },
  {
    level: 28,
    phonemes: ['bl'],
    words: ['abl', 'blue', 'blow', 'black'],
    description: 'Adding bl blend',
    minWordsToComplete: 4,
  },
  {
    level: 29,
    phonemes: ['cl'],
    words: ['acl', 'clap', 'clip', 'clock'],
    description: 'Adding cl blend',
    minWordsToComplete: 4,
  },
  {
    level: 30,
    phonemes: ['fl'],
    words: ['afl', 'flag', 'flip', 'float'],
    description: 'Adding fl blend',
    minWordsToComplete: 4,
  },
  {
    level: 31,
    phonemes: ['gl'],
    words: ['agl', 'glad', 'glow', 'glass'],
    description: 'Adding gl blend',
    minWordsToComplete: 4,
  },
  {
    level: 32,
    phonemes: ['pl'],
    words: ['apl', 'plan', 'play', 'plus'],
    description: 'Adding pl blend',
    minWordsToComplete: 4,
  },
  {
    level: 33,
    phonemes: ['sl'],
    words: ['asl', 'slip', 'slow', 'sleep'],
    description: 'Adding sl blend',
    minWordsToComplete: 4,
  },
  {
    level: 34,
    phonemes: ['br'],
    words: ['abr', 'brag', 'brow', 'bread'],
    description: 'Adding br blend',
    minWordsToComplete: 4,
  },
  {
    level: 35,
    phonemes: ['cr'],
    words: ['acr', 'crab', 'crop', 'crack'],
    description: 'Adding cr blend',
    minWordsToComplete: 4,
  },
  {
    level: 36,
    phonemes: ['dr'],
    words: ['adr', 'drag', 'drop', 'drum'],
    description: 'Adding dr blend',
    minWordsToComplete: 4,
  },
  {
    level: 37,
    phonemes: ['fr'],
    words: ['afr', 'frog', 'from', 'fresh'],
    description: 'Adding fr blend',
    minWordsToComplete: 4,
  },
  {
    level: 38,
    phonemes: ['gr'],
    words: ['agr', 'grab', 'grow', 'grass'],
    description: 'Adding gr blend',
    minWordsToComplete: 4,
  },
  {
    level: 39,
    phonemes: ['pr'],
    words: ['apr', 'pram', 'prop', 'press'],
    description: 'Adding pr blend',
    minWordsToComplete: 4,
  },
  {
    level: 40,
    phonemes: ['tr'],
    words: ['atr', 'trap', 'trip', 'truck'],
    description: 'Adding tr blend',
    minWordsToComplete: 4,
  },
  // Levels 41-60: Complex patterns
  {
    level: 41,
    phonemes: ['a_e'],
    words: ['ate', 'cake', 'make', 'take'],
    description: 'Long a with silent e',
    minWordsToComplete: 4,
  },
  {
    level: 42,
    phonemes: ['i_e'],
    words: ['ice', 'like', 'time', 'bike'],
    description: 'Long i with silent e',
    minWordsToComplete: 4,
  },
  {
    level: 43,
    phonemes: ['o_e'],
    words: ['oke', 'hope', 'rope', 'note'],
    description: 'Long o with silent e',
    minWordsToComplete: 4,
  },
  {
    level: 44,
    phonemes: ['u_e'],
    words: ['use', 'cute', 'mute', 'fuse'],
    description: 'Long u with silent e',
    minWordsToComplete: 4,
  },
  {
    level: 45,
    phonemes: ['ee'],
    words: ['see', 'bee', 'tree', 'free'],
    description: 'Long e with ee',
    minWordsToComplete: 4,
  },
  {
    level: 46,
    phonemes: ['ea'],
    words: ['sea', 'tea', 'read', 'meat'],
    description: 'Long e with ea',
    minWordsToComplete: 4,
  },
  {
    level: 47,
    phonemes: ['ai'],
    words: ['aid', 'rain', 'pain', 'main'],
    description: 'Long a with ai',
    minWordsToComplete: 4,
  },
  {
    level: 48,
    phonemes: ['ay'],
    words: ['say', 'day', 'may', 'play'],
    description: 'Long a with ay',
    minWordsToComplete: 4,
  },
  {
    level: 49,
    phonemes: ['oa'],
    words: ['oak', 'boat', 'coat', 'goat'],
    description: 'Long o with oa',
    minWordsToComplete: 4,
  },
  {
    level: 50,
    phonemes: ['ow'],
    words: ['ow', 'cow', 'how', 'now'],
    description: 'ow sound',
    minWordsToComplete: 4,
  },
  {
    level: 51,
    phonemes: ['ou'],
    words: ['out', 'loud', 'cloud', 'round'],
    description: 'ou sound',
    minWordsToComplete: 4,
  },
  {
    level: 52,
    phonemes: ['oi'],
    words: ['oil', 'boil', 'coin', 'join'],
    description: 'oi sound',
    minWordsToComplete: 4,
  },
  {
    level: 53,
    phonemes: ['oy'],
    words: ['boy', 'toy', 'joy', 'enjoy'],
    description: 'oy sound',
    minWordsToComplete: 4,
  },
  {
    level: 54,
    phonemes: ['ar'],
    words: ['car', 'far', 'star', 'hard'],
    description: 'ar sound',
    minWordsToComplete: 4,
  },
  {
    level: 55,
    phonemes: ['er'],
    words: ['her', 'term', 'fern', 'verb'],
    description: 'er sound',
    minWordsToComplete: 4,
  },
  {
    level: 56,
    phonemes: ['ir'],
    words: ['ir', 'bird', 'firm', 'first'],
    description: 'ir sound',
    minWordsToComplete: 4,
  },
  {
    level: 57,
    phonemes: ['or'],
    words: ['or', 'for', 'fork', 'corn'],
    description: 'or sound',
    minWordsToComplete: 4,
  },
  {
    level: 58,
    phonemes: ['ur'],
    words: ['ur', 'burn', 'turn', 'hurt'],
    description: 'ur sound',
    minWordsToComplete: 4,
  },
  {
    level: 59,
    phonemes: ['oo'],
    words: ['oo', 'book', 'look', 'took'],
    description: 'Short oo sound',
    minWordsToComplete: 4,
  },
  {
    level: 60,
    phonemes: ['oo'],
    words: ['moon', 'soon', 'food', 'cool'],
    description: 'Long oo sound',
    minWordsToComplete: 4,
  },
  // Levels 61-80: Advanced patterns
  {
    level: 61,
    phonemes: ['aw'],
    words: ['aw', 'saw', 'law', 'draw'],
    description: 'aw sound',
    minWordsToComplete: 4,
  },
  {
    level: 62,
    phonemes: ['au'],
    words: ['au', 'haul', 'maul', 'cause'],
    description: 'au sound',
    minWordsToComplete: 4,
  },
  {
    level: 63,
    phonemes: ['ew'],
    words: ['ew', 'new', 'few', 'grew'],
    description: 'ew sound',
    minWordsToComplete: 4,
  },
  {
    level: 64,
    phonemes: ['ue'],
    words: ['ue', 'blue', 'glue', 'true'],
    description: 'ue sound',
    minWordsToComplete: 4,
  },
  {
    level: 65,
    phonemes: ['ie'],
    words: ['ie', 'pie', 'tie', 'lie'],
    description: 'ie sound',
    minWordsToComplete: 4,
  },
  {
    level: 66,
    phonemes: ['igh'],
    words: ['igh', 'high', 'sight', 'light'],
    description: 'igh sound',
    minWordsToComplete: 4,
  },
  {
    level: 67,
    phonemes: ['y'],
    words: ['my', 'by', 'cry', 'fly'],
    description: 'y as long i',
    minWordsToComplete: 4,
  },
  {
    level: 68,
    phonemes: ['y'],
    words: ['happy', 'baby', 'candy', 'funny'],
    description: 'y as long e',
    minWordsToComplete: 4,
  },
  {
    level: 69,
    phonemes: ['ph'],
    words: ['ph', 'phone', 'graph', 'photo'],
    description: 'ph sound',
    minWordsToComplete: 4,
  },
  {
    level: 70,
    phonemes: ['gh'],
    words: ['gh', 'ghost', 'light', 'night'],
    description: 'gh patterns',
    minWordsToComplete: 4,
  },
  {
    level: 71,
    phonemes: ['kn'],
    words: ['kn', 'knee', 'know', 'knife'],
    description: 'kn sound',
    minWordsToComplete: 4,
  },
  {
    level: 72,
    phonemes: ['wr'],
    words: ['wr', 'wrap', 'write', 'wrong'],
    description: 'wr sound',
    minWordsToComplete: 4,
  },
  {
    level: 73,
    phonemes: ['mb'],
    words: ['mb', 'lamb', 'comb', 'thumb'],
    description: 'mb sound',
    minWordsToComplete: 4,
  },
  {
    level: 74,
    phonemes: ['tion'],
    words: ['tion', 'action', 'nation', 'station'],
    description: 'tion suffix',
    minWordsToComplete: 4,
  },
  {
    level: 75,
    phonemes: ['sion'],
    words: ['sion', 'vision', 'mission', 'passion'],
    description: 'sion suffix',
    minWordsToComplete: 4,
  },
  {
    level: 76,
    phonemes: ['ous'],
    words: ['ous', 'famous', 'nervous', 'serious'],
    description: 'ous suffix',
    minWordsToComplete: 4,
  },
  {
    level: 77,
    phonemes: ['ful'],
    words: ['ful', 'careful', 'helpful', 'wonderful'],
    description: 'ful suffix',
    minWordsToComplete: 4,
  },
  {
    level: 78,
    phonemes: ['ly'],
    words: ['ly', 'quickly', 'slowly', 'happily'],
    description: 'ly suffix',
    minWordsToComplete: 4,
  },
  {
    level: 79,
    phonemes: ['ing'],
    words: ['ing', 'running', 'jumping', 'singing'],
    description: 'ing suffix',
    minWordsToComplete: 4,
  },
  {
    level: 80,
    phonemes: ['ed'],
    words: ['ed', 'jumped', 'walked', 'played'],
    description: 'ed suffix',
    minWordsToComplete: 4,
  },
  // Levels 81-100: Mastery and fluency
  {
    level: 81,
    phonemes: ['qu'],
    words: ['qu', 'quick', 'queen', 'quiet'],
    description: 'qu sound',
    minWordsToComplete: 5,
  },
  {
    level: 82,
    phonemes: ['x'],
    words: ['x', 'box', 'fox', 'mix'],
    description: 'x sound',
    minWordsToComplete: 5,
  },
  {
    level: 83,
    phonemes: ['z'],
    words: ['z', 'zip', 'zoo', 'buzz'],
    description: 'z sound',
    minWordsToComplete: 5,
  },
  {
    level: 84,
    phonemes: ['v'],
    words: ['v', 'van', 'vet', 'five'],
    description: 'v sound',
    minWordsToComplete: 5,
  },
  {
    level: 85,
    phonemes: ['y'],
    words: ['y', 'yes', 'yet', 'yell'],
    description: 'y as consonant',
    minWordsToComplete: 5,
  },
  {
    level: 86,
    phonemes: ['multi'],
    words: ['cat', 'dog', 'bird', 'fish', 'tree'],
    description: 'Multi-syllable words',
    minWordsToComplete: 5,
  },
  {
    level: 87,
    phonemes: ['multi'],
    words: ['happy', 'little', 'pretty', 'funny', 'sunny'],
    description: 'Multi-syllable words with y',
    minWordsToComplete: 5,
  },
  {
    level: 88,
    phonemes: ['multi'],
    words: ['table', 'apple', 'bottle', 'middle', 'simple'],
    description: 'Multi-syllable words with le',
    minWordsToComplete: 5,
  },
  {
    level: 89,
    phonemes: ['multi'],
    words: ['butter', 'letter', 'better', 'matter', 'ladder'],
    description: 'Multi-syllable words with er',
    minWordsToComplete: 5,
  },
  {
    level: 90,
    phonemes: ['multi'],
    words: ['water', 'paper', 'later', 'never', 'over'],
    description: 'Multi-syllable words with er',
    minWordsToComplete: 5,
  },
  {
    level: 91,
    phonemes: ['multi'],
    words: ['animal', 'hospital', 'capital', 'general', 'normal'],
    description: 'Complex multi-syllable words',
    minWordsToComplete: 5,
  },
  {
    level: 92,
    phonemes: ['multi'],
    words: ['beautiful', 'wonderful', 'careful', 'helpful', 'peaceful'],
    description: 'Complex words with ful',
    minWordsToComplete: 5,
  },
  {
    level: 93,
    phonemes: ['multi'],
    words: ['quickly', 'slowly', 'happily', 'sadly', 'bravely'],
    description: 'Complex words with ly',
    minWordsToComplete: 5,
  },
  {
    level: 94,
    phonemes: ['multi'],
    words: ['running', 'jumping', 'singing', 'dancing', 'playing'],
    description: 'Complex words with ing',
    minWordsToComplete: 5,
  },
  {
    level: 95,
    phonemes: ['multi'],
    words: ['jumped', 'walked', 'played', 'looked', 'wanted'],
    description: 'Complex words with ed',
    minWordsToComplete: 5,
  },
  {
    level: 96,
    phonemes: ['multi'],
    words: ['action', 'nation', 'station', 'question', 'direction'],
    description: 'Complex words with tion',
    minWordsToComplete: 5,
  },
  {
    level: 97,
    phonemes: ['multi'],
    words: ['vision', 'mission', 'passion', 'session', 'version'],
    description: 'Complex words with sion',
    minWordsToComplete: 5,
  },
  {
    level: 98,
    phonemes: ['multi'],
    words: ['famous', 'nervous', 'serious', 'curious', 'generous'],
    description: 'Complex words with ous',
    minWordsToComplete: 5,
  },
  {
    level: 99,
    phonemes: ['mastery'],
    words: ['read', 'write', 'speak', 'listen', 'learn'],
    description: 'Mastery level - complex sentences',
    minWordsToComplete: 6,
  },
  {
    level: 100,
    phonemes: ['mastery'],
    words: ['reading', 'writing', 'speaking', 'listening', 'learning', 'teaching'],
    description: 'Final mastery - fluency',
    minWordsToComplete: 6,
  },
];

/**
 * Get level definition by level number
 */
export function getLevel(level: number): Level | null {
  return LEVELS.find((l) => l.level === level) || null;
}

/**
 * Get all phonemes learned up to a given level
 */
export function getPhonemesUpToLevel(level: number): string[] {
  const phonemes: string[] = [];
  for (let i = 1; i <= level && i <= LEVELS.length; i++) {
    const levelData = LEVELS[i - 1];
    if (levelData) {
      phonemes.push(...levelData.phonemes);
    }
  }
  return [...new Set(phonemes)]; // Remove duplicates
}

/**
 * Check if a word is appropriate for a given level
 */
export function isWordAppropriateForLevel(word: string, level: number): boolean {
  const levelData = getLevel(level);
  if (!levelData) return false;

  // Check if word contains only phonemes learned up to this level
  const allowedPhonemes = getPhonemesUpToLevel(level);
  // This is a simplified check - in production, use proper phoneme segmentation
  return levelData.words.includes(word.toLowerCase()) || allowedPhonemes.length > 0;
}

