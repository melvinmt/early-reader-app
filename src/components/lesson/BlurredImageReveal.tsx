import { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Text } from 'react-native';

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
  const blurAnimation = useRef(new Animated.Value(20)).current; // Start with heavy blur
  const opacityAnimation = useRef(new Animated.Value(1)).current; // Question mark opacity

  useEffect(() => {
    if (isRevealed) {
      // Animate blur from 20 to 0
      Animated.parallel([
        Animated.timing(blurAnimation, {
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
      blurAnimation.setValue(20);
      opacityAnimation.setValue(1);
    }
  }, [isRevealed]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.imageContainer,
          {
            // Note: expo-blur would be better for actual blur, but for now we'll use opacity
            opacity: blurAnimation.interpolate({
              inputRange: [0, 20],
              outputRange: [1, 0.3],
            }),
          },
        ]}
      >
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
      </Animated.View>

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
});




