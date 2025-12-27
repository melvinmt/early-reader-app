# Edge Functions JWT Verification Setup

## The Issue

- **Publishable keys** (`sb_publishable_...`) are the new recommended format
- **Edge Functions** only support JWT verification with **legacy anon keys** (`eyJ...`)
- You need JWT verification enabled for security

## The Solution

Use the **legacy anon key** in your client configuration. Even though it's marked as "deprecated", it's still:
- ✅ Safe to use in client code (same security model as publishable keys)
- ✅ Required for Edge Functions with JWT verification
- ✅ Will continue to work until Supabase adds publishable key support to Edge Functions

## Setup Steps

1. **Get your legacy anon key:**
   - Go to: https://supabase.com/dashboard/project/gktgpjkcqeodmpfyadut/settings/api
   - Click the "Legacy anon, service_role API keys" tab
   - Copy the "Anon public" key (starts with `eyJ...`)

2. **Update your `.env` file:**
   ```
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-legacy-anon-key...
   ```

3. **Restart your app:**
   ```bash
   npm start -- --clear
   ```

## Why This Works

- The legacy anon key is a JWT that Edge Functions can verify
- Your Edge Functions will verify JWT at the platform level (before function code runs)
- Your Edge Functions also verify the user's JWT token internally (from Authorization header)
- This provides **double verification** for maximum security

## Future Migration

When Supabase adds publishable key support to Edge Functions, you can migrate. For now, using the legacy anon key is the correct approach for Edge Functions with JWT verification.









