import { create } from 'zustand';
import { Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase/client';

interface AuthState {
  session: Session | null;
  initialized: boolean;
  initialize: () => Promise<void>;
  sendOtp: (email: string) => Promise<{ error: AuthError | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: AuthError | null; session: Session | null }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  initialized: false,

  initialize: async () => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, initialized: true });

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session });
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ initialized: true });
    }
  },

  sendOtp: async (email: string) => {
    try {
      // Use signInWithOtp to send OTP code
      // IMPORTANT: To send 6-digit codes instead of Magic Links, configure the OTP email template:
      // 1. Go to Supabase Dashboard > Authentication > Email Templates
      // 2. Edit the OTP-specific email template (separate from Magic Link template)
      // 3. Ensure it includes: <p>Please enter this code: {{ .Token }}</p>
      // Note: signInWithOtp() will use the OTP template if {{ .Token }} is present,
      // otherwise it defaults to Magic Link template with {{ .ConfirmationURL }}
      // See: https://supabase.com/docs/guides/auth/auth-email-passwordless#with-otp
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        console.error('Error sending OTP:', error);
        return { error };
      }

      console.log('OTP sent successfully to:', email);
      return { error: null };
    } catch (error) {
      console.error('Exception sending OTP:', error);
      return {
        error: error as AuthError,
      };
    }
  },

  verifyOtp: async (email: string, token: string) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) {
        return { error, session: null };
      }

      if (data.session) {
        set({ session: data.session });
      }

      return { error: null, session: data.session };
    } catch (error) {
      return {
        error: error as AuthError,
        session: null,
      };
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ session: null });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  },
}));

