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
  global: {
    fetch: (url, options = {}) => {
      // Workaround for Expo SDK 52 + iOS 18.4 simulator network issues
      const urlString = typeof url === 'string' ? url : url.toString();
      
      // Ensure we're using the native fetch with proper error handling
      const fetchOptions: RequestInit = {
        ...options,
        headers: {
          ...options.headers,
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json',
        },
      };

      return fetch(urlString, fetchOptions).catch((error) => {
        console.error('Supabase fetch error:', {
          url: urlString.substring(0, 100),
          error: error.message,
          type: error.constructor.name,
          name: error.name,
        });
        
        // Re-throw with more context
        const enhancedError = new Error(
          `Network request failed: ${error.message}. ` +
          `This may be an Expo SDK 52 + iOS 18.4 simulator issue. ` +
          `Try using iOS 18.0 simulator or a physical device.`
        );
        enhancedError.name = error.name;
        throw enhancedError;
      });
    },
  },
});

// Test connection on initialization (in development)
if (__DEV__ && supabaseUrl) {
  // Test if Supabase endpoint is reachable
  fetch(`${supabaseUrl}/rest/v1/`, {
    method: 'HEAD',
    headers: {
      'apikey': supabaseAnonKey,
    },
  })
    .then((response) => {
      if (response.ok) {
        console.log('✓ Supabase connection test: OK');
      } else {
        console.warn('⚠ Supabase connection test: HTTP', response.status);
      }
    })
    .catch((error) => {
      console.error('✗ Supabase connection test failed:', error.message);
      console.error('  URL:', supabaseUrl);
      console.error('  This might indicate:');
      console.error('  1. The Supabase project is paused or inactive');
      console.error('  2. Network connectivity issues');
      console.error('  3. Incorrect Supabase URL');
    });
}


