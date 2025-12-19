import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { createParent } from '@/services/storage';
import { Parent } from '@/types/database';

export default function OtpVerificationScreen() {
  const params = useLocalSearchParams();
  const email = (params.email as string) || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const router = useRouter();
  const { verifyOtp } = useAuthStore();

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const token = otp.join('');
    if (token.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }

    const { error, session } = await verifyOtp(email, token);

    if (error) {
      Alert.alert('Error', error.message || 'Invalid code. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } else if (session?.user) {
      // Store parent in local SQLite
      const parent: Parent = {
        id: session.user.id,
        email: email,
        created_at: new Date().toISOString(),
        subscription_status: 'none',
        settings: '{}',
      };

      try {
        await createParent(parent);
        // Navigate to add children screen
        router.replace('/onboarding/add-children');
      } catch (error) {
        console.error('Error creating parent:', error);
        Alert.alert('Error', 'Failed to save account. Please try again.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to{'\n'}
        <Text style={styles.email}>{email}</Text>
      </Text>

      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={styles.otpInput}
            value={digit}
            onChangeText={(value) => handleOtpChange(index, value)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleVerify}>
        <Text style={styles.buttonText}>Verify</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resendButton}
        onPress={() => {
          // TODO: Resend OTP
          Alert.alert('Info', 'Resend functionality coming soon');
        }}
      >
        <Text style={styles.resendText}>Resend code</Text>
      </TouchableOpacity>
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
  email: {
    fontWeight: '600',
    color: '#007AFF',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 12,
  },
  otpInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    textAlign: 'center',
    backgroundColor: '#f9f9f9',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
  },
  resendText: {
    color: '#007AFF',
    fontSize: 14,
  },
});
