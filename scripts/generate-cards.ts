/**
 * Pre-generate DISTAR Cards Script
 * 
 * Generates all ~780 cards (44 phonemes, ~590 words, ~107 sentences) with:
 * - AI-generated images (via Google Gemini 2.5 Flash Image / Nano Banana)
 * - ElevenLabs TTS audio (phonetic pronunciations, 0.7x speed for children)
 * - Static card data file for the app
 * 
 * Each card folder contains:
 * - image.png: 9:16 portrait image with colorful background and text
 * - prompt.mp3: Initial prompt ("Can you read this word?")
 * - try-again.mp3: Try again prompt with word repeated
 * - no-input.mp3: "I didn't hear anything" prompt (varied per card)
 * - great-job.mp3: Success prompt with word repeated (varied per card)
 * - audio.mp3: Main content audio (word/phoneme/sentence)
 * - audio-sounded.mp3: Sounded-out version (words only)
 * 
 * Usage: 
 *   Test mode (6 random cards - DEFAULT): npm run generate-cards
 *   Full generation (~780 cards):         npm run generate-cards:full
 * 
 * Environment variables required (.env):
 *   ELEVENLABS_API_KEY - ElevenLabs TTS API key
 *   GOOGLE_AI_API_KEY - Google Gemini API key
 *   ELEVENLABS_VOICE_ID - (optional) Voice ID for TTS
 *   LOCALE - (optional) Locale for assets, default: en-US
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as readline from 'readline';
import axios from 'axios';
import { DISTAR_PHONEMES } from '../src/data/distarPhonemes';

// Load environment variables from .env file
require('dotenv').config();

// Configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY || '';
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'cVd39cx0VtXNC13y5Y7z'; // Child-friendly voice

// i18n Configuration
const DEFAULT_LOCALE = 'en-US'; // Default language/country
const LOCALE = process.env.LOCALE || DEFAULT_LOCALE; // Can be overridden via env var

// Check for full mode (test mode is default)
const FULL_MODE = process.argv.includes('--full') || process.argv.includes('--all') || process.argv.includes('-f');
const TEST_MODE = !FULL_MODE; // Test mode is default
const TEST_CARDS_PER_CATEGORY = 4; // 4 per category = 12 total test cards (4 phonemes + 4 words + 4 sentences)

/**
 * Randomly select n items from an array (Fisher-Yates shuffle)
 */
function randomSelect<T>(array: T[], n: number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
}

// Global card counter for sequential numbering
let globalCardNumber = 0;

// Mapping of phoneme symbol to card ID (for cross-references in word/sentence cards)
const phonemeToCardId: Map<string, string> = new Map();

// Mapping of word to card ID (for cross-references in sentence cards)
const wordToCardId: Map<string, string> = new Map();

/**
 * Generate a card ID with a padded number prefix
 * Format: 001-cardname, 002-cardname, etc.
 */
function generateCardId(name: string): string {
  globalCardNumber++;
  const paddedNumber = String(globalCardNumber).padStart(3, '0');
  const sanitizedName = name.replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '-').toLowerCase();
  return `${paddedNumber}-${sanitizedName}`;
}

/**
 * Get phoneme audio path by phoneme symbol
 * Falls back to a generated path if phoneme card wasn't generated (e.g., in test mode)
 */
function getPhonemeAudioPath(phonemeSymbol: string): string {
  const cardId = phonemeToCardId.get(phonemeSymbol.toLowerCase());
  if (cardId) {
    return `assets/${LOCALE}/${cardId}/audio.mp3`;
  }
  // Fallback: use a placeholder path (phoneme card may not have been generated in test mode)
  const sanitized = phonemeSymbol.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return `assets/${LOCALE}/phoneme-${sanitized}/audio.mp3`;
}

/**
 * Get word audio path by word
 * Falls back to a generated path if word card wasn't generated (e.g., in test mode)
 */
function getWordAudioPath(word: string): string {
  const cardId = wordToCardId.get(word.toLowerCase());
  if (cardId) {
    return `assets/${LOCALE}/${cardId}/audio.mp3`;
  }
  // Fallback: use a placeholder path (word card may not have been generated in test mode)
  const sanitized = word.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return `assets/${LOCALE}/word-${sanitized}/audio.mp3`;
}

// Assets organized by locale (e.g., assets/en-US/...)
// Each card has its own folder: assets/en-US/card-id/
const ASSETS_DIR = path.join(__dirname, '..', 'assets', LOCALE);

// Ensure directories exist
function ensureDirectories() {
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }
}

// Ensure a card's directory exists
function ensureCardDirectory(cardId: string): string {
  const cardDir = path.join(ASSETS_DIR, cardId);
  if (!fs.existsSync(cardDir)) {
    fs.mkdirSync(cardDir, { recursive: true });
  }
  return cardDir;
}

/**
 * Generate image using Nano Banana (Gemini 2.5 Flash Image model)
 * Generates portrait 9:16 aspect ratio images with colorful backgrounds
 * The text (phoneme/word/sentence) will be prominently displayed in the image
 */
async function generateImage(prompt: string, outputPath: string, displayText?: string, label?: string): Promise<void> {
  try {
    // Enhanced prompt with 9:16 portrait aspect ratio and colorful background
    // Include the text prominently in the image if provided
    let fullPrompt = `${prompt}. Simple, child-friendly illustration, flat design style. Portrait orientation 9:16 aspect ratio, full screen. Vibrant, colorful, engaging background with lots of colors - no white or plain backgrounds. Bright, cheerful, and visually appealing.`;
    
    if (displayText) {
      fullPrompt += ` The text "${displayText}" must be prominently displayed in large, clear, child-friendly letters in the center of the image.`;
    }
    
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
      {
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }],
        generationConfig: {
          imageConfig: {
            aspectRatio: "9:16"  // Portrait orientation (768x1344 resolution)
          }
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GOOGLE_AI_API_KEY,
        },
      }
    );

    // Extract image from response
    const candidates = response.data?.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0]?.content?.parts;
      if (parts && parts.length > 0) {
        // Look for inlineData in the parts
        for (const part of parts) {
          if (part.inlineData?.data) {
            const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
            fs.writeFileSync(outputPath, imageBuffer);
            const labelText = label ? `[${label}] ` : '';
            console.log(`✓ ${labelText}Generated image: ${path.basename(outputPath)}`);
            return;
          }
        }
      }
    }
    
    throw new Error('No image data in response');
  } catch (error: any) {
    console.error(`✗ Failed to generate image for ${prompt}:`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    // Create placeholder if generation fails
    const placeholderPNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(outputPath, placeholderPNG);
  }
}

/**
 * Generate audio using ElevenLabs TTS API with Eleven v3 model
 * Uses emotion keywords for child-friendly, encouraging speech
 * Speed: 0.7 = 70% speed (slowed down for children learning to read)
 */
async function generateAudio(text: string, outputPath: string, emotion: 'happy' | 'excited' | 'neutral' = 'happy', label?: string): Promise<void> {
  try {
    // Add emotion keyword based on context
    // Eleven v3 supports emotion tags: [happy], [sad], [angry], [neutral]
    // Note: 'excited' maps to 'happy' for safety (excited not officially documented)
    const safeEmotion = emotion === 'excited' ? 'happy' : emotion;
    const emotionTag = `[${safeEmotion}]`;
    const textWithEmotion = `${emotionTag} ${text}`;
    
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        text: textWithEmotion,
        model_id: 'eleven_v3', // Eleven v3 model with emotion support
        speed: 0.7, // Slow down speech to 70% speed for children learning to read
        voice_settings: {
          stability: 0.5, // For v3: 0.0 = Creative, 0.5 = Natural, 1.0 = Robust (using Natural)
          similarity_boost: 0.75,
          style: 0.5,
        },
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        responseType: 'arraybuffer',
      }
    );

    // Write the audio buffer to file
    fs.writeFileSync(outputPath, Buffer.from(response.data));
    const labelText = label ? `[${label}] ` : '';
    console.log(`✓ ${labelText}Generated audio (0.7x speed, ${emotion}): ${path.basename(outputPath)}`);
  } catch (error: any) {
    console.error(`✗ Failed to generate audio for "${text}":`, error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data?.toString() || 'No data');
    }
    // Create empty file as placeholder
    fs.writeFileSync(outputPath, Buffer.alloc(0));
  }
}

/**
 * Segment a word into its phonemes based on DISTAR digraph patterns
 */
function segmentWordIntoPhonemes(word: string): string[] {
  const digraphs = ['th', 'sh', 'ch', 'wh', 'ar', 'er', 'oo', 'ea', 'ai', 'ou', 'qu', 'ng', 'ck'];
  const phonemes: string[] = [];
  let i = 0;
  
  while (i < word.length) {
    // Check for digraphs first (two-letter sounds)
    if (i < word.length - 1) {
      const twoChars = word.substring(i, i + 2).toLowerCase();
      if (digraphs.includes(twoChars)) {
        phonemes.push(twoChars);
        i += 2;
        continue;
      }
    }
    
    // Check for 'ing' trigraph
    if (i < word.length - 2 && word.substring(i, i + 3).toLowerCase() === 'ing') {
      phonemes.push('ing');
      i += 3;
      continue;
    }
    
    // Single character
    const char = word[i].toLowerCase();
    // Skip silent 'e' at end of word (after consonant)
    if (char === 'e' && i === word.length - 1 && phonemes.length > 0) {
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
 * Generate a contextual prompt for the child based on card type
 */
function getCardPrompt(type: 'letter' | 'digraph' | 'word' | 'sentence'): string {
  const prompts = {
    'letter': 'What sound does this letter make?',
    'digraph': 'What sound do these letters make together?',
    'word': 'Can you read this word?',
    'sentence': 'Can you read this sentence?',
  };
  return prompts[type];
}

/**
 * Generate varied "great job" prompts that repeat the content affirmatively
 */
function getGreatJobPrompts(content: string, type: 'letter' | 'digraph' | 'word' | 'sentence'): string[] {
  const prompts: string[] = [];
  
  if (type === 'letter' || type === 'digraph') {
    prompts.push(
      `Great job! That's the sound ${content}.`,
      `Excellent! You said ${content} correctly.`,
      `Wonderful! The sound ${content} is right.`,
      `Perfect! You got ${content}.`,
      `Awesome! That's correct, ${content}.`,
      `Fantastic! You know ${content}.`,
      `Amazing! ${content} is correct.`,
      `Well done! The sound ${content} is right.`
    );
  } else if (type === 'word') {
    prompts.push(
      `Great job! That word is ${content}.`,
      `Excellent! You read ${content} correctly.`,
      `Wonderful! ${content} is right.`,
      `Perfect! You got ${content}.`,
      `Awesome! That's correct, ${content}.`,
      `Fantastic! You read ${content} perfectly.`,
      `Amazing! ${content} is the right word.`,
      `Well done! You pronounced ${content} correctly.`
    );
  } else { // sentence
    prompts.push(
      `Great job! You read: ${content}.`,
      `Excellent! That's correct: ${content}.`,
      `Wonderful! You said: ${content}.`,
      `Perfect! You read it right: ${content}.`,
      `Awesome! That's it: ${content}.`,
      `Fantastic! You got it: ${content}.`,
      `Amazing! Correct: ${content}.`,
      `Well done! You read: ${content}.`
    );
  }
  
  return prompts;
}

/**
 * Generate "try again" prompt that repeats the content
 */
function getTryAgainPrompt(content: string, type: 'letter' | 'digraph' | 'word' | 'sentence'): string {
  if (type === 'letter' || type === 'digraph') {
    return `Try again! Say the sound ${content}.`;
  } else if (type === 'word') {
    return `Try again! Say the word ${content}.`;
  } else { // sentence
    return `Try again! Read this: ${content}.`;
  }
}

/**
 * Generate varied "I didn't hear anything" prompts
 */
function getNoInputPrompts(): string[] {
  return [
    `I didn't hear anything. Try speaking again!`,
    `I couldn't hear you. Please try again!`,
    `I didn't catch that. Can you say it again?`,
    `I'm not hearing anything. Please speak up!`,
    `I didn't hear a sound. Try saying it again!`,
    `Nothing came through. Can you repeat that?`,
    `I didn't hear you. Give it another try!`,
    `I'm not picking up any sound. Try again!`,
    `I couldn't hear anything. Speak a bit louder!`,
    `I didn't catch that. Can you try once more?`,
  ];
}

/**
 * Generate all phoneme cards (44 total, or 2 in test mode)
 */
async function generatePhonemeCards(): Promise<any[]> {
  const cards: any[] = [];
  
  // In test mode, randomly select 2 phonemes; in full mode, generate all
  const phonemesToGenerate = TEST_MODE 
    ? randomSelect(DISTAR_PHONEMES, TEST_CARDS_PER_CATEGORY)
    : DISTAR_PHONEMES;
  
  for (const phoneme of phonemesToGenerate) {
    // Generate card ID with sequential number prefix
    const cardId = generateCardId(phoneme.symbol);
    
    // Store mapping for cross-references from word/sentence cards
    phonemeToCardId.set(phoneme.symbol.toLowerCase(), cardId);
    
    const cardLabel = `phoneme:${phoneme.symbol}`;
    console.log(`  Generating ${cardLabel} (${cardId})...`);
    
    const cardDir = ensureCardDirectory(cardId);
    const imagePath = path.join(cardDir, 'image.png');
    const promptPath = path.join(cardDir, 'prompt.mp3');
    const tryAgainPath = path.join(cardDir, 'try-again.mp3');
    const audioPath = path.join(cardDir, 'audio.mp3');
    
    // Generate image (mnemonic for letter)
    // Use exampleWord for the illustration, NOT pronunciation (pronunciation is phonetic like "ooo" and shouldn't appear in images)
    const imagePrompt = phoneme.exampleWord
      ? `Simple illustration of ${phoneme.exampleWord} for the ${phoneme.isDigraph ? 'sound' : 'letter'} "${phoneme.symbol}"`
      : `Simple illustration representing the ${phoneme.isDigraph ? 'sound' : 'letter'} "${phoneme.symbol}"`;
    
    // Include the phoneme symbol in the image (the actual letter/symbol, not the pronunciation)
    await generateImage(imagePrompt, imagePath, phoneme.symbol, cardLabel);
    
    // Generate prompt audio - encouraging and not giving away the answer
    const cardType = phoneme.isDigraph ? 'digraph' : 'letter';
    const promptText = getCardPrompt(cardType);
    await generateAudio(promptText, promptPath, 'happy', cardLabel);
    
    // Generate try again prompt - repeats the phoneme
    const tryAgainText = getTryAgainPrompt(phoneme.pronunciation, cardType);
    await generateAudio(tryAgainText, tryAgainPath, 'happy', cardLabel);
    
    // Generate one varied "I didn't hear anything" prompt (different variation per card)
    const noInputPrompts = getNoInputPrompts();
    const noInputIndex = cards.length % noInputPrompts.length; // Cycle through variations
    const noInputText = noInputPrompts[noInputIndex];
    const noInputPath = path.join(cardDir, 'no-input.mp3');
    await generateAudio(noInputText, noInputPath, 'neutral', cardLabel);
    
    // Generate audio (phonetic pronunciation) - use 'neutral' for clear phoneme pronunciation
    await generateAudio(phoneme.pronunciation, audioPath, 'neutral', cardLabel);
    
    // Generate one varied "great job" prompt with the phoneme repeated (different variation per card)
    const greatJobPrompts = getGreatJobPrompts(phoneme.pronunciation, cardType);
    const greatJobIndex = cards.length % greatJobPrompts.length; // Cycle through variations
    const greatJobText = greatJobPrompts[greatJobIndex];
    const greatJobPath = path.join(cardDir, 'great-job.mp3');
    await generateAudio(greatJobText, greatJobPath, 'excited', cardLabel);
    
    // Determine orthography
    // phoneme.symbol already contains the macron character if hasMacron is true (e.g., "ā", "ē", "ō")
    const display = phoneme.symbol;
    const balls = phoneme.type === 'voiced' && !phoneme.isDigraph ? [0] : [];
    const arrows = phoneme.type === 'whispered' && !phoneme.isDigraph ? [0] : [];
    
    cards.push({
      id: cardId,
      type: phoneme.isDigraph ? 'digraph' : 'letter',
      display,
      plainText: phoneme.symbol,
      phonemes: [phoneme.symbol],
      phonemeAudioPaths: [`assets/${LOCALE}/${cardId}/audio.mp3`],
      lesson: phoneme.lesson,
      imagePath: `assets/${LOCALE}/${cardId}/image.png`,
      promptPath: `assets/${LOCALE}/${cardId}/prompt.mp3`,
      tryAgainPath: `assets/${LOCALE}/${cardId}/try-again.mp3`,
      noInputPath: `assets/${LOCALE}/${cardId}/no-input.mp3`,
      greatJobPath: `assets/${LOCALE}/${cardId}/great-job.mp3`,
      audioPath: `assets/${LOCALE}/${cardId}/audio.mp3`,
      orthography: {
        macrons: phoneme.hasMacron ? [0] : [],
        small: [],
        balls,
        arrows,
      },
    });
  }
  
  return cards;
}

/**
 * Generate word cards (400 total, or 2 in test mode)
 * Complete DISTAR word list organized by lesson progression
 */
async function generateWordCards(): Promise<any[]> {
  const cards: any[] = [];
  
  // Full DISTAR word list organized by lesson range
  // Based on "Teach Your Child to Read in 100 Easy Lessons" progression
  // Words use only phonemes introduced up to that lesson
  const wordLists: { [lessonRange: string]: string[] } = {
    // Lessons 1-10: m, s, a, ē, t, r (first sounds)
    '1-10': [
      'am', 'me', 'eat', 'ate', 'at', 'sat', 'mat', 'rat', 'sea', 'see',
      'seat', 'meat', 'meet', 'seem', 'seam', 'team', 'ream', 'steam', 'stream', 'treat'
    ],
    // Lessons 11-20: d, i, th, c (adding more consonants)
    '11-20': [
      'glad', 'dad', 'lad', 'did', 'sit', 'mit', 'rim', 'dim', 'sir', 'stir',
      'this', 'that', 'them', 'cat', 'cast', 'mist', 'dist', 'scat', 'scan', 'trim'
    ],
    // Lessons 21-30: o, n, f, u, l (vowels and consonants)
    '21-30': [
      'on', 'not', 'tot', 'dot', 'cot', 'con', 'non', 'ton', 'son', 'fan',
      'tan', 'ran', 'man', 'can', 'tin', 'fin', 'fun', 'run', 'sun', 'nun',
      'nut', 'but', 'put', 'lot', 'let', 'lit', 'fit', 'fat', 'flat', 'flit'
    ],
    // Lessons 31-40: w, g, sh, ā, h (more sounds)
    '31-40': [
      'win', 'wit', 'wet', 'wed', 'wag', 'wig', 'will', 'well', 'wall', 'gum',
      'run', 'got', 'get', 'gut', 'tag', 'tug', 'rug', 'mug', 'dug', 'hug',
      'wish', 'fish', 'dish', 'shut', 'spot', 'shin', 'ship', 'shop', 'has', 'had',
      'him', 'his', 'hot', 'hat', 'hut', 'late', 'date', 'gate', 'rate', 'bake'
    ],
    // Lessons 41-50: k, ō, v, p, ar (more consonants and long o)
    '41-50': [
      'kid', 'kit', 'kite', 'kick', 'kept', 'king', 'kind', 'over', 'go', 'no',
      'so', 'vote', 'dove', 'love', 'gave', 'give', 'have', 'live', 'save', 'wave',
      'pat', 'pet', 'pit', 'pot', 'put', 'cap', 'cup', 'cop', 'map', 'mop',
      'car', 'far', 'tar', 'star', 'bar', 'jar', 'are', 'arm', 'art', 'cart'
    ],
    // Lessons 51-60: ch, e, b, ing, ī (digraphs and long i)
    '51-60': [
      'chop', 'chip', 'chin', 'chat', 'chess', 'chest', 'chick', 'check', 'rich', 'much',
      'such', 'each', 'teach', 'reach', 'bed', 'pet', 'beg', 'bell', 'best', 'bent',
      'bib', 'big', 'bug', 'bus', 'but', 'pad', 'bag', 'bat', 'back', 'ball',
      'sing', 'ring', 'king', 'wing', 'thing', 'bring', 'string', 'spring', 'swing', 'cling',
      'ice', 'nice', 'rice', 'mice', 'dice', 'like', 'bike', 'hike', 'time', 'dime'
    ],
    // Lessons 61-70: y, er, oo, j, wh (more digraphs)
    '61-70': [
      'yes', 'yet', 'yell', 'yam', 'yarn', 'yard', 'year', 'yeast', 'yellow', 'yonder',
      'her', 'fern', 'herd', 'term', 'verb', 'ever', 'never', 'over', 'under', 'after',
      'sister', 'mister', 'winter', 'better', 'letter', 'butter', 'mother', 'father', 'brother', 'other',
      'moon', 'soon', 'noon', 'room', 'boom', 'zoom', 'broom', 'groom', 'bloom', 'room',
      'food', 'mood', 'cool', 'pool', 'tool', 'wool', 'drool', 'school', 'stool', 'spool',
      'jam', 'jet', 'job', 'jog', 'jug', 'just', 'jump', 'jest', 'join', 'joke',
      'when', 'what', 'where', 'which', 'while', 'white', 'whale', 'wheat', 'wheel', 'whim'
    ],
    // Lessons 71-80: ȳ, ū, qu, x, z (final consonants and long vowels)
    '71-80': [
      'my', 'by', 'cry', 'dry', 'fly', 'fry', 'pry', 'sky', 'sly', 'why',
      'try', 'shy', 'thy', 'sty', 'guy', 'buy', 'dye', 'eye', 'rye', 'pie',
      'use', 'fuse', 'muse', 'lose', 'cute', 'mute', 'flute', 'route', 'prune', 'tune',
      'dune', 'June', 'rule', 'mule', 'cure', 'pure', 'duke', 'Luke', 'huge', 'fume',
      'quick', 'quip', 'quiz', 'queen', 'quest', 'quiet', 'quilt', 'quote', 'quack', 'quake',
      'ox', 'ax', 'box', 'fox', 'mix', 'fix', 'six', 'wax', 'tax', 'max',
      'next', 'text', 'flex', 'lex', 'vex', 'rex', 'index', 'apex', 'latex', 'annex',
      'zip', 'zap', 'zoo', 'zone', 'zero', 'zest', 'zinc', 'zoom', 'fizz', 'buzz',
      'fuzz', 'jazz', 'quiz', 'maze', 'haze', 'gaze', 'daze', 'laze', 'blaze', 'craze'
    ],
    // Lessons 81-90: ea, ai, ou (vowel digraphs)
    '81-90': [
      'eat', 'beat', 'heat', 'meat', 'neat', 'seat', 'bead', 'read', 'head', 'lead',
      'bread', 'spread', 'thread', 'tread', 'ahead', 'mean', 'bean', 'lean', 'dean', 'wean',
      'clean', 'dream', 'cream', 'stream', 'scream', 'gleam', 'team', 'seam', 'beam', 'ream',
      'rain', 'gain', 'main', 'chain', 'brain', 'train', 'grain', 'plain', 'Spain', 'stain',
      'tail', 'rail', 'sail', 'mail', 'nail', 'pail', 'hail', 'bail', 'trail', 'snail',
      'wait', 'bait', 'gait', 'saint', 'paint', 'faint', 'taint', 'quaint', 'plaint', 'strait',
      'out', 'our', 'hour', 'four', 'flour', 'loud', 'cloud', 'proud', 'round', 'sound',
      'found', 'ground', 'bound', 'hound', 'mound', 'pound', 'round', 'count', 'mount', 'shout'
    ],
    // Lessons 91-100: Review and complex words (all phonemes)
    '91-100': [
      'about', 'after', 'again', 'also', 'always', 'another', 'around', 'away', 'because', 'before',
      'being', 'between', 'both', 'bring', 'called', 'came', 'children', 'come', 'could', 'different',
      'does', 'down', 'each', 'even', 'every', 'find', 'first', 'follow', 'from', 'give',
      'going', 'good', 'great', 'hand', 'help', 'here', 'high', 'home', 'house', 'into',
      'just', 'keep', 'kind', 'know', 'large', 'last', 'leave', 'left', 'life', 'light',
      'little', 'long', 'look', 'made', 'make', 'many', 'might', 'more', 'most', 'move',
      'much', 'must', 'name', 'need', 'never', 'new', 'night', 'number', 'off', 'often',
      'old', 'only', 'open', 'order', 'other', 'part', 'people', 'place', 'play', 'point',
      'read', 'right', 'same', 'school', 'seem', 'sentence', 'should', 'show', 'side', 'small',
      'some', 'something', 'sometimes', 'sound', 'spell', 'start', 'still', 'stop', 'story', 'study',
      'such', 'take', 'tell', 'than', 'that', 'their', 'them', 'then', 'there', 'these',
      'they', 'thing', 'think', 'this', 'those', 'thought', 'three', 'through', 'time', 'together',
      'too', 'turn', 'under', 'until', 'upon', 'very', 'want', 'water', 'way', 'well',
      'were', 'what', 'when', 'where', 'which', 'while', 'who', 'why', 'will', 'with',
      'without', 'word', 'work', 'world', 'would', 'write', 'year', 'young', 'your', 'yourself'
    ],
  };
  
  let cardIndex = 45; // Start after phonemes (44) + 1
  let wordsGenerated = 0;
  
  // In test mode, randomly select 2 words from across all lesson ranges
  if (TEST_MODE) {
    // Flatten all words with their lesson info
    const allWordsWithLessons: { word: string; lesson: number }[] = [];
    for (const [lessonRange, words] of Object.entries(wordLists)) {
      const [startLesson, endLesson] = lessonRange.split('-').map(Number);
      const lesson = Math.floor((startLesson + endLesson) / 2);
      words.forEach(word => allWordsWithLessons.push({ word, lesson }));
    }
    
    // Randomly select words
    const selectedWords = randomSelect(allWordsWithLessons, TEST_CARDS_PER_CATEGORY);
    
    for (const { word, lesson } of selectedWords) {
      const phonemes = segmentWordIntoPhonemes(word);
      // Generate card ID with sequential number prefix
      const cardId = generateCardId(word);
      
      // Store mapping for cross-references from sentence cards
      wordToCardId.set(word.toLowerCase(), cardId);
      
      const cardLabel = `word:${word}`;
      console.log(`  Generating ${cardLabel} (${cardId})...`);
      
      const cardDir = ensureCardDirectory(cardId);
      
      const imagePath = path.join(cardDir, 'image.png');
      const promptPath = path.join(cardDir, 'prompt.mp3');
      const tryAgainPath = path.join(cardDir, 'try-again.mp3');
      const audioPath = path.join(cardDir, 'audio.mp3');
      const soundedOutPath = path.join(cardDir, 'audio-sounded.mp3');
      
      // Generate image with the word text displayed
      await generateImage(`Illustration of ${word}`, imagePath, word, cardLabel);
      
      // Generate prompt audio - encouraging and not giving away the answer
      const promptText = getCardPrompt('word');
      await generateAudio(promptText, promptPath, 'happy', cardLabel);
      
      // Generate try again prompt - repeats the word
      const tryAgainText = getTryAgainPrompt(word, 'word');
      await generateAudio(tryAgainText, tryAgainPath, 'happy', cardLabel);
      
      // Generate one varied "I didn't hear anything" prompt (different variation per card)
      const noInputPrompts = getNoInputPrompts();
      const noInputIndex = cards.length % noInputPrompts.length; // Cycle through variations
      const noInputText = noInputPrompts[noInputIndex];
      const noInputPath = path.join(cardDir, 'no-input.mp3');
      await generateAudio(noInputText, noInputPath, 'neutral', cardLabel);
      
      // Generate one varied "great job" prompt with the word repeated (different variation per card)
      const greatJobPrompts = getGreatJobPrompts(word, 'word');
      const greatJobIndex = cards.length % greatJobPrompts.length; // Cycle through variations
      const greatJobText = greatJobPrompts[greatJobIndex];
      const greatJobPath = path.join(cardDir, 'great-job.mp3');
      await generateAudio(greatJobText, greatJobPath, 'excited', cardLabel);
      
      // Generate full word audio - use 'happy' for encouraging learning
      await generateAudio(word, audioPath, 'happy', cardLabel);
      
      // Generate sounded-out audio - use 'neutral' for clear pronunciation
      const soundedOut = phonemes.map(p => {
        const phoneme = DISTAR_PHONEMES.find(ph => ph.symbol === p);
        return phoneme?.pronunciation || p;
      }).join('-');
      await generateAudio(soundedOut, soundedOutPath, 'neutral', cardLabel);
      
      // Generate phoneme audio paths - reference phoneme card audio files
      const phonemeAudioPaths = phonemes.map(p => getPhonemeAudioPath(p));
      
      cards.push({
        id: cardId,
        type: 'word',
        display: word,
        plainText: word,
        phonemes,
        phonemeAudioPaths,
        lesson,
        imagePath: `assets/${LOCALE}/${cardId}/image.png`,
        promptPath: `assets/${LOCALE}/${cardId}/prompt.mp3`,
        tryAgainPath: `assets/${LOCALE}/${cardId}/try-again.mp3`,
        noInputPath: `assets/${LOCALE}/${cardId}/no-input.mp3`,
        greatJobPath: `assets/${LOCALE}/${cardId}/great-job.mp3`,
        audioPath: `assets/${LOCALE}/${cardId}/audio.mp3`,
        soundedOutPath: `assets/${LOCALE}/${cardId}/audio-sounded.mp3`,
        orthography: {
          macrons: [],
          small: [],
          balls: [],
          arrows: [],
        },
      });
      
      wordsGenerated++;
      if (wordsGenerated >= TEST_CARDS_PER_CATEGORY) break;
    }
    
    return cards;
  }
  
  // Full generation mode
  for (const [lessonRange, words] of Object.entries(wordLists)) {
    const [startLesson, endLesson] = lessonRange.split('-').map(Number);
    
    for (const word of words) {
      const lesson = Math.floor((startLesson + endLesson) / 2);
      
      const phonemes = segmentWordIntoPhonemes(word);
      // Generate card ID with sequential number prefix
      const cardId = generateCardId(word);
      
      // Store mapping for cross-references from sentence cards
      wordToCardId.set(word.toLowerCase(), cardId);
      
      const cardLabel = `word:${word}`;
      console.log(`  Generating ${cardLabel} (${cardId})...`);
      
      const cardDir = ensureCardDirectory(cardId);
      
      const imagePath = path.join(cardDir, 'image.png');
      const promptPath = path.join(cardDir, 'prompt.mp3');
      const tryAgainPath = path.join(cardDir, 'try-again.mp3');
      const audioPath = path.join(cardDir, 'audio.mp3');
      const soundedOutPath = path.join(cardDir, 'audio-sounded.mp3');
      
      // Generate image with the word text displayed
      await generateImage(`Illustration of ${word}`, imagePath, word, cardLabel);
      
      // Generate prompt audio - encouraging and not giving away the answer
      const promptText = getCardPrompt('word');
      await generateAudio(promptText, promptPath, 'happy', cardLabel);
      
      // Generate try again prompt - repeats the word
      const tryAgainText = getTryAgainPrompt(word, 'word');
      await generateAudio(tryAgainText, tryAgainPath, 'happy', cardLabel);
      
      // Generate one varied "I didn't hear anything" prompt (different variation per card)
      const noInputPrompts = getNoInputPrompts();
      const noInputIndex = cards.length % noInputPrompts.length; // Cycle through variations
      const noInputText = noInputPrompts[noInputIndex];
      const noInputPath = path.join(cardDir, 'no-input.mp3');
      await generateAudio(noInputText, noInputPath, 'neutral', cardLabel);
      
      // Generate one varied "great job" prompt with the word repeated (different variation per card)
      const greatJobPrompts = getGreatJobPrompts(word, 'word');
      const greatJobIndex = cards.length % greatJobPrompts.length; // Cycle through variations
      const greatJobText = greatJobPrompts[greatJobIndex];
      const greatJobPath = path.join(cardDir, 'great-job.mp3');
      await generateAudio(greatJobText, greatJobPath, 'excited', cardLabel);
      
      // Generate full word audio - use 'happy' for encouraging learning
      await generateAudio(word, audioPath, 'happy', cardLabel);
      
      // Generate sounded-out audio - use 'neutral' for clear pronunciation
      const soundedOut = phonemes.map(p => {
        const phoneme = DISTAR_PHONEMES.find(ph => ph.symbol === p);
        return phoneme?.pronunciation || p;
      }).join('-');
      await generateAudio(soundedOut, soundedOutPath, 'neutral', cardLabel);
      
      // Generate phoneme audio paths - reference phoneme card audio files
      const phonemeAudioPaths = phonemes.map(p => getPhonemeAudioPath(p));
      
      cards.push({
        id: cardId,
        type: 'word',
        display: word, // Would include macrons for long vowels
        plainText: word,
        phonemes,
        phonemeAudioPaths,
        lesson,
        imagePath: `assets/${LOCALE}/${cardId}/image.png`,
        promptPath: `assets/${LOCALE}/${cardId}/prompt.mp3`,
        tryAgainPath: `assets/${LOCALE}/${cardId}/try-again.mp3`,
        noInputPath: `assets/${LOCALE}/${cardId}/no-input.mp3`,
        greatJobPath: `assets/${LOCALE}/${cardId}/great-job.mp3`,
        audioPath: `assets/${LOCALE}/${cardId}/audio.mp3`,
        soundedOutPath: `assets/${LOCALE}/${cardId}/audio-sounded.mp3`,
        orthography: {
          macrons: [],
          small: [],
          balls: [],
          arrows: [],
        },
      });
      
      cardIndex++;
    }
  }
  
  return cards;
}

/**
 * Generate sentence cards (100 total, or 2 in test mode)
 */
async function generateSentenceCards(): Promise<any[]> {
  const cards: any[] = [];
  
  // Full DISTAR sentence list organized by lesson progression
  // Sentences use only words with phonemes introduced up to that lesson
  const sentences = [
    // Lessons 1-20: Simple CVC sentences with m, s, a, ē, t, r, d, i, th, c
    { text: 'I am Sam', lesson: 10 },
    { text: 'Sam sat', lesson: 12 },
    { text: 'see me', lesson: 14 },
    { text: 'the cat sat', lesson: 16 },
    { text: 'this is it', lesson: 18 },
    { text: 'sit and eat', lesson: 20 },
    
    // Lessons 21-30: Adding o, n, f, u, l
    { text: 'the fat cat sat', lesson: 22 },
    { text: 'run and fun', lesson: 24 },
    { text: 'I can fan', lesson: 26 },
    { text: 'the sun is hot', lesson: 28 },
    { text: 'a fun run', lesson: 30 },
    
    // Lessons 31-40: Adding w, g, sh, ā, h
    { text: 'I will win', lesson: 32 },
    { text: 'she got a hat', lesson: 34 },
    { text: 'the fish can swim', lesson: 36 },
    { text: 'he ate the cake', lesson: 38 },
    { text: 'I wish I had a dog', lesson: 40 },
    
    // Lessons 41-50: Adding k, ō, v, p, ar
    { text: 'the kid can kick', lesson: 42 },
    { text: 'I love to go far', lesson: 44 },
    { text: 'he gave me a cup', lesson: 46 },
    { text: 'the car is red', lesson: 48 },
    { text: 'I hope we can go', lesson: 50 },
    
    // Lessons 51-60: Adding ch, e, b, ing, ī
    { text: 'I like to sing', lesson: 52 },
    { text: 'the big bed is soft', lesson: 54 },
    { text: 'she is running fast', lesson: 56 },
    { text: 'the ice is nice', lesson: 58 },
    { text: 'I am bringing the ball', lesson: 60 },
    
    // Lessons 61-70: Adding y, er, oo, j, wh
    { text: 'my mother is here', lesson: 62 },
    { text: 'the moon is bright', lesson: 64 },
    { text: 'I like to jump', lesson: 66 },
    { text: 'when will we go', lesson: 68 },
    { text: 'the room is cool', lesson: 70 },
    
    // Lessons 71-80: Adding ȳ, ū, qu, x, z
    { text: 'I can fly in the sky', lesson: 72 },
    { text: 'the cute dog is mine', lesson: 74 },
    { text: 'the queen is quick', lesson: 76 },
    { text: 'the fox is in the box', lesson: 78 },
    { text: 'the zoo has a zebra', lesson: 80 },
    
    // Lessons 81-90: Adding ea, ai, ou (vowel digraphs)
    { text: 'I eat meat and bread', lesson: 82 },
    { text: 'the rain came down', lesson: 84 },
    { text: 'I found a round ball', lesson: 86 },
    { text: 'the train is loud', lesson: 88 },
    { text: 'we dream of the sea', lesson: 90 },
    
    // Lessons 91-100: Complex sentences (all phonemes)
    { text: 'I like to read books', lesson: 91 },
    { text: 'she went to school today', lesson: 92 },
    { text: 'the children are playing outside', lesson: 93 },
    { text: 'we will learn something new', lesson: 94 },
    { text: 'he thought about his friend', lesson: 95 },
    { text: 'they are going to the store', lesson: 96 },
    { text: 'I would like to help you', lesson: 97 },
    { text: 'the world is a beautiful place', lesson: 98 },
    { text: 'we should always be kind', lesson: 99 },
    { text: 'I am proud of myself', lesson: 100 },
    
    // Additional sentences for variety (grouped by lesson range)
    { text: 'see the cat', lesson: 15 },
    { text: 'I am glad', lesson: 18 },
    { text: 'the rat ran', lesson: 20 },
    { text: 'not on the dot', lesson: 25 },
    { text: 'the man ran to the van', lesson: 28 },
    { text: 'the dog got wet', lesson: 35 },
    { text: 'we had a good time', lesson: 42 },
    { text: 'the shop is shut', lesson: 38 },
    { text: 'I gave him a gift', lesson: 48 },
    { text: 'the rich king is nice', lesson: 55 },
    { text: 'the big bug is red', lesson: 58 },
    { text: 'I am reading a good book', lesson: 65 },
    { text: 'the moon is in the sky', lesson: 72 },
    { text: 'I am happy to be here', lesson: 78 },
    { text: 'the team will win the game', lesson: 85 },
    { text: 'I found the sound of music', lesson: 88 },
    { text: 'she is the best teacher', lesson: 92 },
    { text: 'we are learning to read well', lesson: 95 },
    { text: 'reading is fun for everyone', lesson: 98 },
    { text: 'I love to learn new things', lesson: 100 },
    
    // More sentences for full coverage
    { text: 'the mat is flat', lesson: 20 },
    { text: 'can you see the tree', lesson: 25 },
    { text: 'the sun is up', lesson: 30 },
    { text: 'I will get the ball', lesson: 35 },
    { text: 'she has a red hat', lesson: 40 },
    { text: 'we like to run and play', lesson: 45 },
    { text: 'the car went very fast', lesson: 50 },
    { text: 'I can sing a song', lesson: 55 },
    { text: 'the bird is in the tree', lesson: 60 },
    { text: 'we went to the park', lesson: 65 },
    { text: 'the book is on the shelf', lesson: 70 },
    { text: 'I will try my best', lesson: 75 },
    { text: 'the sun is shining bright', lesson: 80 },
    { text: 'we had a great day', lesson: 85 },
    { text: 'I can count to ten', lesson: 90 },
    { text: 'she is my best friend', lesson: 95 },
    { text: 'we are all different', lesson: 100 },
  ];
  
  let cardIndex = 451; // Start after phonemes + words
  
  // In test mode, randomly select 2 sentences; in full mode, generate all
  const sentencesToGenerate = TEST_MODE 
    ? randomSelect(sentences, TEST_CARDS_PER_CATEGORY)
    : sentences;
  
  for (const sentence of sentencesToGenerate) {
    const words = sentence.text.split(' ');
    const phonemes = sentence.text.split('').filter(c => c !== ' ');
    // Generate card ID with sequential number prefix
    const cardId = generateCardId(sentence.text);
    
    const cardLabel = `sentence:"${sentence.text}"`;
    console.log(`  Generating ${cardLabel} (${cardId})...`);
    
    const cardDir = ensureCardDirectory(cardId);
    
    const imagePath = path.join(cardDir, 'image.png');
    const promptPath = path.join(cardDir, 'prompt.mp3');
    const tryAgainPath = path.join(cardDir, 'try-again.mp3');
    const audioPath = path.join(cardDir, 'audio.mp3');
    
    // Generate scene image with the sentence text displayed
    await generateImage(`Scene illustration: ${sentence.text}`, imagePath, sentence.text, cardLabel);
    
    // Generate prompt audio - encouraging and not giving away the answer
    const promptText = getCardPrompt('sentence');
    await generateAudio(promptText, promptPath, 'happy', cardLabel);
    
    // Generate try again prompt - repeats the sentence
    const tryAgainText = getTryAgainPrompt(sentence.text, 'sentence');
    await generateAudio(tryAgainText, tryAgainPath, 'happy', cardLabel);
    
    // Generate one varied "I didn't hear anything" prompt (different variation per card)
    const noInputPrompts = getNoInputPrompts();
    const noInputIndex = cards.length % noInputPrompts.length; // Cycle through variations
    const noInputText = noInputPrompts[noInputIndex];
    const noInputPath = path.join(cardDir, 'no-input.mp3');
    await generateAudio(noInputText, noInputPath, 'neutral', cardLabel);
    
    // Generate one varied "great job" prompt with the sentence repeated (different variation per card)
    const greatJobPrompts = getGreatJobPrompts(sentence.text, 'sentence');
    const greatJobIndex = cards.length % greatJobPrompts.length; // Cycle through variations
    const greatJobText = greatJobPrompts[greatJobIndex];
    const greatJobPath = path.join(cardDir, 'great-job.mp3');
    await generateAudio(greatJobText, greatJobPath, 'excited', cardLabel);
    
    // Generate full sentence audio - use 'happy' for encouraging sentences
    await generateAudio(sentence.text, audioPath, 'happy', cardLabel);
    
    // Generate word audio paths - reference word card audio files
    const wordAudioPaths = words.map(word => getWordAudioPath(word));
    
    // Generate phoneme audio paths - reference other card IDs
    const phonemeAudioPaths = phonemes.map(p => {
      const phonemeCardId = p.replace(/[^a-z0-9]/gi, '_');
      return `assets/${LOCALE}/${phonemeCardId}/audio.mp3`;
    });
    
    cards.push({
      id: cardId,
      type: 'sentence',
      display: sentence.text,
      plainText: sentence.text,
      phonemes,
      words,
      phonemeAudioPaths,
      wordAudioPaths,
      lesson: sentence.lesson,
      imagePath: `assets/${LOCALE}/${cardId}/image.png`,
      promptPath: `assets/${LOCALE}/${cardId}/prompt.mp3`,
      tryAgainPath: `assets/${LOCALE}/${cardId}/try-again.mp3`,
      noInputPath: `assets/${LOCALE}/${cardId}/no-input.mp3`,
      greatJobPath: `assets/${LOCALE}/${cardId}/great-job.mp3`,
      audioPath: `assets/${LOCALE}/${cardId}/audio.mp3`,
      orthography: {
        macrons: [],
        small: [],
        balls: [],
        arrows: [],
      },
    });
    
    cardIndex++;
  }
  
  return cards;
}

/**
 * Generate the static cards TypeScript file
 */
function generateCardsFile(cards: any[]): void {
  const cardsFile = path.join(__dirname, '..', 'src', 'data', `distarCards.${LOCALE}.ts`);
  
  const content = `/**
 * Pre-generated DISTAR Cards for locale: ${LOCALE}
 * 
 * This file contains all ${cards.length} pre-generated cards following the DISTAR methodology.
 * Generated by scripts/generate-cards.ts
 * 
 * DO NOT EDIT THIS FILE MANUALLY
 */

export interface DistarCard {
  id: string;
  type: 'letter' | 'digraph' | 'word' | 'sentence';
  display: string;
  plainText: string;
  phonemes: string[];
  words?: string[];
  phonemeAudioPaths: string[];
  wordAudioPaths?: string[];
  lesson: number;
  imagePath: string;
  promptPath: string;
  tryAgainPath: string;
  noInputPath: string;
  greatJobPath: string;
  audioPath: string;
  soundedOutPath?: string;
  orthography: {
    macrons: number[];
    small: number[];
    balls: number[];
    arrows: number[];
  };
}

export const DISTAR_CARDS: DistarCard[] = ${JSON.stringify(cards, null, 2)};

export const LOCALE = '${LOCALE}';

/**
 * Get card by ID
 */
export function getCardById(id: string): DistarCard | undefined {
  return DISTAR_CARDS.find(card => card.id === id);
}

/**
 * Get cards for a specific lesson
 */
export function getCardsForLesson(lesson: number): DistarCard[] {
  return DISTAR_CARDS.filter(card => card.lesson === lesson);
}

/**
 * Get all cards up to a lesson
 */
export function getCardsUpToLesson(lesson: number): DistarCard[] {
  return DISTAR_CARDS.filter(card => card.lesson <= lesson);
}

/**
 * Get cards by type
 */
export function getCardsByType(type: DistarCard['type']): DistarCard[] {
  return DISTAR_CARDS.filter(card => card.type === type);
}
`;
  
  fs.writeFileSync(cardsFile, content);
  console.log(`✓ Generated cards file: ${cardsFile}`);
  
  // Also generate asset mapping files for React Native
  generateAssetMappings(cards);
}

/**
 * Validate and clean up card paths to only include files that actually exist
 * Removes phonemeAudioPaths and wordAudioPaths that reference non-existent files
 */
function validateCardPaths(cards: any[]): void {
  const assetsDir = path.join(__dirname, '..', 'assets', LOCALE);
  
  cards.forEach(card => {
    // Validate direct file paths - remove if they don't exist
    const pathsToCheck: Array<keyof typeof card> = [
      'imagePath',
      'audioPath',
      'promptPath',
      'tryAgainPath',
      'noInputPath',
      'greatJobPath',
      'soundedOutPath',
    ];
    
    pathsToCheck.forEach(pathKey => {
      if (card[pathKey]) {
        const fullPath = path.join(assetsDir, card[pathKey].replace(`assets/${LOCALE}/`, ''));
        if (!fs.existsSync(fullPath)) {
          console.warn(`⚠️  Removing non-existent path from card ${card.id}: ${card[pathKey]}`);
          delete card[pathKey];
        }
      }
    });
    
    // Filter phonemeAudioPaths to only include files that exist
    if (card.phonemeAudioPaths && Array.isArray(card.phonemeAudioPaths)) {
      card.phonemeAudioPaths = card.phonemeAudioPaths.filter((audioPath: string) => {
        const fullPath = path.join(assetsDir, audioPath.replace(`assets/${LOCALE}/`, ''));
        const exists = fs.existsSync(fullPath);
        if (!exists) {
          console.warn(`⚠️  Removing non-existent phonemeAudioPath from card ${card.id}: ${audioPath}`);
        }
        return exists;
      });
      
      // Remove the array if it's empty
      if (card.phonemeAudioPaths.length === 0) {
        delete card.phonemeAudioPaths;
      }
    }
    
    // Filter wordAudioPaths to only include files that exist
    if (card.wordAudioPaths && Array.isArray(card.wordAudioPaths)) {
      card.wordAudioPaths = card.wordAudioPaths.filter((audioPath: string) => {
        const fullPath = path.join(assetsDir, audioPath.replace(`assets/${LOCALE}/`, ''));
        const exists = fs.existsSync(fullPath);
        if (!exists) {
          console.warn(`⚠️  Removing non-existent wordAudioPath from card ${card.id}: ${audioPath}`);
        }
        return exists;
      });
      
      // Remove the array if it's empty
      if (card.wordAudioPaths.length === 0) {
        delete card.wordAudioPaths;
      }
    }
  });
}

/**
 * Generate React Native asset mapping files (assetMap.ts and audioAssetMap.ts)
 * These are required because React Native/Metro bundler needs static require() calls
 * 
 * Scans the actual assets directory to find all existing files,
 * rather than relying on card data which may have stale references
 */
function generateAssetMappings(cards: any[]): void {
  const utilsDir = path.join(__dirname, '..', 'src', 'utils');
  const assetsDir = path.join(__dirname, '..', 'assets', LOCALE);
  
  // Collect all unique paths by scanning the actual directory
  const imagePaths = new Set<string>();
  const audioPaths = new Set<string>();
  
  if (!fs.existsSync(assetsDir)) {
    console.warn(`⚠️  Assets directory does not exist: ${assetsDir}`);
    return;
  }
  
  // Scan the assets directory recursively
  function scanDirectory(dir: string, relativePath: string = ''): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      // Skip hidden files
      if (entry.name.startsWith('.')) continue;
      
      const fullPath = path.join(dir, entry.name);
      const assetRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      const assetPath = `assets/${LOCALE}/${assetRelativePath}`;
      
      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        scanDirectory(fullPath, assetRelativePath);
      } else if (entry.isFile()) {
        // Check file extension to determine if it's an image or audio file
        const ext = path.extname(entry.name).toLowerCase();
        if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) {
          imagePaths.add(assetPath);
        } else if (['.mp3', '.wav', '.m4a', '.aac'].includes(ext)) {
          audioPaths.add(assetPath);
        }
      }
    }
  }
  
  // Scan the assets directory
  scanDirectory(assetsDir);
  
  console.log(`  Found ${imagePaths.size} image files`);
  console.log(`  Found ${audioPaths.size} audio files`);
  
  // Generate image asset map
  const imageMapFile = path.join(utilsDir, 'assetMap.ts');
  const imageMapContent = `/**
 * Asset Map for Static DISTAR Card Images
 * 
 * React Native requires static require() calls for bundled assets.
 * This maps asset paths to their require() statements.
 * 
 * Generated by scripts/generate-cards.ts
 * DO NOT EDIT THIS FILE MANUALLY
 */

// Image assets
const IMAGE_ASSETS: Record<string, any> = {
${Array.from(imagePaths).sort().map(imgPath => {
  // Convert path like "assets/en-US/001-l/image.png" to require path
  const requirePath = imgPath.replace(/^assets\//, '../../assets/');
  return `  '${imgPath}': require('${requirePath}'),`;
}).join('\n')}
};

/**
 * Get image source for a given asset path
 * Returns a require() source for local assets, or { uri } for remote URLs
 */
export function getImageSource(assetPath: string): any {
  // Check if it's a remote URL
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
    return { uri: assetPath };
  }
  
  // Check if we have this asset mapped
  const mappedAsset = IMAGE_ASSETS[assetPath];
  if (mappedAsset) {
    return mappedAsset;
  }
  
  // Fallback: try as URI (might work for some cases)
  console.warn(\`Asset not found in map: \${assetPath}\`);
  return { uri: assetPath };
}

/**
 * Check if an image asset exists
 */
export function hasImageAsset(assetPath: string): boolean {
  return assetPath in IMAGE_ASSETS || 
         assetPath.startsWith('http://') || 
         assetPath.startsWith('https://');
}
`;
  
  fs.writeFileSync(imageMapFile, imageMapContent);
  console.log(`✓ Generated image asset map: ${imageMapFile}`);
  
  // Generate audio asset map
  const audioMapFile = path.join(utilsDir, 'audioAssetMap.ts');
  const audioMapContent = `/**
 * Audio Asset Map for Static DISTAR Card Audio Files
 * 
 * React Native requires static require() calls for bundled assets.
 * This maps audio asset paths to their require() statements.
 * 
 * Generated by scripts/generate-cards.ts
 * DO NOT EDIT THIS FILE MANUALLY
 * 
 * NOTE: All require() statements must be static (no variables in the path)
 */

// Audio assets for cards - using static require() statements
const AUDIO_ASSETS: Record<string, any> = {
${Array.from(audioPaths).sort().map(audioPath => {
  // Convert path like "assets/en-US/001-l/audio.mp3" to require path
  const requirePath = audioPath.replace(/^assets\//, '../../assets/');
  return `  '${audioPath}': require('${requirePath}'),`;
}).join('\n')}
};

/**
 * Get audio source for a given asset path
 * Returns a require() module for local assets, or { uri } for remote URLs
 */
export function getAudioSource(assetPath: string): any {
  // Check if it's a remote URL
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
    return { uri: assetPath };
  }
  
  // Check if we have this asset mapped
  const mappedAsset = AUDIO_ASSETS[assetPath];
  if (mappedAsset !== undefined) {
    return mappedAsset;
  }
  
  // Fallback: try as URI (might work for some cases)
  console.warn(\`Audio asset not found in map: \${assetPath}\`);
  return { uri: assetPath };
}

/**
 * Check if an audio asset exists
 */
export function hasAudioAsset(assetPath: string): boolean {
  return assetPath in AUDIO_ASSETS || 
         assetPath.startsWith('http://') || 
         assetPath.startsWith('https://');
}
`;
  
  fs.writeFileSync(audioMapFile, audioMapContent);
  console.log(`✓ Generated audio asset map: ${audioMapFile}`);
  console.log(`  - ${imagePaths.size} image assets mapped`);
  console.log(`  - ${audioPaths.size} audio assets mapped`);
}

/**
 * Main execution
 */
/**
 * Prompt user for confirmation before proceeding with cleanup
 */
function promptForConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      const normalizedAnswer = answer.trim().toLowerCase();
      resolve(normalizedAnswer === 'y' || normalizedAnswer === 'yes');
    });
  });
}

/**
 * Clean up existing card files and assets before generation
 * This ensures each run starts fresh
 */
function cleanupExistingCards(): void {
  console.log('🧹 Cleaning up existing cards and assets...\n');
  
  // Delete existing card data file
  const cardsFile = path.join(__dirname, '..', 'src', 'data', `distarCards.${LOCALE}.ts`);
  if (fs.existsSync(cardsFile)) {
    fs.unlinkSync(cardsFile);
    console.log(`  ✓ Deleted ${cardsFile}`);
  }
  
  // Delete existing asset mapping files
  const assetMapFile = path.join(__dirname, '..', 'src', 'utils', 'assetMap.ts');
  if (fs.existsSync(assetMapFile)) {
    fs.unlinkSync(assetMapFile);
    console.log(`  ✓ Deleted ${assetMapFile}`);
  }
  
  const audioAssetMapFile = path.join(__dirname, '..', 'src', 'utils', 'audioAssetMap.ts');
  if (fs.existsSync(audioAssetMapFile)) {
    fs.unlinkSync(audioAssetMapFile);
    console.log(`  ✓ Deleted ${audioAssetMapFile}`);
  }
  
  // Delete all existing card asset directories in assets/en-US/
  const localeAssetsDir = path.join(__dirname, '..', 'assets', LOCALE);
  if (fs.existsSync(localeAssetsDir)) {
    const entries = fs.readdirSync(localeAssetsDir, { withFileTypes: true });
    let deletedCount = 0;
    
    for (const entry of entries) {
      // Skip .DS_Store and other hidden files
      if (entry.name.startsWith('.')) continue;
      
      const entryPath = path.join(localeAssetsDir, entry.name);
      if (entry.isDirectory()) {
        fs.rmSync(entryPath, { recursive: true, force: true });
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`  ✓ Deleted ${deletedCount} existing card directories in assets/${LOCALE}/`);
    }
  }
  
  console.log('  ✅ Cleanup complete\n');
}

async function main() {
  console.log(`🌍 Locale: ${LOCALE}\n`);
  
  if (TEST_MODE) {
    console.log(`🧪 TEST MODE: Generating ${TEST_CARDS_PER_CATEGORY * 3} random cards (${TEST_CARDS_PER_CATEGORY} per category) for testing...\n`);
  } else {
    console.log('🚀 Starting DISTAR card generation (full mode)...\n');
  }
  
  if (!ELEVENLABS_API_KEY) {
    console.error('❌ ELEVENLABS_API_KEY not set in environment');
    process.exit(1);
  }
  
  if (!GOOGLE_AI_API_KEY) {
    console.error('❌ GOOGLE_AI_API_KEY not set in environment');
    process.exit(1);
  }
  
  // Prompt for confirmation before cleaning up existing cards and assets
  console.log('\n⚠️  WARNING: This will delete all existing cards and assets!');
  console.log('   - All existing card data files');
  console.log('   - All existing asset mapping files');
  console.log('   - All existing card asset directories in assets/');
  
  const confirmed = await promptForConfirmation('\n❓ Continue with cleanup? (y/n): ');
  
  if (!confirmed) {
    console.log('\n❌ Operation cancelled. No files were deleted.');
    process.exit(0);
  }
  
  console.log('');
  
  // Clean up existing cards and assets first
  cleanupExistingCards();
  
  ensureDirectories();
  
  // Reset global state for clean generation
  globalCardNumber = 0;
  phonemeToCardId.clear();
  wordToCardId.clear();
  
  if (TEST_MODE) {
    console.log(`📝 Generating ${TEST_CARDS_PER_CATEGORY} phoneme cards...`);
  } else {
    console.log('📝 Generating phoneme cards (44)...');
  }
  const phonemeCards = await generatePhonemeCards();
  console.log(`✓ Generated ${phonemeCards.length} phoneme cards\n`);
  
  if (TEST_MODE) {
    console.log(`📝 Generating ${TEST_CARDS_PER_CATEGORY} word cards...`);
  } else {
    console.log('📝 Generating word cards (400)...');
  }
  const wordCards = await generateWordCards();
  console.log(`✓ Generated ${wordCards.length} word cards\n`);
  
  if (TEST_MODE) {
    console.log(`📝 Generating ${TEST_CARDS_PER_CATEGORY} sentence cards...`);
  } else {
    console.log('📝 Generating sentence cards (100)...');
  }
  const sentenceCards = await generateSentenceCards();
  console.log(`✓ Generated ${sentenceCards.length} sentence cards\n`);
  
  const allCards = [...phonemeCards, ...wordCards, ...sentenceCards];
  
  console.log('🔍 Validating card paths against actual files...');
  validateCardPaths(allCards);
  
  console.log('📝 Generating cards TypeScript file...');
  generateCardsFile(allCards);
  
  if (TEST_MODE) {
    console.log(`\n✅ TEST MODE: Successfully generated ${allCards.length} test cards!`);
    console.log(`   - ${phonemeCards.length} phoneme/letter cards`);
    console.log(`   - ${wordCards.length} word cards`);
    console.log(`   - ${sentenceCards.length} sentence cards`);
    console.log(`\n💡 To generate all 550 cards, run with --full flag:`);
    console.log(`   npm run generate-cards:full`);
    console.log(`   or: npx ts-node scripts/generate-cards.ts --full`);
  } else {
    console.log(`\n✅ FULL MODE: Successfully generated ${allCards.length} cards!`);
    console.log(`   - ${phonemeCards.length} phoneme/letter cards`);
    console.log(`   - ${wordCards.length} word cards`);
    console.log(`   - ${sentenceCards.length} sentence cards`);
  }
  
  // Clear Metro cache and Watchman to ensure new assets are detected
  console.log('\n🧹 Clearing Metro cache and Watchman...');
  try {
    // Clear Watchman watches
    try {
      execSync('watchman shutdown-server 2>/dev/null', { stdio: 'pipe' });
      execSync('watchman watch-del-all 2>/dev/null', { stdio: 'pipe' });
      console.log('   ✓ Cleared Watchman');
    } catch (e) {
      // Watchman might not be installed or running, that's okay
    }
    
    // Clear Metro cache directories
    const projectRoot = path.resolve(__dirname, '..');
    const metroCacheDirs = [
      path.join(projectRoot, 'node_modules', '.cache'),
      path.join(projectRoot, '.metro'),
    ];
    
    let clearedCount = 0;
    for (const cacheDir of metroCacheDirs) {
      if (fs.existsSync(cacheDir)) {
        fs.rmSync(cacheDir, { recursive: true, force: true });
        clearedCount++;
      }
    }
    
    if (clearedCount > 0) {
      console.log(`   ✓ Cleared ${clearedCount} Metro cache directory/directories`);
    } else {
      console.log('   ✓ Metro cache directories not found (already clean)');
    }
    
    console.log('\n💡 Restart your Metro bundler with: npm run start:clear');
  } catch (error) {
    console.warn('   ⚠️  Cache clearing encountered an issue (you may need to manually clear cache)');
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main };

