import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function EmailInputScreen() {
  const [email, setEmail] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const router = useRouter();
  const { signInWithOtp } = useAuthStore();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsValidating(true);
    try {
      const { error } = await signInWithOtp(email.toLowerCase().trim());

      if (error) {
        console.error('OTP sign in error:', error);
        let errorMessage = error.message || 'Failed to send OTP. Please try again.';
        
        // Provide more specific error messages
        if (errorMessage.includes('Network request failed') || errorMessage.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (errorMessage.includes('not configured')) {
          errorMessage = 'App configuration error. Please contact support.';
        }
        
        Alert.alert('Error', errorMessage);
        setIsValidating(false);
      } else {
        // Navigate to OTP verification screen with email
        router.push({
          pathname: '/auth/otp-verification',
          params: { email: email.toLowerCase().trim() },
        });
        setIsValidating(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      setIsValidating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to InstaReader</Text>
      <Text style={styles.subtitle}>Enter your email to get started</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoFocus
          editable={!isValidating}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, isValidating && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isValidating}
      >
        <Text style={styles.buttonText}>
          {isValidating ? 'Sending...' : 'Continue'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.legalText}>
        By continuing, you agree to our Terms of Service and Privacy Policy
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  legalText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
});


