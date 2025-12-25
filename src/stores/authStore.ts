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
      // Get current session from storage
      // This will restore the session if it was persisted
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
      }
      
      console.log('Session restored:', session ? 'Yes' : 'No');
      if (session) {
        console.log('Session user:', session.user.email);
      }
      
      set({ session, initialized: true });

      // Listen for auth changes (sign in, sign out, token refresh, etc.)
      supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');
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
      // 
      // IMPORTANT: signInWithOtp() sends Magic Links by default.
      // To send 6-digit OTP codes instead, you MUST configure the email template in Supabase Dashboard.
      // There is NO API option to force OTP mode - it's determined by the template content.
      // 
      // Steps to configure:
      // 1. Go to Supabase Dashboard > Authentication > Email Templates
      // 2. Find the template used by signInWithOtp() (usually named "Magic Link")
      // 3. COMPLETELY REMOVE {{ .ConfirmationURL }} from the template
      // 4. Replace with ONLY {{ .Token }} - do NOT include both variables
      // 
      // Example template (CORRECT):
      // <h2>Confirm Your Signup</h2>
      // <p>Your 6-digit verification code is:</p>
      // <p style="font-size: 24px; font-weight: bold;">{{ .Token }}</p>
      // <p>Enter this code in the app to complete your signup.</p>
      // 
      // CRITICAL: If {{ .ConfirmationURL }} exists anywhere in the template,
      // Supabase will send a Magic Link regardless of other content.
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

