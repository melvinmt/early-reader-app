import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase/client';

interface AuthState {
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  signInWithOtp: (email: string) => Promise<{ error: Error | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null; session: Session | null }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    set({ loading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, initialized: true, loading: false });

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session });
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ initialized: true, loading: false });
    }
  },

  signInWithOtp: async (email: string) => {
    set({ loading: true });
    try {
      // Check if Supabase is configured
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        const configError = new Error('Supabase is not configured. Please check your environment variables.');
        set({ loading: false });
        return { error: configError };
      }

      const { error, data } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });
      
      set({ loading: false });
      
      if (error) {
        console.error('Supabase OTP error:', error);
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      console.error('Network error during OTP sign in:', error);
      set({ loading: false });
      
      // Provide more helpful error messages
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Network request failed. Please check your internet connection and try again.';
      
      return { error: new Error(errorMessage) };
    }
  },

  verifyOtp: async (email: string, token: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      set({ loading: false, session: data.session });
      return { error, session: data.session };
    } catch (error) {
      set({ loading: false });
      return { error: error as Error, session: null };
    }
  },

  signOut: async () => {
    set({ loading: true });
    await supabase.auth.signOut();
    set({ session: null, loading: false });
  },
}));


