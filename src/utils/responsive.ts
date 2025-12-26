import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Device type detection
export const isTablet = () => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  // iPads have an aspect ratio closer to 1 (4:3 = 1.33)
  // iPhones have aspect ratio ~2.16 (19.5:9)
  return Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) >= 600 || aspectRatio < 1.6;
};

export const isLandscape = () => SCREEN_WIDTH > SCREEN_HEIGHT;

// Responsive scaling based on screen width
// Base width is iPhone 14 (390pt)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// Scale value based on screen width (for horizontal elements)
export const scale = (size: number): number => {
  const scaleFactor = SCREEN_WIDTH / BASE_WIDTH;
  // Limit scaling on tablets to prevent elements from getting too large
  const maxScale = isTablet() ? 1.5 : 2;
  return Math.round(PixelRatio.roundToNearestPixel(size * Math.min(scaleFactor, maxScale)));
};

// Scale value based on screen height (for vertical elements)
export const verticalScale = (size: number): number => {
  const scaleFactor = SCREEN_HEIGHT / BASE_HEIGHT;
  const maxScale = isTablet() ? 1.5 : 2;
  return Math.round(PixelRatio.roundToNearestPixel(size * Math.min(scaleFactor, maxScale)));
};

// Moderate scale - less aggressive scaling for fonts
export const moderateScale = (size: number, factor = 0.5): number => {
  return Math.round(size + (scale(size) - size) * factor);
};

// Get max content width for tablets (to prevent content from stretching too wide)
export const getMaxContentWidth = (): number => {
  if (isTablet()) {
    // On tablets, limit content width to ~600-700pt for readability
    return Math.min(SCREEN_WIDTH * 0.7, 700);
  }
  return SCREEN_WIDTH;
};

// Get responsive font size
export const responsiveFontSize = (baseSize: number): number => {
  if (isTablet()) {
    // Scale up fonts on tablet, but not too much
    return Math.round(baseSize * 1.3);
  }
  return baseSize;
};

// Get responsive padding/margin
export const responsiveSpacing = (baseSize: number): number => {
  if (isTablet()) {
    return Math.round(baseSize * 1.5);
  }
  return baseSize;
};

// Get touch target size (minimum 44pt on iOS, larger on tablets)
export const getTouchTargetSize = (): number => {
  return isTablet() ? 60 : 44;
};

// Get screen dimensions
export const getScreenDimensions = () => ({
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  isTablet: isTablet(),
  isLandscape: isLandscape(),
});

