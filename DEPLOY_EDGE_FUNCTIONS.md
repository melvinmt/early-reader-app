# Deploying Supabase Edge Functions

The Edge Functions must be deployed to Supabase before they can be called. The 401 "Invalid JWT" error indicates the functions either aren't deployed or JWT verification is failing.

## Prerequisites

1. **Supabase CLI installed:**
   ```bash
   npm install -g supabase
   ```

2. **Logged into Supabase CLI:**
   ```bash
   supabase login
   ```

3. **Linked to your project:**
   ```bash
   supabase link --project-ref gktgpjkcqeodmpfyadut
   ```

## Deploy Edge Functions

Deploy all functions at once:

```bash
supabase functions deploy
```

Or deploy individually:

```bash
supabase functions deploy generate-word
supabase functions deploy generate-image
supabase functions deploy get-realtime-token
supabase functions deploy segment-phonemes
```

## Configure Secrets

After deploying, set the required secrets:

```bash
# Set Gemini API key
supabase secrets set GEMINI_API_KEY=your-gemini-api-key

# Set OpenAI API key (for Realtime API)
supabase secrets set OPENAI_API_KEY=your-openai-api-key
```

Or via Supabase Dashboard:
1. Go to **Edge Functions** → **Secrets**
2. Add each secret key-value pair

## Verify Deployment

After deployment, test the function:

```bash
curl 'https://gktgpjkcqeodmpfyadut.supabase.co/functions/v1/generate-word' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  --data-raw '{"level":1,"phonemes":["m","a"],"childId":"test"}'
```

## Troubleshooting JWT Errors

If you still get "Invalid JWT" errors after deployment:

1. **Check token expiry:** The token must not be expired
2. **Use anon key:** Make sure you're using the `anon` `public` key in the `apikey` header, not the publishable key
3. **Check function logs:** Go to Supabase Dashboard → Edge Functions → Logs to see detailed errors
4. **Verify JWT verification:** Edge Functions verify JWT by default. If you need to disable it (not recommended for production), use:
   ```bash
   supabase functions deploy generate-word --no-verify-jwt
   ```

## Important Notes

- **JWT Verification:** By default, Edge Functions verify JWT at the platform level. This happens BEFORE your function code runs.
- **Automatic Token:** When using `supabase.functions.invoke()` in your app, the token is automatically included - you don't need to add it manually.
- **Token Refresh:** The app code automatically refreshes expired tokens before calling Edge Functions.



