import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { updateParentSubscriptionStatus } from '@/services/storage';
import Button from '@/components/ui/Button';

// Conditionally import Purchases (only available in native builds)
let Purchases: any = null;
let PurchasesPackage: any = null;
try {
  const purchasesModule = require('react-native-purchases');
  Purchases = purchasesModule.default;
  PurchasesPackage = purchasesModule.PurchasesPackage;
} catch (e) {
  // Purchases not available (Expo Go)
  console.log('react-native-purchases not available, running in Expo Go mode');
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const { session } = useAuthStore();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [purchasesAvailable, setPurchasesAvailable] = useState(false);

  useEffect(() => {
    // Only initialize RevenueCat on web platform or in production native builds
    // Skip in Expo Go to avoid Browser Mode issues
    if (Purchases && Platform.OS === 'web') {
      // Web platform - Browser Mode should work
      initializeRevenueCat();
    } else if (Purchases && Platform.OS !== 'web') {
      // Native platform - only initialize if not in Expo Go
      // In Expo Go, Purchases won't be available anyway, so this is a safety check
      try {
        initializeRevenueCat();
      } catch (e) {
        console.log('RevenueCat not available in Expo Go');
        setInitializing(false);
        setPurchasesAvailable(false);
      }
    } else {
      // Purchases not available (Expo Go or missing package)
      setInitializing(false);
      setPurchasesAvailable(false);
    }
  }, [session]);

  const initializeRevenueCat = async () => {
    try {
      if (!session?.user) {
        Alert.alert('Error', 'Please sign in first');
        setInitializing(false);
        return;
      }

      const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
      if (!apiKey) {
        console.warn('RevenueCat API key not found in environment variables');
        setPurchasesAvailable(false);
        setInitializing(false);
        return;
      }

      // Initialize RevenueCat with user ID
      // Only set log level if available (may not be in Browser Mode)
      if (Purchases.setLogLevel) {
        try {
          await Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
        } catch (e) {
          // Log level setting may fail in Browser Mode, continue anyway
          console.log('Could not set RevenueCat log level:', e);
        }
      }

      // Configure RevenueCat with error handling for browser API issues
      try {
        await Purchases.configure({
          apiKey: apiKey,
        });
      } catch (configureError: any) {
        // If configure fails due to browser API issues (window.location.search, etc.), skip RevenueCat
        const errorMessage = configureError?.message || String(configureError);
        if (
          errorMessage.includes('search') ||
          errorMessage.includes('undefined') ||
          errorMessage.includes('window') ||
          errorMessage.includes('location')
        ) {
          console.warn('RevenueCat Browser Mode not supported in this environment:', errorMessage);
          setPurchasesAvailable(false);
          setInitializing(false);
          return;
        } else {
          throw configureError;
        }
      }

      // Log in user
      if (Purchases.logIn) {
        try {
          await Purchases.logIn(session.user.id);
        } catch (loginError: any) {
          console.warn('RevenueCat login failed:', loginError);
          // Continue anyway - may still work
        }
      }

      // Get available packages
      if (Purchases.getOfferings) {
        try {
          const offerings = await Purchases.getOfferings();
          if (offerings?.current) {
            setPackages(offerings.current.availablePackages || []);
            setPurchasesAvailable(true);
          } else {
            setPurchasesAvailable(false);
          }
        } catch (offeringsError: any) {
          console.warn('RevenueCat getOfferings failed:', offeringsError);
          setPurchasesAvailable(false);
        }
      } else {
        setPurchasesAvailable(false);
      }
    } catch (error: any) {
      console.error('Error initializing RevenueCat:', error);
      // If it's a browser API error, mark as unavailable but don't show error to user
      const errorMessage = error?.message || String(error);
      if (
        errorMessage.includes('search') ||
        errorMessage.includes('undefined') ||
        errorMessage.includes('window') ||
        errorMessage.includes('location')
      ) {
        console.warn('RevenueCat Browser Mode not fully supported in this environment');
      }
      setPurchasesAvailable(false);
    } finally {
      setInitializing(false);
    }
  };

  const handlePurchase = async (pkg: any) => {
    if (!Purchases) {
      Alert.alert('Info', 'Purchases are only available in production builds. Use "Start Free Trial" to continue.');
      return;
    }

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

  const handleSkip = async () => {
    // Allow skipping for now (trial mode)
    // In Expo Go, we'll just mark as active for development
    if (session?.user) {
      try {
        await updateParentSubscriptionStatus(session.user.id, 'active');
      } catch (error) {
        console.error('Error updating subscription status:', error);
      }
    }
    router.replace('/children');
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

      {!purchasesAvailable && (
        <View style={styles.devModeNotice}>
          <Text style={styles.devModeText}>
            Development Mode: Purchases are disabled in Expo Go. Use "Start Free Trial" to continue.
          </Text>
        </View>
      )}

      {packages.length > 0 && purchasesAvailable && (
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
  devModeNotice: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  devModeText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },
});





