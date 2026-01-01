import { useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Animated, Dimensions } from 'react-native';

interface ConfettiCelebrationProps {
  visible: boolean;
  onComplete?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONFETTI_COUNT = 50;
const COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

export default function ConfettiCelebration({ visible, onComplete }: ConfettiCelebrationProps) {
  const confettiRefs = useRef<any[]>([]);
  const opacityRef = useRef(new Animated.Value(0));
  const isAnimatingRef = useRef(false);

  const runAnimation = useCallback(() => {
    if (!isAnimatingRef.current) return;

    // Reset and re-initialize confetti positions
    confettiRefs.current = Array.from({ length: CONFETTI_COUNT }, () => {
      const startX = Math.random() * SCREEN_WIDTH;
      return {
        translateY: new Animated.Value(-50),
        translateX: new Animated.Value(startX),
        rotation: new Animated.Value(0),
        scale: new Animated.Value(1),
        startX,
      };
    });

    // Animate each confetti piece
    const animations = confettiRefs.current.map((confetti, index) => {
      const duration = 2000 + Math.random() * 1000;
      const delay = index * 20;
      const endX = confetti.startX + (Math.random() - 0.5) * 200;

      return Animated.parallel([
        Animated.timing(confetti.translateY, {
          toValue: SCREEN_HEIGHT + 100,
          duration,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(confetti.translateX, {
          toValue: endX,
          duration,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(confetti.rotation, {
          toValue: Math.random() * 720 - 360,
          duration,
          delay,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(confetti.scale, {
            toValue: 1.2,
            duration: duration * 0.3,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(confetti.scale, {
            toValue: 0.8,
            duration: duration * 0.7,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    Animated.parallel(animations).start(() => {
      // Loop: run again if still visible
      if (isAnimatingRef.current) {
        runAnimation();
      }
    });
  }, []);

  useEffect(() => {
    if (visible) {
      isAnimatingRef.current = true;
      opacityRef.current.setValue(1);
      runAnimation();
    } else {
      isAnimatingRef.current = false;
      opacityRef.current.setValue(0);
    }

    return () => {
      isAnimatingRef.current = false;
    };
  }, [visible, runAnimation]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.container, { opacity: opacityRef.current }]}
      pointerEvents="none"
    >
      {confettiRefs.current.map((confetti, index) => {
        const color = COLORS[index % COLORS.length];
        const size = 8 + Math.random() * 8;

        return (
          <Animated.View
            key={index}
            style={[
              styles.confetti,
              {
                width: size,
                height: size,
                backgroundColor: color,
                transform: [
                  {
                    translateY: confetti.translateY,
                  },
                  {
                    translateX: confetti.translateX,
                  },
                  {
                    rotate: confetti.rotation.interpolate({
                      inputRange: [-360, 360],
                      outputRange: ['-360deg', '360deg'],
                    }),
                  },
                  {
                    scale: confetti.scale,
                  },
                ],
              },
            ]}
          />
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    overflow: 'hidden',
  },
  confetti: {
    position: 'absolute',
    borderRadius: 2,
  },
});

