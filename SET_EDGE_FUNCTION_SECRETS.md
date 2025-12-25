# Setting Edge Function Secrets

## Required Secrets

Your Edge Functions need these API keys to work:

1. **GEMINI_API_KEY** - For word and image generation
2. **OPENAI_API_KEY** - For Realtime API token generation
3. **PUBLISHABLE_KEY** - Already set ✅

## Set Secrets

```bash
# Set Gemini API key (for word/image generation)
supabase secrets set GEMINI_API_KEY=your-gemini-api-key

# Set OpenAI API key (for voice/Realtime API)
supabase secrets set OPENAI_API_KEY=your-openai-api-key
```

## Get API Keys

- **Gemini API Key:** https://aistudio.google.com/app/apikey
- **OpenAI API Key:** https://platform.openai.com/api-keys

## Verify Secrets Are Set

```bash
supabase secrets list
```

You should see:
- `GEMINI_API_KEY` ✅
- `OPENAI_API_KEY` ✅
- `PUBLISHABLE_KEY` ✅

## Current Error

The error `"OPENAI_API_KEY not configured"` means you need to set this secret. Once set, the Edge Functions will be able to call OpenAI's Realtime API.





