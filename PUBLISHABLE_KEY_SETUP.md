# Using Publishable Keys with Edge Functions

## Solution

Based on Supabase documentation, when using **publishable keys** with Edge Functions:

1. **Deploy with `--no-verify-jwt`** to disable platform-level JWT verification
2. **Implement custom `apikey` header verification** in Edge Function code
3. **Still verify user JWT tokens** from the Authorization header

This gives you:
- ✅ Use modern publishable keys (not deprecated)
- ✅ Verify user JWT tokens (security)
- ✅ Verify publishable key in function code (extra layer)

## Setup Steps

### 1. Set Publishable Key as Secret

```bash
supabase secrets set PUBLISHABLE_KEY=sb_publishable_Nlyjqu7bqBkXEoGl1XroCw_0RQmVsE4
```

### 2. Deploy Functions with `--no-verify-jwt`

```bash
supabase functions deploy generate-word --no-verify-jwt
supabase functions deploy generate-image --no-verify-jwt
supabase functions deploy get-realtime-token --no-verify-jwt
supabase functions deploy segment-phonemes --no-verify-jwt
```

Or use the `config.toml` file (already created) and deploy normally:

```bash
supabase functions deploy
```

### 3. Keep Using Publishable Key in Client

Your `.env` file is already correct:
```
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_Nlyjqu7bqBkXEoGl1XroCw_0RQmVsE4
```

## How It Works

1. **Client sends request:**
   - `apikey` header: publishable key (identifies the app)
   - `Authorization` header: user JWT token (identifies the user)

2. **Edge Function verifies:**
   - ✅ Checks `apikey` header matches expected publishable key
   - ✅ Verifies user JWT token is valid and not expired
   - ✅ Gets user info from JWT

3. **Security layers:**
   - Layer 1: Publishable key verification (app authentication)
   - Layer 2: User JWT verification (user authentication)

## Why This Works

From Supabase docs:
> "Edge Functions only support JWT verification via the `anon` and `service_role` JWT-based API keys. You will need to use the `--no-verify-jwt` option when using publishable and secret keys. **Implement your own `apikey`-header authorization logic inside the Edge Function code itself.**"

This is exactly what we've implemented!






