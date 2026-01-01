import { useEffect, useState, useRef } from 'react';
import { StyleSheet, Animated, Dimensions } from 'react-native';

interface ConfettiCelebrationProps {
  visible: boolean;
  onComplete?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONFETTI_COUNT = 50;
const COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

interface ConfettiPiece {
  id: number;
  translateY: Animated.Value;
  translateX: Animated.Value;
  rotation: Animated.Value;
  scale: Animated.Value;
  color: string;
  size: number;
  initialX: number; // Track initial X position (avoid accessing Animated._value)
}

function createConfettiPieces(): ConfettiPiece[] {
  return Array.from({ length: CONFETTI_COUNT }, (_, index) => {
    const initialX = Math.random() * SCREEN_WIDTH;
    return {
      id: index,
      translateY: new Animated.Value(-50 - Math.random() * 100),
      translateX: new Animated.Value(initialX),
      rotation: new Animated.Value(0),
      scale: new Animated.Value(0.8 + Math.random() * 0.4),
      color: COLORS[index % COLORS.length],
      size: 8 + Math.random() * 8,
      initialX,
    };
  });
}

export default function ConfettiCelebration({ visible }: ConfettiCelebrationProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const isAnimatingRef = useRef(false);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible) {
      // Create confetti immediately so it renders
      const pieces = createConfettiPieces();
      setConfetti(pieces);
      isAnimatingRef.current = true;

      // Start animation after a brief delay to ensure render
      const startAnimation = () => {
        if (!isAnimatingRef.current) return;

        const animations = pieces.map((piece) => {
          // Reset positions for loop - update initialX for each cycle
          const newInitialX = Math.random() * SCREEN_WIDTH;
          piece.initialX = newInitialX;
          piece.translateY.setValue(-50 - Math.random() * 100);
          piece.translateX.setValue(newInitialX);
          piece.rotation.setValue(0);

          const duration = 2500 + Math.random() * 1500;
          const endX = piece.initialX + (Math.random() - 0.5) * 200;

          return Animated.parallel([
            Animated.timing(piece.translateY, {
              toValue: SCREEN_HEIGHT + 100,
              duration,
              useNativeDriver: true,
            }),
            Animated.timing(piece.translateX, {
              toValue: endX,
              duration,
              useNativeDriver: true,
            }),
            Animated.timing(piece.rotation, {
              toValue: Math.random() * 720 - 360,
              duration,
              useNativeDriver: true,
            }),
          ]);
        });

        animationRef.current = Animated.parallel(animations);
        animationRef.current.start(() => {
          // Loop if still visible
          if (isAnimatingRef.current) {
            startAnimation();
          }
        });
      };

      // Small delay to ensure state update has rendered
      requestAnimationFrame(() => {
        startAnimation();
      });
    } else {
      isAnimatingRef.current = false;
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
      setConfetti([]);
    }

    return () => {
      isAnimatingRef.current = false;
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [visible]);

  if (!visible || confetti.length === 0) return null;

  return (
    <Animated.View style={styles.container} pointerEvents="none">
      {confetti.map((piece) => (
        <Animated.View
          key={piece.id}
          style={[
            styles.confetti,
            {
              width: piece.size,
              height: piece.size,
              backgroundColor: piece.color,
              transform: [
                { translateY: piece.translateY },
                { translateX: piece.translateX },
                {
                  rotate: piece.rotation.interpolate({
                    inputRange: [-360, 360],
                    outputRange: ['-360deg', '360deg'],
                  }),
                },
                { scale: piece.scale },
              ],
            },
          ]}
        />
      ))}
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
    top: 0,
    borderRadius: 2,
  },
});
