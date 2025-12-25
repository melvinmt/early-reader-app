import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { createParent, getParent, getChildrenByParentId } from '@/services/storage';
import { Parent } from '@/types/database';

export default function OtpVerificationScreen() {
  const params = useLocalSearchParams();
  const email = (params.email as string) || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const router = useRouter();
  const { verifyOtp, sendOtp } = useAuthStore();

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    // Cooldown timer for resend
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resending || resendCooldown > 0) {
      return;
    }

    setResending(true);
    try {
      const { error } = await sendOtp(email);
      
      if (error) {
        Alert.alert('Error', error.message || 'Failed to resend code. Please try again.');
      } else {
        Alert.alert('Success', 'A new code has been sent to your email.');
        // Clear OTP inputs
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        // Set 60 second cooldown
        setResendCooldown(60);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    // Handle paste: if multiple digits are pasted into the first field, distribute them
    if (index === 0 && value.length > 1) {
      // Extract only digits from pasted text
      const digits = value.replace(/\D/g, '').slice(0, 6);
      
      if (digits.length > 0) {
        const newOtp: string[] = [];
        // Fill fields with pasted digits
        for (let i = 0; i < 6; i++) {
          newOtp[i] = digits[i] || '';
        }
        setOtp(newOtp);
        
        // Focus the last filled field or the last field if all are filled
        const lastFilledIndex = Math.min(digits.length - 1, 5);
        inputRefs.current[lastFilledIndex]?.focus();
        
        // Auto-verify if all 6 digits are pasted - pass the token directly to avoid state race condition
        if (digits.length === 6) {
          // Use the digits directly instead of waiting for state update
          setTimeout(() => {
            handleVerifyWithToken(digits.join(''));
          }, 50);
        }
        return;
      }
    }

    // Single character input - only allow digits
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

  const handleVerifyWithToken = async (token: string) => {
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
      // Store parent in local SQLite (will be ignored if already exists)
      const parent: Parent = {
        id: session.user.id,
        email: email,
        created_at: new Date().toISOString(),
        subscription_status: 'none',
        settings: '{}',
      };

      try {
        await createParent(parent);
        
        // Check if parent already has children
        const existingParent = await getParent(session.user.id);
        if (existingParent) {
          const children = await getChildrenByParentId(session.user.id);
          if (children.length > 0) {
            // Parent exists and has children - go to children selection
            router.replace('/children');
            return;
          }
        }
        
        // New parent or no children - go to add children screen
        router.replace('/onboarding/add-children');
      } catch (error) {
        console.error('Error creating parent:', error);
        Alert.alert('Error', 'Failed to save account. Please try again.');
      }
    }
  };

  const handleVerify = async () => {
    const token = otp.join('');
    await handleVerifyWithToken(token);
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
            maxLength={index === 0 ? 6 : 1}
            selectTextOnFocus
          />
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleVerify}>
        <Text style={styles.buttonText}>Verify</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.resendButton, (resending || resendCooldown > 0) && styles.resendButtonDisabled]}
        onPress={handleResend}
        disabled={resending || resendCooldown > 0}
      >
        <Text style={[styles.resendText, (resending || resendCooldown > 0) && styles.resendTextDisabled]}>
          {resending
            ? 'Sending...'
            : resendCooldown > 0
            ? `Resend code (${resendCooldown}s)`
            : 'Resend code'}
        </Text>
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
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendText: {
    color: '#007AFF',
    fontSize: 14,
  },
  resendTextDisabled: {
    color: '#999',
  },
});






