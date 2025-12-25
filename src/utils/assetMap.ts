/**
 * Asset Map for Static DISTAR Card Images
 * 
 * React Native requires static require() calls for bundled assets.
 * This maps asset paths to their require() statements.
 */

// Image assets
const IMAGE_ASSETS: Record<string, any> = {
  'assets/en-US/001-l/image.png': require('../../assets/en-US/001-l/image.png'),
  'assets/en-US/002-i/image.png': require('../../assets/en-US/002-i/image.png'),
  'assets/en-US/003-big/image.png': require('../../assets/en-US/003-big/image.png'),
  'assets/en-US/004-brain/image.png': require('../../assets/en-US/004-brain/image.png'),
  'assets/en-US/005-she-is-my-best-friend/image.png': require('../../assets/en-US/005-she-is-my-best-friend/image.png'),
  'assets/en-US/006-we-like-to-run-and-play/image.png': require('../../assets/en-US/006-we-like-to-run-and-play/image.png'),
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
  console.warn(`Asset not found in map: ${assetPath}`);
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


