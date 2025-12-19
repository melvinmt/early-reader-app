import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

interface ConfettiCelebrationProps {
  visible: boolean;
  onComplete?: () => void;
}

export default function ConfettiCelebration({ visible, onComplete }: ConfettiCelebrationProps) {
  if (!visible) return null;

  // For now, use a simple animation placeholder
  // In production, use a Lottie confetti animation file
  return (
    <View style={styles.container} pointerEvents="none">
      {/* Lottie animation would go here */}
      <View style={styles.placeholder}>
        {/* Placeholder for confetti animation */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  placeholder: {
    width: 200,
    height: 200,
  },
});
