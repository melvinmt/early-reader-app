import { createClient } from '@supabase/supabase-js';

// Expo automatically loads EXPO_PUBLIC_* variables from .env
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase configuration missing!');
  console.error('URL:', supabaseUrl ? '✓ Configured' : '✗ Missing');
  console.error('Key:', supabaseAnonKey ? '✓ Configured' : '✗ Missing');
  console.error('Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  console.error('Current values:', { 
    url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'empty',
    key: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...` : 'empty'
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: undefined, // We'll use our own storage
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Test connection on initialization (in development)
if (__DEV__ && supabaseUrl) {
  supabase.auth.getSession().catch((error) => {
    console.warn('Supabase connection test failed:', error.message);
  });
}


