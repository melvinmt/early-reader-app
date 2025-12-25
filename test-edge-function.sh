#!/bin/bash

# Test script for Edge Functions
# Make sure you have a valid JWT token from your app session

PROJECT_URL="https://gktgpjkcqeodmpfyadut.supabase.co"
ANON_KEY="YOUR_ANON_KEY_HERE"  # Get from Supabase Dashboard → Settings → API → anon public key
JWT_TOKEN="YOUR_JWT_TOKEN_HERE"  # Get from app session or Supabase Auth

echo "Testing generate-word Edge Function..."
echo ""

curl -X POST "${PROJECT_URL}/functions/v1/generate-word" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "x-client-info: supabase-js-react-native/2.89.0" \
  --data-raw '{"level":1,"phonemes":["m","a"],"childId":"test-child-id"}' \
  -v

echo ""
echo ""
echo "If you get 401, check:"
echo "1. ANON_KEY is correct (not publishable key)"
echo "2. JWT_TOKEN is valid and not expired"
echo "3. Secrets are set: supabase secrets set GEMINI_API_KEY=your-key"





