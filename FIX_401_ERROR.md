# Fix for 401 "Invalid JWT" Error

## Root Cause

You're using a **publishable key** (`sb_publishable_...`) as your Supabase anon key.

**Edge Functions only support JWT verification with the `anon` and `service_role` JWT-based keys.** Publishable keys are NOT JWTs and will always fail JWT verification.

From Supabase documentation:
> "Edge Functions only support JWT verification via the `anon` and `service_role` JWT-based API keys. You will need to use the `--no-verify-jwt` option when using publishable and secret keys."

## The Fix

### Step 1: Get your JWT-based anon key

1. Go to: https://supabase.com/dashboard/project/gktgpjkcqeodmpfyadut/settings/api
2. Find the key labeled **`anon` `public`**
3. It should start with `eyJ...` (this is a JWT)

### Step 2: Update your .env file

Replace:
```
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_Nlyjqu7bqBkXEoGl1XroCw_0RQmVsE4
```

With:
```
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-jwt-anon-key...
```

### Step 3: Restart your Expo app

```bash
npm start -- --clear
```

## Why This Works

- **Publishable key** (`sb_publishable_...`): New format, NOT a JWT, cannot be verified by Edge Functions
- **Anon key** (`eyJ...`): JWT format, CAN be verified by Edge Functions

The Edge Function platform verifies the JWT **before** your function code runs. If the `apikey` header contains a non-JWT value, it returns 401 immediately.

## Alternative: Disable JWT Verification (Not Recommended)

If you MUST use the publishable key, deploy without JWT verification:

```bash
supabase functions deploy --no-verify-jwt
```

**Warning:** This removes authentication at the platform level. Your functions will be publicly accessible.




