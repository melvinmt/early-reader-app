import { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, Animated, Text, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { getImageSource, hasImageAsset } from '@/utils/assetMap';

interface BlurredImageRevealProps {
  imageUri: string;
  isRevealed: boolean;
  isFullScreen?: boolean;
  onRevealComplete?: () => void;
}

export default function BlurredImageReveal({
  imageUri,
  isRevealed,
  isFullScreen = false,
  onRevealComplete,
}: BlurredImageRevealProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isLandscape = screenWidth > screenHeight;
  const blurIntensity = useRef(new Animated.Value(50)).current;
  const opacityAnimation = useRef(new Animated.Value(1)).current;
  const [currentBlur, setCurrentBlur] = useState(50);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (isRevealed) {
      Animated.parallel([
        Animated.timing(blurIntensity, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: false,
        }),
        Animated.timing(opacityAnimation, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onRevealComplete?.();
      });
    } else {
      blurIntensity.setValue(50);
      opacityAnimation.setValue(1);
    }
  }, [isRevealed]);

  useEffect(() => {
    const listenerId = blurIntensity.addListener(({ value }) => {
      setCurrentBlur(value);
    });

    return () => {
      blurIntensity.removeListener(listenerId);
    };
  }, [blurIntensity]);

  // Reset error state when imageUri changes
  useEffect(() => {
    setImageError(false);
  }, [imageUri]);

  // Get the image source (handles both local assets and URLs)
  const imageSource = imageUri ? getImageSource(imageUri) : null;
  const hasValidImage = imageUri && hasImageAsset(imageUri) && !imageError;

  // Dynamic styles based on current screen dimensions and orientation
  const dynamicStyles = {
    fullScreenContainer: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: screenWidth,
      height: screenHeight,
      zIndex: 0,
      // White background shows on sides in landscape mode
      backgroundColor: isLandscape ? '#ffffff' : '#000000',
    },
    fullScreenImageContainer: {
      width: screenWidth,
      height: screenHeight,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    fullScreenImage: {
      width: screenWidth,
      height: screenHeight,
    },
  };

  // In landscape, use 'contain' to show full image with white bars on sides
  // In portrait, use 'cover' to fill the screen
  const imageResizeMode = isLandscape && isFullScreen ? 'contain' : 'cover';

  // Show placeholder if no valid image
  if (!hasValidImage) {
    return (
      <View style={[styles.container, isFullScreen && dynamicStyles.fullScreenContainer]}>
        <View style={[styles.placeholder, isFullScreen && styles.fullScreenPlaceholder]}>
          <Text style={styles.placeholderEmoji}>🎨</Text>
          <Text style={styles.placeholderText}>
            {imageError ? 'Image not available' : 'Loading image...'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isFullScreen && dynamicStyles.fullScreenContainer]}>
      <View style={[styles.imageContainer, isFullScreen && dynamicStyles.fullScreenImageContainer]}>
        <Image
          source={imageSource}
          style={[styles.image, isFullScreen && dynamicStyles.fullScreenImage]}
          resizeMode={imageResizeMode}
          onError={() => setImageError(true)}
        />

        {/* Blur overlay that animates */}
        {currentBlur > 0 && (
          <BlurView
            intensity={currentBlur}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        )}
      </View>

      {!isRevealed && !isFullScreen && (
        <Animated.View
          style={[
            styles.overlay,
            { opacity: opacityAnimation },
          ]}
        >
          <Text style={styles.questionMark}>?</Text>
          <Text style={styles.hint}>Swipe to reveal!</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 300,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  questionMark: {
    fontSize: 80,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 16,
  },
  hint: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8e8e8',
    borderRadius: 16,
  },
  fullScreenPlaceholder: {
    borderRadius: 0,
    backgroundColor: '#2a2a2a',
  },
  placeholderEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 16,
    color: '#888',
  },
});
