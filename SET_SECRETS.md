# Setting Edge Function Secrets

After deploying Edge Functions, you need to set the required API keys as secrets.

## Required Secrets

1. **GEMINI_API_KEY** - For word and image generation
2. **OPENAI_API_KEY** - For Realtime API token generation (optional if not using voice)

## Set Secrets via CLI

```bash
# Make sure you're linked to your project
supabase link --project-ref gktgpjkcqeodmpfyadut

# Set Gemini API key
supabase secrets set GEMINI_API_KEY=your-gemini-api-key-here

# Set OpenAI API key (if using voice features)
supabase secrets set OPENAI_API_KEY=your-openai-api-key-here
```

## Set Secrets via Dashboard

1. Go to: https://supabase.com/dashboard/project/gktgpjkcqeodmpfyadut/functions
2. Click on **Secrets** tab
3. Add each secret:
   - Key: `GEMINI_API_KEY`
   - Value: Your Gemini API key from Google AI Studio
   - Key: `OPENAI_API_KEY`  
   - Value: Your OpenAI API key (if using voice)

## Verify Secrets

After setting secrets, the Edge Functions will be able to call external APIs. Without secrets, you'll get 500 errors saying "GEMINI_API_KEY not configured".

## Get API Keys

- **Gemini API Key:** https://aistudio.google.com/app/apikey
- **OpenAI API Key:** https://platform.openai.com/api-keys






