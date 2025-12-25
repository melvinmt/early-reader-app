import { View, StyleSheet, ViewStyle } from 'react-native';

interface ProgressBarProps {
  progress: number; // 0-1
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
}

export default function ProgressBar({
  progress,
  color = '#007AFF',
  backgroundColor = '#E5E5EA',
  style,
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(1, progress));

  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      <View
        style={[
          styles.progress,
          {
            width: `${clampedProgress * 100}%`,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: 4,
  },
});












