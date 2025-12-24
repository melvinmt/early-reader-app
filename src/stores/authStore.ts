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

      console.log('Attempting OTP sign in for:', email);
      console.log('Supabase URL:', supabaseUrl.substring(0, 30) + '...');

      const { error, data } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: undefined, // Not needed for mobile
        },
      });
      
      set({ loading: false });
      
      if (error) {
        console.error('Supabase OTP error:', {
          message: error.message,
          status: error.status,
          name: error.name,
        });
        
        // Provide more specific error messages
        let userMessage = error.message;
        if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
          userMessage = 'Cannot connect to Supabase. Please check:\n\n1. Your internet connection\n2. That your Supabase project is active\n3. The Supabase URL in your .env file';
        } else if (error.message.includes('Invalid API key')) {
          userMessage = 'Invalid Supabase API key. Please check your .env file.';
        } else if (error.message.includes('not found') || error.status === 404) {
          userMessage = 'Supabase project not found. Please verify your project URL.';
        }
        
        return { error: new Error(userMessage) };
      }
      
      console.log('✓ OTP sent successfully');
      return { error: null };
    } catch (error) {
      console.error('Network error during OTP sign in:', error);
      set({ loading: false });
      
      // Provide more helpful error messages
      let errorMessage = 'Network request failed.';
      
      if (error instanceof Error) {
        if (error.message.includes('Network request failed')) {
          errorMessage = 'Cannot connect to Supabase. Please check:\n\n1. Your internet connection\n2. That your Supabase project is active (not paused)\n3. The Supabase URL in your .env file matches your project';
        } else {
          errorMessage = error.message;
        }
      }
      
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


