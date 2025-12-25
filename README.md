# InstaReader

A mobile app implementing the DISTAR-based methodology from "Teach Your Child to Read in 100 Easy Lessons" by Siegfried Engelmann.

## Prerequisites

- **Node.js** 18+ 
- **Expo CLI** (`npm install -g expo-cli`)
- **Supabase CLI** (`npm install -g supabase`)
- **iOS Simulator** (macOS) or **Android Emulator**
- Accounts for:
  - [Supabase](https://supabase.com) - Authentication & Edge Functions
  - [Google AI Studio](https://aistudio.google.com) - Gemini API for word/image generation
  - [RevenueCat](https://revenuecat.com) - Subscription management

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd instareader

# Install dependencies
npm install
```

## Environment Setup

### 1. Client Environment Variables

Create a `.env` file in the project root:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# RevenueCat (for subscriptions)
EXPO_PUBLIC_REVENUECAT_API_KEY=your-revenuecat-api-key
```

**Where to get these values:**

| Variable | Where to find it |
|----------|------------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → `anon` `public` key |
| `EXPO_PUBLIC_REVENUECAT_API_KEY` | RevenueCat Dashboard → Project Settings → API Keys → Public App-Specific API Key |

### 2. Supabase Edge Function Secrets

The Edge Functions need their own secrets configured. Set these via the Supabase CLI or Dashboard:

```bash
# Using Supabase CLI
supabase secrets set GEMINI_API_KEY=your-gemini-api-key
```

Or via the Supabase Dashboard:
1. Go to **Edge Functions** → **Secrets**
2. Add `GEMINI_API_KEY` with your Google AI Studio API key

**Where to get the Gemini API key:**
- Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
- Create a new API key or use an existing one

### 3. Supabase Project Setup

```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Deploy Edge Functions
supabase functions deploy generate-word
supabase functions deploy generate-image
```

## Running the App

```bash
# Start the development server
npm start

# Or use the init script
./init.sh
```

Then:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app on physical device

## Project Structure

```
instareader/
├── app/                    # Expo Router screens
│   ├── auth/              # Authentication screens
│   ├── onboarding/        # Onboarding flow
│   └── ...
├── src/
│   ├── components/        # Reusable UI components
│   ├── services/          # API and storage services
│   │   ├── ai/           # AI generation (Edge Functions)
│   │   ├── supabase/     # Supabase client
│   │   └── storage/      # SQLite database
│   ├── stores/           # Zustand state stores
│   └── types/            # TypeScript types
├── supabase/
│   └── functions/        # Edge Functions (Deno)
│       ├── generate-word/
│       └── generate-image/
├── .env                  # Local environment variables (create this)
├── features.json         # Feature tracking
└── claude-progress.txt   # Development progress log
```

## Environment Variables Summary

### Client (.env file)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous/public key |
| `EXPO_PUBLIC_REVENUECAT_API_KEY` | ✅ | RevenueCat public API key |

### Supabase Edge Functions (Secrets)

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ | Google Gemini API key for word/image generation |

## Development Workflow

1. Read `claude-progress.txt` and `features.json` to understand current state
2. Work on one feature at a time
3. Commit frequently with descriptive messages
4. Update progress documentation before ending session

## Tech Stack

- **Framework**: React Native + Expo
- **Navigation**: Expo Router
- **State Management**: Zustand
- **Database**: SQLite (local-first)
- **Auth**: Supabase Auth (email OTP)
- **AI Services**: Google Gemini (via Supabase Edge Functions)
- **Payments**: RevenueCat
- **Animations**: React Native Reanimated + Lottie

## License

Private - All rights reserved











