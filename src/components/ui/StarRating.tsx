import { View, Text, StyleSheet } from 'react-native';

interface StarRatingProps {
  rating: number; // 0-5
  size?: number;
}

export default function StarRating({ rating, size = 24 }: StarRatingProps) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <View style={styles.container}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <Text key={`full-${i}`} style={[styles.star, { fontSize: size }]}>
          ⭐
        </Text>
      ))}
      {hasHalfStar && (
        <Text style={[styles.star, { fontSize: size }]}>⭐</Text>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Text key={`empty-${i}`} style={[styles.star, styles.emptyStar, { fontSize: size }]}>
          ⭐
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginHorizontal: 2,
  },
  emptyStar: {
    opacity: 0.3,
  },
});


