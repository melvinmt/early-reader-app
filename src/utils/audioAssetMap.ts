/**
 * Audio Asset Map for Static DISTAR Card Audio Files
 * 
 * React Native requires static require() calls for bundled assets.
 * This maps audio asset paths to their require() statements.
 */

// Helper function to require audio with fallback
function requireAudio(path: string): any {
  try {
    return require(path);
  } catch (e) {
    console.warn(`Audio asset not found: ${path}`);
    return null;
  }
}

// Audio assets for cards
const AUDIO_ASSETS: Record<string, any> = {
  // Card 001-l
  'assets/en-US/001-l/audio.mp3': requireAudio('../../assets/en-US/001-l/audio.mp3'),
  'assets/en-US/001-l/prompt.mp3': requireAudio('../../assets/en-US/001-l/prompt.mp3'),
  'assets/en-US/001-l/great-job.mp3': requireAudio('../../assets/en-US/001-l/great-job.mp3'),
  'assets/en-US/001-l/try-again.mp3': requireAudio('../../assets/en-US/001-l/try-again.mp3'),
  'assets/en-US/001-l/no-input.mp3': requireAudio('../../assets/en-US/001-l/no-input.mp3'),
  
  // Card 002-i
  'assets/en-US/002-i/audio.mp3': requireAudio('../../assets/en-US/002-i/audio.mp3'),
  'assets/en-US/002-i/prompt.mp3': requireAudio('../../assets/en-US/002-i/prompt.mp3'),
  'assets/en-US/002-i/great-job.mp3': requireAudio('../../assets/en-US/002-i/great-job.mp3'),
  'assets/en-US/002-i/try-again.mp3': requireAudio('../../assets/en-US/002-i/try-again.mp3'),
  'assets/en-US/002-i/no-input.mp3': requireAudio('../../assets/en-US/002-i/no-input.mp3'),
  
  // Card 003-big
  'assets/en-US/003-big/audio.mp3': requireAudio('../../assets/en-US/003-big/audio.mp3'),
  'assets/en-US/003-big/audio-sounded.mp3': requireAudio('../../assets/en-US/003-big/audio-sounded.mp3'),
  'assets/en-US/003-big/prompt.mp3': requireAudio('../../assets/en-US/003-big/prompt.mp3'),
  'assets/en-US/003-big/great-job.mp3': requireAudio('../../assets/en-US/003-big/great-job.mp3'),
  'assets/en-US/003-big/try-again.mp3': requireAudio('../../assets/en-US/003-big/try-again.mp3'),
  'assets/en-US/003-big/no-input.mp3': requireAudio('../../assets/en-US/003-big/no-input.mp3'),
  
  // Card 004-brain
  'assets/en-US/004-brain/audio.mp3': requireAudio('../../assets/en-US/004-brain/audio.mp3'),
  'assets/en-US/004-brain/audio-sounded.mp3': requireAudio('../../assets/en-US/004-brain/audio-sounded.mp3'),
  'assets/en-US/004-brain/prompt.mp3': requireAudio('../../assets/en-US/004-brain/prompt.mp3'),
  'assets/en-US/004-brain/great-job.mp3': requireAudio('../../assets/en-US/004-brain/great-job.mp3'),
  'assets/en-US/004-brain/try-again.mp3': requireAudio('../../assets/en-US/004-brain/try-again.mp3'),
  'assets/en-US/004-brain/no-input.mp3': requireAudio('../../assets/en-US/004-brain/no-input.mp3'),
  
  // Card 005-she-is-my-best-friend
  'assets/en-US/005-she-is-my-best-friend/audio.mp3': requireAudio('../../assets/en-US/005-she-is-my-best-friend/audio.mp3'),
  'assets/en-US/005-she-is-my-best-friend/prompt.mp3': requireAudio('../../assets/en-US/005-she-is-my-best-friend/prompt.mp3'),
  'assets/en-US/005-she-is-my-best-friend/great-job.mp3': requireAudio('../../assets/en-US/005-she-is-my-best-friend/great-job.mp3'),
  'assets/en-US/005-she-is-my-best-friend/try-again.mp3': requireAudio('../../assets/en-US/005-she-is-my-best-friend/try-again.mp3'),
  'assets/en-US/005-she-is-my-best-friend/no-input.mp3': requireAudio('../../assets/en-US/005-she-is-my-best-friend/no-input.mp3'),
  
  // Card 006-we-like-to-run-and-play
  'assets/en-US/006-we-like-to-run-and-play/audio.mp3': requireAudio('../../assets/en-US/006-we-like-to-run-and-play/audio.mp3'),
  'assets/en-US/006-we-like-to-run-and-play/prompt.mp3': requireAudio('../../assets/en-US/006-we-like-to-run-and-play/prompt.mp3'),
  'assets/en-US/006-we-like-to-run-and-play/great-job.mp3': requireAudio('../../assets/en-US/006-we-like-to-run-and-play/great-job.mp3'),
  'assets/en-US/006-we-like-to-run-and-play/try-again.mp3': requireAudio('../../assets/en-US/006-we-like-to-run-and-play/try-again.mp3'),
  'assets/en-US/006-we-like-to-run-and-play/no-input.mp3': requireAudio('../../assets/en-US/006-we-like-to-run-and-play/no-input.mp3'),
};

/**
 * Get audio source for a given asset path
 * Returns a require() source for local assets, or { uri } for remote URLs
 */
export function getAudioSource(assetPath: string): any {
  // Check if it's a remote URL
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
    return { uri: assetPath };
  }
  
  // Check if we have this asset mapped
  const mappedAsset = AUDIO_ASSETS[assetPath];
  if (mappedAsset) {
    return mappedAsset;
  }
  
  // Fallback: try as URI (might work for some cases)
  console.warn(`Audio asset not found in map: ${assetPath}`);
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

