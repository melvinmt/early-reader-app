import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useAuthStore } from '@/stores/authStore';
import { updateParentSubscriptionStatus } from '@/services/storage';
import Button from '@/components/ui/Button';

export default function SubscriptionScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    initializeRevenueCat();
  }, []);

  const initializeRevenueCat = async () => {
    try {
      if (!session?.user) {
        Alert.alert('Error', 'Please sign in first');
        return;
      }

      // Initialize RevenueCat with user ID
      await Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
      await Purchases.configure({
        apiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || '',
      });
      await Purchases.logIn(session.user.id);

      // Get available packages
      const offerings = await Purchases.getOfferings();
      if (offerings.current) {
        setPackages(offerings.current.availablePackages);
      }
    } catch (error) {
      console.error('Error initializing RevenueCat:', error);
    } finally {
      setInitializing(false);
    }
  };

  const handlePurchase = async (pkg: PurchasesPackage) => {
    if (!session?.user) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    setLoading(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);

      if (customerInfo.entitlements.active['premium']) {
        // Update subscription status in local database
        await updateParentSubscriptionStatus(session.user.id, 'active');

        // Navigate to child selection
        router.replace('/(tabs)/children');
      } else {
        Alert.alert('Error', 'Purchase completed but subscription not active');
      }
    } catch (error: any) {
      if (error.userCancelled) {
        // User cancelled, do nothing
      } else {
        Alert.alert('Error', error.message || 'Failed to complete purchase');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Allow skipping for now (trial mode)
    router.replace('/(tabs)/children');
  };

  if (initializing) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Start Your Free Trial</Text>
      <Text style={styles.subtitle}>
        3 days free, then $99/month
      </Text>

      <View style={styles.featuresList}>
        <FeatureItem text="All 100 lessons" />
        <FeatureItem text="Unlimited word cards" />
        <FeatureItem text="AI-generated content" />
        <FeatureItem text="Progress tracking" />
        <FeatureItem text="Multiple child profiles" />
      </View>

      {packages.length > 0 && (
        <View style={styles.packagesContainer}>
          {packages.map((pkg) => (
            <View key={pkg.identifier} style={styles.packageCard}>
              <Text style={styles.packageTitle}>
                {pkg.product.title}
              </Text>
              <Text style={styles.packagePrice}>
                {pkg.product.priceString}
              </Text>
              <Button
                title="Subscribe"
                onPress={() => handlePurchase(pkg)}
                loading={loading}
                style={styles.subscribeButton}
              />
            </View>
          ))}
        </View>
      )}

      <Button
        title="Start Free Trial"
        onPress={handleSkip}
        variant="primary"
        style={styles.trialButton}
      />

      <Text style={styles.legalText}>
        By subscribing, you agree to our Terms of Service and Privacy Policy.
        Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
      </Text>
    </ScrollView>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureCheck}>✓</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  featuresList: {
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureCheck: {
    fontSize: 20,
    color: '#34C759',
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
  },
  packagesContainer: {
    marginBottom: 24,
  },
  packageCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 12,
  },
  subscribeButton: {
    marginTop: 8,
  },
  trialButton: {
    marginBottom: 16,
  },
  legalText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});


