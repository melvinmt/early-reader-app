import { useEffect, useRef, useState } from 'react';
import { View, Image, StyleSheet, Animated, Text } from 'react-native';
import { BlurView } from 'expo-blur';

interface BlurredImageRevealProps {
  imageUri: string;
  isRevealed: boolean;
  onRevealComplete?: () => void;
}

export default function BlurredImageReveal({
  imageUri,
  isRevealed,
  onRevealComplete,
}: BlurredImageRevealProps) {
  const blurIntensity = useRef(new Animated.Value(50)).current; // Start with heavy blur (0-100)
  const opacityAnimation = useRef(new Animated.Value(1)).current; // Question mark opacity

  useEffect(() => {
    if (isRevealed) {
      // Animate blur from 50 to 0 (real Gaussian blur)
      Animated.parallel([
        Animated.timing(blurIntensity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false, // Blur doesn't support native driver
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
      // Reset to blurred state
      blurIntensity.setValue(50);
      opacityAnimation.setValue(1);
    }
  }, [isRevealed]);

  // Get current blur value for BlurView
  const [currentBlur, setCurrentBlur] = useState(50);

  useEffect(() => {
    const listenerId = blurIntensity.addListener(({ value }) => {
      setCurrentBlur(value);
    });

    return () => {
      blurIntensity.removeListener(listenerId);
    };
  }, [blurIntensity]);

  // Don't render if no image URI
  if (!imageUri) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Image loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
        
        {/* Real Gaussian blur overlay that animates */}
        {currentBlur > 0 && (
          <BlurView
            intensity={currentBlur}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        )}
      </View>

      {!isRevealed && (
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: opacityAnimation,
            },
          ]}
        >
          <Text style={styles.questionMark}>?</Text>
          <Text style={styles.hint}>Read the word to see the picture!</Text>
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
    backgroundColor: '#f0f0f0',
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
  },
});








