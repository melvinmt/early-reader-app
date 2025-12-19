# InstaReader: 100 Easy Lessons App Implementation Plan

An app implementation of the DISTAR-based methodology from "Teach Your Child to Read in 100 Easy Lessons" by Siegfried Engelmann, Phyllis Haddox, and Elaine Bruner.

---

## Executive Summary

This plan outlines the development of **InstaReader**, a mobile/tablet application that digitizes the proven DISTAR (Direct Instruction System for Teaching and Remediation) methodology. The app will guide parents and children through 100 structured phonics lessons, each taking 20-30 minutes, to achieve approximately 2nd-grade reading level.

---

## Table of Contents

1. [Core Methodology Overview](#core-methodology-overview)
2. [App Architecture](#app-architecture)
3. [Feature Specifications](#feature-specifications)
4. [AI Content Generation System](#ai-content-generation-system)
5. [Interactive Swipe Detection](#interactive-swipe-detection)
6. [Lesson Structure Implementation](#lesson-structure-implementation)
7. [Special Orthography System](#special-orthography-system)
8. [Audio & Interaction Design](#audio--interaction-design)
9. [Progress Tracking & Analytics](#progress-tracking--analytics)
10. [Technical Stack Recommendations](#technical-stack-recommendations)
11. [Development Phases](#development-phases)
12. [Monetization Strategy](#monetization-strategy)

---

## Core Methodology Overview

### The DISTAR Method Principles

Based on research from the 1960s and validated by Project Follow-Through, this method emphasizes:

| Principle | Description | App Implementation |
|-----------|-------------|-------------------|
| **Explicit Instruction** | Clear, direct teaching of phonics | Scripted audio/visual prompts |
| **Systematic Progression** | Carefully sequenced sound introduction | Locked lesson progression |
| **Immediate Correction** | Errors corrected at point of occurrence | Real-time feedback with speech recognition |
| **High Engagement** | Frequent student responses | Touch/voice interaction every few seconds |
| **Mastery-Based** | Move forward only when mastered | Adaptive difficulty gates |

### Four Major Instructional Tracks

1. **Sound Practice** - Learning individual letter sounds
2. **Oral Segmenting and Blending** - Breaking apart and combining sounds
3. **Word Reading** - Decoding words using learned sounds
4. **Sentence and Passage Reading** - Connected text comprehension

---

## App Architecture

### High-Level System Design

**Architecture Philosophy: Local-First with Cloud LLM Proxy**

All user data is stored locally in SQLite on the device. The only cloud interactions are with AI/LLM services, which are proxied through Supabase Edge Functions for security (API keys never exposed to client).

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INSTAREADER APP                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  LOCAL DATA LAYER (SQLite)                                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  • Parents table (email, settings)                          │    │
│  │  • Children table (name, age, current_level)                │    │
│  │  • Card progress (SM-2 spaced repetition data)              │    │
│  │  • Generated content cache (words, images, audio)           │    │
│  │  • Session history and analytics                            │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ONBOARDING (3 Screens) - All Data Stored Locally                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐   │
│  │ 1. Parent    │  │ 2. Add       │  │ 3. Subscription          │   │
│  │    Email     │─▶│    Children  │─▶│    $99/mo (3-day trial) │   │
│  │   (SQLite)   │  │    (SQLite)  │  │    (RevenueCat)          │   │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘   │
│                                                                      │
│  MAIN APP (Endless Learning Loop)                                    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    CARD GENERATION ENGINE                    │    │
│  │                                                              │    │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │    │
│  │  │   Current   │───▶│   AI Card   │───▶│   Display Card  │  │    │
│  │  │   Level     │    │   Generator │    │   + Voice       │  │    │
│  │  │  (SQLite)   │    │ (Edge Func) │    │                 │  │    │
│  │  └─────────────┘    └─────────────┘    └────────┬────────┘  │    │
│  │         ▲                                        │           │    │
│  │         │           ┌────────────────────────────┘           │    │
│  │         │           ▼                                        │    │
│  │  ┌──────┴──────────────────────────────────────────────┐    │    │
│  │  │              SPACED REPETITION ENGINE               │    │    │
│  │  │              (All state in SQLite)                  │    │    │
│  │  │  Success → Increase interval → Level up             │    │    │
│  │  │  Struggle → Decrease interval → Queue for review    │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  CLOUD SERVICES (via Supabase Edge Functions only)                   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                 SUPABASE EDGE FUNCTIONS                       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │   │
│  │  │ OpenAI   │ │ Gemini   │ │ Nano     │                     │   │
│  │  │ Realtime │ │ 3 Flash  │ │ Banana   │                     │   │
│  │  │ (Voice + │ │ (Text)   │ │ (Images) │                     │   │
│  │  │  TTS)    │ │          │ │          │                     │   │
│  │  └──────────┘ └──────────┘ └──────────┘                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  LOCAL SERVICES                                                      │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────┐                     │
│  │ SQLite   │ │ RevenueCat   │ │ Local File   │                     │
│  │ Database │ │ (Purchases)  │ │ System Cache │                     │
│  └──────────┘ └──────────────┘ └──────────────┘                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      LOCAL-FIRST DATA FLOW                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  DEVICE (Offline-Capable)                 CLOUD (LLM Only)          │
│  ┌─────────────────────────────┐         ┌─────────────────────┐    │
│  │                             │         │  Supabase Edge      │    │
│  │  ┌───────────────────────┐  │  HTTPS  │  Functions          │    │
│  │  │      SQLite DB        │  │◄───────►│  ┌───────────────┐  │    │
│  │  │  ┌─────────────────┐  │  │         │  │ generate-word │  │    │
│  │  │  │ parents         │  │  │         │  │ generate-image│  │    │
│  │  │  │ children        │  │  │         │  │ voice-session │  │    │
│  │  │  │ card_progress   │  │  │         │  │ (handles TTS) │  │    │
│  │  │  │ content_cache   │  │  │         │  └───────────────┘  │    │
│  │  │  │ sessions        │  │  │         │         │           │    │
│  │  │  └─────────────────┘  │  │         │         ▼           │    │
│  │  └───────────────────────┘  │         │  ┌───────────────┐  │    │
│  │                             │         │  │ External APIs │  │    │
│  │  ┌───────────────────────┐  │         │  │ • OpenAI      │  │    │
│  │  │   File System Cache   │  │         │  │ • Gemini 3    │  │    │
│  │  │  ┌─────────────────┐  │  │         │  │ • Nano Banana │  │    │
│  │  │  │ images/         │  │  │         │  └───────────────┘  │    │
│  │  │  │ audio/          │  │  │         └─────────────────────┘    │
│  │  │  └─────────────────┘  │  │                                    │
│  │  └───────────────────────┘  │                                    │
│  └─────────────────────────────┘                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Simplified User Flow

The app is intentionally minimal with only one settings screen (guarded by parental gate):

1. **Onboarding** (one-time, all stored locally)
   - Parent email → stored in SQLite (for account identification only)
   - Add children (name + age) → stored in SQLite
   - Subscribe ($99/mo, 3-day trial) → RevenueCat handles purchase

2. **Daily Use**
   - Select child profile (from local SQLite)
   - Start learning → endless cards (progress saved locally)
   - Access settings via gear icon → parental gate → manage children
   - Exit when done (all data persisted locally)

That's it. No dashboards, no complexity - just a protected settings screen. **All data stays on-device.**

---

## Onboarding Flow

### Screen 1: Parent Email (Supabase Auth)

Parent authentication via Supabase Auth (email OTP). After authentication, parent email and user ID are stored locally in SQLite for account identification and RevenueCat association.

**Requirements:**
- Simple email input field with validation
- On submit, initiate Supabase Auth email OTP flow
- Show "Check your email" screen with OTP input
- On successful authentication, create parent record in local SQLite database with Supabase user ID
- Store parent ID in session storage for subsequent screens
- Navigate to Add Children screen after successful authentication
- Display terms and privacy policy link

### SQLite Database Schema

All data is stored locally in SQLite. The database is initialized on app startup.

**Database Tables:**

1. **parents** - Parent account information
   - id (TEXT PRIMARY KEY) - Supabase Auth user ID
   - email (TEXT NOT NULL)
   - created_at (TEXT NOT NULL)
   - subscription_status (TEXT DEFAULT 'none') - Values: 'none', 'trial', 'active', 'cancelled', 'expired'
   - settings (TEXT DEFAULT '{}') - JSON string for app preferences

2. **children** - Child profiles
   - id (TEXT PRIMARY KEY)
   - parent_id (TEXT NOT NULL, FOREIGN KEY)
   - name (TEXT NOT NULL)
   - age (INTEGER NOT NULL)
   - created_at (TEXT NOT NULL)
   - current_level (INTEGER DEFAULT 1)
   - total_cards_completed (INTEGER DEFAULT 0)

3. **card_progress** - SM-2 spaced repetition tracking
   - id (TEXT PRIMARY KEY)
   - child_id (TEXT NOT NULL, FOREIGN KEY)
   - word (TEXT NOT NULL)
   - ease_factor (REAL DEFAULT 2.5) - SM-2 algorithm parameter
   - interval_days (INTEGER DEFAULT 0) - Days until next review
   - next_review_at (TEXT NOT NULL) - ISO timestamp
   - attempts (INTEGER DEFAULT 0)
   - successes (INTEGER DEFAULT 0)
   - last_seen_at (TEXT)
   - UNIQUE constraint on (child_id, word)

4. **content_cache** - Generated content storage
   - id (TEXT PRIMARY KEY)
   - content_type (TEXT NOT NULL) - Values: 'word', 'image', 'audio', 'lesson'
   - content_key (TEXT NOT NULL) - Unique identifier for content
   - content_data (TEXT NOT NULL) - JSON string or base64 encoded data
   - file_path (TEXT) - Local file system path if applicable
   - created_at (TEXT NOT NULL)
   - expires_at (TEXT) - Optional expiration timestamp
   - UNIQUE constraint on (content_type, content_key)

5. **sessions** - Learning session history
   - id (TEXT PRIMARY KEY)
   - child_id (TEXT NOT NULL, FOREIGN KEY)
   - started_at (TEXT NOT NULL)
   - ended_at (TEXT)
   - cards_completed (INTEGER DEFAULT 0)
   - duration_seconds (INTEGER DEFAULT 0)

**Indexes:**
- idx_card_progress_child on card_progress(child_id)
- idx_card_progress_review on card_progress(next_review_at)
- idx_sessions_child on sessions(child_id)
- idx_content_cache_type on content_cache(content_type, content_key)

### Supabase Services

**Supabase Auth:**
- Parent authentication via email OTP
- User session management
- Secure token storage

**Supabase Edge Functions (LLM Proxy Only):**
- Used ONLY for proxying LLM API calls
- No user data is sent to Edge Functions beyond what's necessary for LLM requests

**Architecture:**
- All LLM API calls (Gemini 3 Flash, OpenAI, Nano Banana) are proxied through Supabase Edge Functions
- API keys are stored server-side in Edge Functions, never exposed to the client
- Client makes HTTPS requests to Edge Function endpoints with only the necessary parameters

**Required Edge Functions:**

1. **generate-word** - Calls Gemini 3 Flash to generate appropriate words
   - Input: targetSounds, knownSounds, difficulty
   - Output: word, phonemes array, imagePrompt

2. **generate-image** - Calls Nano Banana to generate word images
   - Input: imagePrompt
   - Output: imageBase64

3. **voice-session** - Manages OpenAI Realtime Voice API sessions
   - Input: session parameters
   - Output: WebSocket connection details or session ID

### Screen 2: Add Children

**Requirements:**
- Allow adding one or more children with name and age
- Age selector with options: 3, 4, 5, 6, 7, 8 years old
- Ability to add additional children (button to add more)
- Ability to remove children if more than one is added
- Save all children to local SQLite database with parent_id foreign key
- Each child initialized with current_level = 1 and total_cards_completed = 0
- Continue button disabled until at least one child has a valid name
- Navigate to Subscription screen after successful save

### Screen 3: Subscription (RevenueCat)

**Requirements:**
- Display subscription pricing: 3 days free trial, then $99/month
- Show feature list with checkmarks
- Integrate with RevenueCat for in-app purchase handling
- On successful purchase, update parent's subscription_status in local SQLite to 'active'
- Navigate to main app after successful subscription
- Display legal text about payment and auto-renewal
- Handle purchase cancellation and errors gracefully

### RevenueCat Setup

**Requirements:**
- Initialize RevenueCat SDK with platform-specific API keys (iOS/Android)
- Associate purchases with parent user ID
- Check subscription status via RevenueCat entitlements
- Handle subscription state changes and updates

---

## Parental Gate

The settings screen (for managing children) is protected by a parental gate to prevent children from accidentally accessing or modifying parent-only features.

### Parental Gate Component

**Requirements:**
- Display a simple math problem (addition of two 2-digit numbers, e.g., 15 + 8)
- Generate 4 answer options: 1 correct answer + 3 incorrect answers
- Randomize the order of answer options
- On correct answer: unlock settings screen after brief delay
- On incorrect answer: show "try again" message, allow retry
- Provide cancel button to return to previous screen
- Modal overlay design with centered modal dialog

### Settings Screen with Parental Gate

**Requirements:**
- Show parental gate modal on first access
- After gate is unlocked, display settings screen
- List all children with name, age, and current level
- Allow editing child information
- Allow adding additional children
- Account section with subscription management and sign out options
- Accessible via gear icon on child selection screen

---

## Spaced Repetition System

### SM-2 Algorithm Implementation

The app uses a modified SM-2 algorithm (SuperMemo 2) to determine when to resurface cards the child struggled with.

**Quality Rating System (0-5):**
- 0 - Complete failure (couldn't say word after 3 tries)
- 1 - Major struggle (needed help)
- 2 - Minor struggle (2-3 attempts)
- 3 - Correct with hesitation
- 4 - Correct with minor hesitation
- 5 - Perfect (first try)

**Algorithm Logic:**
- If quality < 3 (failed): Reset repetitions to 0, set interval to 1 day (show again in next session)
- If quality >= 3 (passed): 
  - First review (repetitions = 0): interval = 1 day
  - Second review (repetitions = 1): interval = 3 days
  - Subsequent reviews: interval = previous interval × ease factor (rounded)
  - Increment repetitions

**Ease Factor Calculation:**
- Starts at 2.5 (default)
- Updated based on quality: `easeFactor = max(1.3, easeFactor + (0.1 - (5 - quality) × (0.08 + (5 - quality) × 0.02)))`
- Higher quality ratings increase ease factor, lower ratings decrease it
- Minimum ease factor is 1.3

**Output:**
- nextInterval: Days until next review
- nextEaseFactor: Updated ease factor
- nextRepetitions: Updated repetition count
- nextReviewDate: Calculated date for next review

### Card Queue Manager

**Purpose:** Manages the queue of cards to present to the child, prioritizing review cards over new cards.

**Queue Building Logic:**
1. **Due Review Cards (Highest Priority)**
   - Query local SQLite for cards where `next_review_at <= now`
   - Limit to 5 review cards per session
   - Retrieve cached word data and images from content_cache table
   - Priority: 0 (highest)

2. **New Cards (Lower Priority)**
   - Generate 10 new cards appropriate for child's current level
   - Use Supabase Edge Function to call Gemini 3 Flash for word generation
   - Use Supabase Edge Function to call Nano Banana for image generation
   - Cache word data and images locally in SQLite and file system
   - Exclude words already seen by this child
   - Priority: 10+ (incremented by index)

3. **Queue Sorting**
   - Sort by priority (lower = higher priority)
   - Review cards always shown before new cards

**Card Generation:**
- Generate words via LLM proxy (Gemini 3 Flash) based on level configuration
- Generate images via LLM proxy (Nano Banana) using word's image prompt
- Store word metadata in content_cache table
- Save images to local file system
- Track file paths in content_cache for retrieval

**Progress Recording:**
- Record child's performance (quality rating 0-5) for each card
- Calculate next review date using SM-2 algorithm
- Update card_progress table in local SQLite
- Track attempts and successes
- Check for level-up conditions after successful reviews (quality >= 4)

**Level-Up Logic:**
- Check if child has mastered enough words (ease_factor >= 2.5 AND interval_days >= 7)
- Compare count to level's mastery threshold
- If threshold met, increment child's current_level in SQLite

### Level Configuration

**Level Structure:**
Each level configuration includes:
- level: Level number (1-100+)
- knownSounds: Array of phonemes/sounds the child has learned
- pattern: Word pattern description (e.g., "CVC with a", "Multi-syllable words")
- difficulty: Numeric difficulty rating (1-10)
- masteryThreshold: Number of cards to master before advancing to next level
- description: Human-readable description of the level

**Progression Example:**
- Level 1: Basic CVC words with short 'a' (sounds: a, s, m, t), threshold: 10 cards
- Level 2: CVC words with 'a' and 'e' (adds: e, r, d), threshold: 15 cards
- Level 3: More CVC words with 'i' (adds: i, n, c), threshold: 20 cards
- ... continues through ~50+ levels covering full DISTAR progression
- Level 50+: Complex multi-syllable words, threshold: 50+ cards

Each level introduces new sounds and patterns systematically, following the DISTAR methodology.

### Quality Rating from Voice Interaction

**Mapping Logic:**
Map OpenAI Realtime API results to SM-2 quality ratings (0-5):

- **Failed attempts:**
  - Needed help: Quality = 1 (Major struggle)
  - Failed after 3 tries without help: Quality = 0 (Complete failure)

- **Successful attempts:**
  - 1 attempt: Quality = 5 (Perfect - first try)
  - 2 attempts: Quality = 4 (Good - minor hesitation)
  - 3 attempts: Quality = 3 (Okay - some struggle)

---

## Endless Card Generation

### Main Learning Screen

**Requirements:**
- Initialize card queue manager for the selected child
- Connect to OpenAI Realtime Voice API
- Display current card with blurred image and word
- Handle card progression: load next card from queue
- Pre-generate next few cards in background for smooth experience
- Track attempts and success/failure
- On success: reveal image, record quality rating, advance to next card after celebration
- On failure (3 attempts): record quality rating, queue for review, advance to next card
- On help requested: record quality rating, reveal image, advance to next card
- Show review badge for cards being reviewed
- Provide minimal exit button to return to child selection

### Card Display Cycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ENDLESS CARD CYCLE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                      CARD DISPLAYED                          │    │
│  │                                                              │    │
│  │    ┌─────────────────────┐   ┌─────────────────────────┐    │    │
│  │    │   ░░░░░░░░░░░░░░   │   │                         │    │    │
│  │    │   ░░░ BLURRED ░░░   │   │        c a t            │    │    │
│  │    │   ░░░░░░░░░░░░░░   │   │        ●─●─●──▶          │    │    │
│  │    └─────────────────────┘   └─────────────────────────┘    │    │
│  │                                                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                 CHILD SWIPES & SPEAKS                        │    │
│  │                                                              │    │
│  │    OpenAI Realtime API listens...                           │    │
│  │                                                              │    │
│  │    Correct? ─────────────────────────────────────────────┐  │    │
│  │         │                                                 │  │    │
│  │         ▼                                                 ▼  │    │
│  │    ┌─────────┐  Attempts < 3?  ┌─────────┐  3 Fails      │  │    │
│  │    │ SUCCESS │◀──── No ────────│ RETRY   │───────────────┘  │    │
│  │    │         │                 │         │                   │    │
│  │    │ Quality │       Yes       │ Quality │      ┌─────────┐ │    │
│  │    │  4 or 5 │        │        │  3      │      │  HELP   │ │    │
│  │    └────┬────┘        │        └────┬────┘      │ Quality │ │    │
│  │         │             │             │           │  0 or 1 │ │    │
│  │         │             └─────────────┘           └────┬────┘ │    │
│  │         │                                            │      │    │
│  └─────────┼────────────────────────────────────────────┼──────┘    │
│            │                                            │           │
│            ▼                                            ▼           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   SPACED REPETITION UPDATE                   │    │
│  │                                                              │    │
│  │   Quality 4-5: interval ×2.5, show in days/weeks            │    │
│  │   Quality 3: interval ×1.5, show in 1-3 days                │    │
│  │   Quality 0-2: interval = 0, add to review queue NOW        │    │
│  │                                                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                      NEXT CARD                               │    │
│  │                                                              │    │
│  │   Queue priority:                                            │    │
│  │   1. Due review cards (struggled words)                      │    │
│  │   2. New cards at current level                              │    │
│  │                                                              │    │
│  │   If doing well → gradually increase level                   │    │
│  │   If struggling → stay at level, more reviews                │    │
│  │                                                              │    │
│  └───────────────────────────────────────┬─────────────────────┘    │
│                                          │                           │
│                                          └───────────▶ REPEAT ∞     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Feature Specifications

### 1. Lesson Delivery System

#### Scripted Prompts
```
┌────────────────────────────────────────────┐
│  PARENT SCRIPT PANEL                       │
├────────────────────────────────────────────┤
│  "Point to the letter."                    │
│  "Here's a new sound. I'm going to touch   │
│   under this sound and say the sound."     │
│                                            │
│  [Touch first ball] → Hold → "eeeeee"      │
│                                            │
│  ▶ [Play Audio Demo]  ⏭ [Next Step]       │
└────────────────────────────────────────────┘
```

#### Delivery Elements (from the book)
- **Focus** - Directs attention with visual highlight + audio cue
- **Wait Time** - Built-in 3-second pauses with visual countdown
- **Cue/Signal** - Animated "Get ready" + signal indicator
- **Confirmation** - "Yes, [sound]!" with celebratory feedback

### 2. Special Orthography Rendering

The app must render the unique DISTAR orthography:

| Element | Description | Visual Representation |
|---------|-------------|----------------------|
| **Macrons** | Line over long vowels | ā, ē, ī, ō, ū |
| **Small letters** | Silent/reduced sounds | Small superscript letters |
| **Balls** | Touch points under letters | ● symbols for continuous sounds |
| **Arrows** | Direction indicators | → with > for quick sounds |
| **Joined letters** | Sound combinations | ar, th, sh rendered as units |

#### Custom Font Requirements
- Create custom font or SVG rendering system
- Support for:
  - Ball indicators (●) under continuous sounds
  - Arrow indicators (→) with quick-sound markers (>)
  - Variable letter sizing for emphasis
  - Macron diacritics for long vowels

### 3. Sound Types Implementation

#### Continuous Sounds
- Can be held for 3 seconds
- Displayed with ball (●) underneath
- Script shows: `aaa` (repeated letters)
- Audio stretches the sound

```
     a
   ●───●───
```

#### Stop/Quick Sounds
- Said quickly and quietly
- Displayed with arrow (>) underneath
- Script shows single letter: `d`
- Audio is crisp and short

```
     d
   ●─────→
     >
```

### 4. Interactive Word Reading

#### Sounding Out Process
```
Step 1: Touch first ball
        "Sound it out"

Step 2: Child drags finger/follows animated pointer
        r → a → m
        "rrraaammm"

Step 3: Return to start
        "Say it fast"

Step 4: Slide quickly
        "ram!"

Step 5: Confirmation
        "Yes, what word? Ram. Good reading!"
```

#### Touch Interaction Modes
1. **Parent-guided**: Parent touches, child responds verbally
2. **Child-touch**: Child traces the arrow path
3. **Auto-animated**: App demonstrates with highlighting

### 5. Speech Recognition Integration

#### Use Cases
- Verify child's sound production
- Auto-advance when correct response detected
- Track accuracy metrics

#### Implementation Considerations
- Offline-capable speech recognition
- Child voice optimization
- Phoneme-level detection (not just word-level)
- Tolerance settings for pronunciation variations

#### Fallback System
- Manual "Correct/Try Again" buttons for parent
- Skip speech recognition in noisy environments
- Parent confirmation mode

### 6. Error Correction System

Based on the book's correction procedure:

```
┌─────────────────────────────────────────┐
│  ERROR DETECTED                         │
├─────────────────────────────────────────┤
│  1. "My turn." [Model correct sound]    │
│  2. "Your turn. Get ready."             │
│  3. [Signal] → Wait for response        │
│  4. "Yes, [correct answer]."            │
│  5. "Starting over." [Return to start]  │
└─────────────────────────────────────────┘
```

### 7. Progress & Gamification

#### Lesson Completion Tracking
- Star ratings per lesson (based on accuracy)
- Streak counters for daily practice
- Visual map showing journey through 100 lessons

#### Reward System
- Unlockable characters/themes
- Achievement badges
- Celebration animations
- Parent-configurable rewards

#### Mastery Gates
- Minimum 80% accuracy to unlock next lesson
- Review lessons auto-suggested when struggling
- "Firm-up" activities for problem sounds

---

## AI Content Generation System

### Overview

The app leverages AI to dynamically generate educational content, ensuring unlimited practice material while maintaining pedagogical integrity.

### 1. AI Word Generation

#### Word Generation Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AI WORD GENERATION PIPELINE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │  Lesson      │───▶│  LLM API     │───▶│  Word Validation     │   │
│  │  Parameters  │    │  (GPT-4/     │    │  Engine              │   │
│  │              │    │   Claude)    │    │                      │   │
│  │  • Sounds    │    │              │    │  • Phoneme check     │   │
│  │  • Patterns  │    │  Generate    │    │  • Age-appropriate   │   │
│  │  • Level     │    │  candidate   │    │  • Decodable verify  │   │
│  │  • Excluded  │    │  words       │    │  • Difficulty score  │   │
│  └──────────────┘    └──────────────┘    └──────────┬───────────┘   │
│                                                      │               │
│                                          ┌───────────▼───────────┐   │
│                                          │  Word Bank Storage    │   │
│                                          │  (Cached + Generated) │   │
│                                          └───────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

#### Google Gemini 3 Flash Integration

**Word Generation Requirements:**
- Call Gemini 3 Flash via Supabase Edge Function (LLM proxy)
- Generate decodable words based on child's known sounds and current level
- Input parameters: knownSounds array, targetPattern, count, difficulty, excludeWords
- Output: Array of words with phonemes, syllables, pattern, difficulty, and imagePrompt
- Prompt engineering: Ensure words use only known sounds, are age-appropriate, real English words
- Return structured JSON response

**Story Generation Requirements:**
- Generate simple stories using only words the child has learned
- Input: knownWords array, theme, maxSentences
- Output: Story text with comprehension questions
- Style: Simple, engaging, short sentences (3-6 words), clear narrative structure
- Age-appropriate for 4-6 year olds

#### Word Validation Rules

| Rule | Implementation | Example |
|------|----------------|---------|
| **Decodability** | Check all phonemes against learned sounds | "cat" OK if c, a, t learned |
| **Age Filter** | Cross-reference child-friendly word list | Filter adult concepts |
| **Phoneme Mapping** | Verify spelling-sound correspondence | "phone" needs 'ph' sound |
| **Difficulty Scoring** | Length + pattern complexity + frequency | "at" = 1, "strap" = 6 |

### 2. AI Image Generation

#### Image Generation for Words and Stories

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AI IMAGE GENERATION SYSTEM                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Word: "cat"                                                         │
│       │                                                              │
│       ▼                                                              │
│  ┌────────────────┐                                                  │
│  │ Prompt Engine  │                                                  │
│  │                │                                                  │
│  │ "A friendly    │    ┌─────────────────┐    ┌──────────────────┐  │
│  │  cartoon cat,  │───▶│  Image AI API   │───▶│  Post-Processing │  │
│  │  simple flat   │    │  (DALL-E 3 /    │    │                  │  │
│  │  illustration, │    │   Midjourney /  │    │  • Resize        │  │
│  │  child-        │    │   Stable        │    │  • Optimize      │  │
│  │  friendly,     │    │   Diffusion)    │    │  • Cache         │  │
│  │  white bg..."  │    └─────────────────┘    └──────────────────┘  │
│  └────────────────┘                                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Image Style Guidelines

**Style Requirements:**
- Simple, clean illustration style
- Flat colors, minimal shading
- Friendly, approachable characters
- White or simple solid background
- No text in the image
- Age-appropriate (preschool/kindergarten)
- Consistent art style across all images
- High contrast for visibility

**Avoid:**
- Scary or threatening imagery
- Complex busy backgrounds
- Realistic photographic style
- Any text or letters

**Prompt Generation:**
- Base prompt: "A simple, friendly cartoon illustration of a [word]"
- Add context if provided
- Append style requirements to ensure consistency

#### Google Nano Banana Integration

**Image Generation Requirements:**
- Call Nano Banana (via Gemini API) via Supabase Edge Function (LLM proxy)
- Use model: `gemini-2.5-flash-image` (Nano Banana) or `gemini-3-pro-image-preview` (Nano Banana Pro) for higher quality
- Generate images based on word and imagePrompt from word generation
- Input parameters: word, imagePrompt (optional), style, aspectRatio
- Apply base style prompt for consistency (friendly children's book illustration style)
- Support for text-to-image generation, image editing, and multi-image blending
- High-fidelity text rendering capabilities
- Output: base64 encoded image data or inline image data
- Batch generation support for pre-loading multiple images with rate limiting

#### Nano Banana Advantages for This Use Case

| Feature | Benefit |
|---------|---------|
| **Integrated with Gemini API** | Single API for both text and image generation |
| **Fast Generation** | Nano Banana optimized for speed and efficiency (low latency) |
| **High-Fidelity Text** | Can render legible text in images (useful for word cards) |
| **Consistent Style** | Better prompt following for uniform look |
| **Cost Effective** | Competitive pricing for educational apps |
| **Image Editing** | Can edit existing images if needed |

#### Pre-Generation Strategy (Look-Ahead Caching)

Since image generation takes several seconds, implement aggressive pre-generation:

**Configuration:**
- Pre-generate next 5 lessons ahead
- Generate in batches of 20 words
- Check generation queue every 5 minutes
- Priority queue: current lesson words first

**Background Generation Process:**
- Run in background thread during app usage
- Generate images for current lesson + next N lessons
- Check cache before generating to avoid duplicates
- Queue items with priority based on lesson proximity
- Process queue with error handling and retry logic
- On lesson advance, trigger immediate pre-generation for next lesson

#### Image Pre-Loading Timeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                 IMAGE PRE-GENERATION TIMELINE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Child Progress:  [Lesson 15] ──▶ [Lesson 16] ──▶ [Lesson 17]       │
│                        │                                             │
│                        ▼                                             │
│  Pre-Gen Status:                                                     │
│                                                                      │
│  Lesson 15: ████████████ 100% (in use)                              │
│  Lesson 16: ████████████ 100% (ready)                               │
│  Lesson 17: ████████░░░░  75% (generating)                          │
│  Lesson 18: ████░░░░░░░░  35% (queued)                              │
│  Lesson 19: ░░░░░░░░░░░░   0% (scheduled)                           │
│                                                                      │
│  Storage: 45MB / 200MB cache limit                                  │
│  Oldest cached: Lesson 10 (will evict if needed)                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Blurred Image Reveal System

Images are initially blurred and revealed only after successful word completion:

```dart
class BlurredImageReveal extends StatefulWidget {
  final String word;
  final String imageUrl;
  final bool isRevealed;
  final VoidCallback onRevealComplete;

  const BlurredImageReveal({
    required this.word,
    required this.imageUrl,
    required this.isRevealed,
    required this.onRevealComplete,
  });

  @override
  State<BlurredImageReveal> createState() => _BlurredImageRevealState();
}

class _BlurredImageRevealState extends State<BlurredImageReveal>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _blurAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    // Animate from heavily blurred to clear
    _blurAnimation = Tween<double>(
      begin: 20.0,  // Heavy blur
      end: 0.0,     // No blur (clear)
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    ));
  }

  void reveal() {
    _controller.forward().then((_) {
      widget.onRevealComplete();
      // Play celebration sound
      AudioPlayer().play(AssetSource('sounds/reveal_success.mp3'));
    });
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _blurAnimation,
      builder: (context, child) {
        return Stack(
          children: [
            // The image with blur filter
            ImageFiltered(
              imageFilter: ImageFilter.blur(
                sigmaX: _blurAnimation.value,
                sigmaY: _blurAnimation.value,
              ),
              child: Image.network(
                widget.imageUrl,
                fit: BoxFit.contain,
              ),
            ),

            // Question mark overlay (fades out during reveal)
            if (_blurAnimation.value > 5)
              Center(
                child: Opacity(
                  opacity: (_blurAnimation.value / 20).clamp(0.0, 1.0),
                  child: Icon(
                    Icons.help_outline,
                    size: 80,
                    color: Colors.white.withOpacity(0.7),
                  ),
                ),
              ),

            // "Swipe to see!" hint
            if (!widget.isRevealed)
              Positioned(
                bottom: 20,
                left: 0,
                right: 0,
                child: Text(
                  "Read the word to see the picture!",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    shadows: [Shadow(blurRadius: 4)],
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}
```

#### Blur Reveal Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BLUR REVEAL INTERACTION FLOW                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STEP 1: Word Presented                                              │
│  ┌──────────────────────┐  ┌──────────────────────┐                 │
│  │                      │  │   ░░░░░░░░░░░░░░░░   │                 │
│  │      c a t           │  │   ░░░░░ ? ░░░░░░░   │  ◀── Blurred    │
│  │      ●─●─●──▶        │  │   ░░░░░░░░░░░░░░░░   │      Image      │
│  │                      │  │   "Read to see!"     │                 │
│  └──────────────────────┘  └──────────────────────┘                 │
│                                                                      │
│  STEP 2: Child Swipes & Pronounces                                   │
│  ┌──────────────────────┐  ┌──────────────────────┐                 │
│  │                      │  │   ░░░░░░░░░░░░░░░░   │                 │
│  │      c a t           │  │   ░░░░░░░░░░░░░░░░   │  ◀── Still     │
│  │      ●━●━●━━▶ ✓      │  │   ░░░░░░░░░░░░░░░░   │      Blurred   │
│  │   "caaaat!"          │  │                      │                 │
│  └──────────────────────┘  └──────────────────────┘                 │
│                                                                      │
│  STEP 3: Pronunciation Verified → Image Reveals!                     │
│  ┌──────────────────────┐  ┌──────────────────────┐                 │
│  │                      │  │                      │                 │
│  │   ✓ c a t ✓          │  │      🐱              │  ◀── Clear!    │
│  │                      │  │    (cute cat)        │                 │
│  │   "Great job!"       │  │                      │                 │
│  └──────────────────────┘  └──────────────────────┘                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. OpenAI Realtime Voice API Integration

The app uses OpenAI's Realtime Voice API as the core interaction layer, enabling natural voice conversations with tool calling for lesson control and dynamic context ingestion.

#### Why OpenAI Realtime API?

| Feature | Benefit for Reading App |
|---------|------------------------|
| **Real-time Voice** | Natural, low-latency interaction with children |
| **Tool Calling** | Control lesson flow, reveal images, track progress |
| **Context Ingestion** | Dynamically provide current word, lesson context |
| **Voice Detection** | Automatic speech detection, no button needed |
| **Natural Responses** | Warm, encouraging teacher-like feedback |

#### Realtime API Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│              OPENAI REALTIME VOICE API INTEGRATION                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                     REACT NATIVE APP                         │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │    │
│  │  │  Microphone │  │   Speaker   │  │   Lesson State      │  │    │
│  │  │   Input     │  │   Output    │  │   Manager           │  │    │
│  │  └──────┬──────┘  └──────▲──────┘  └──────────┬──────────┘  │    │
│  │         │                │                     │             │    │
│  └─────────┼────────────────┼─────────────────────┼─────────────┘    │
│            │                │                     │                  │
│            ▼                │                     ▼                  │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              WEBSOCKET CONNECTION (wss://)                   │    │
│  │                                                              │    │
│  │   Audio Stream ──────▶  OPENAI REALTIME API  ──────▶ Audio   │    │
│  │   (PCM 16-bit)          - Speech Recognition      (PCM 16-bit)   │
│  │                         - GPT-4o Processing                  │    │
│  │   Tool Results ◀──────  - Voice Synthesis    ◀────── Tools   │    │
│  │                         - Tool Calling                       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                    │                                 │
│                                    ▼                                 │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    AVAILABLE TOOLS                           │    │
│  │                                                              │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │    │
│  │  │ validate_    │  │ reveal_      │  │ advance_to_      │   │    │
│  │  │ pronunciation│  │ image        │  │ next_word        │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘   │    │
│  │                                                              │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │    │
│  │  │ record_      │  │ play_        │  │ get_lesson_      │   │    │
│  │  │ attempt      │  │ phoneme      │  │ context          │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘   │    │
│  │                                                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Realtime API Implementation

**Service Requirements:**
- Connect to OpenAI Realtime API via Supabase Edge Function (LLM proxy)
- Initialize RealtimeClient with appropriate model
- Set up tool calling for app control: validate_pronunciation, reveal_image, advance_to_next_word, record_attempt, play_phoneme
- Inject lesson context so AI knows expected word and phonemes
- Configure AI persona: warm, patient, encouraging teacher voice
- Handle conversation updates and errors
- Support connection/disconnection lifecycle

**Tool Definitions:**
- validate_pronunciation: Check if child said word correctly, return confidence and correctness
- reveal_image: Reveal blurred image after correct pronunciation, with celebration level
- advance_to_next_word: Move to next word, mark current as completed/needs review
- record_attempt: Track pronunciation attempts for analytics
- play_phoneme: Play specific phoneme sound to help child

**AI Persona Configuration:**
- Voice: Warm, friendly (e.g., 'shimmer')
- Turn detection: Server-side VAD with appropriate thresholds
- Instructions: Guide child through reading, celebrate successes, encourage retries (max 3 attempts), keep responses short (1-2 sentences)

#### React Native Integration

**Hook Requirements:**
- Create useRealtimeVoice hook to manage voice service lifecycle
- Initialize RealtimeVoiceService on mount, cleanup on unmount
- Handle tool calls from AI: validate_pronunciation, reveal_image, advance_to_next_word, play_phoneme, record_attempt
- Connect to voice service and manage connection state
- Inject lesson context when word changes
- Start/stop listening for child's voice
- Return connection state and control functions

#### Audio Streaming Setup (React Native)

**Requirements:**
- Configure audio session for recording and playback
- Set up audio recording with appropriate format (WAV, 24kHz, mono, 16-bit PCM)
- Stream audio chunks to Realtime API in real-time
- Handle audio playback from Realtime API responses
- Manage audio session interruptions and background behavior
- Support both iOS and Android audio configurations
        }
      },
      100 // Update interval in ms
    );

    this.recording = recording;
  }

  async stopRecording() {
    if (this.recording) {
      await this.recording.stopAndUnloadAsync();
      this.recording = null;
    }
  }

  async playAudioChunk(base64Audio: string) {
    const { sound } = await Audio.Sound.createAsync({
      uri: `data:audio/wav;base64,${base64Audio}`,
    });
    await sound.playAsync();
  }
}
```

#### Pronunciation Validation Implementation

**Validation Requirements:**
- Compare child's pronunciation (transcript + phonemes) to expected word
- Calculate match score using phoneme-level and word-level comparison
- Weighted scoring: 70% phoneme match, 30% word similarity
- Allow for common phoneme confusions in children (e.g., 'th' → 'f'/'s', 'r' → 'w')
- Default acceptance threshold: 70% match
- Maximum attempts: 3 per word

**Outcome Actions:**
- Success (≥70% match): Reveal image, play success feedback, advance to next word
- Retry (<70% match, attempts < 3): Play encouraging prompt, model correct pronunciation, listen again
- Help (3 attempts reached): Model word slowly, sound out phonemes, say together, then move on

#### Voice Prompts for Retry System

**Prompt Categories:**
- Attempt 1: "Let's try that again!", "Almost! Try one more time!", "Good try! Let's do it again!"
- Attempt 2: "You're getting closer! One more try!", "Nice effort! Let's try once more!", "Keep going! Try again!"
- Max Attempts: "Great effort! Let me help you...", "Good try! Let me show you...", "That's a tricky one! Here's how it sounds..."
- Success: "Yes! That's right!", "Great job! You got it!", "Perfect! Well done!", "Excellent reading!"

**Retry Sequence:**
1. Play random encouraging prompt from appropriate category
2. Model correct pronunciation slowly and clearly
3. Wait for child's next attempt

**Help Sequence (after 3 attempts):**
1. Encouraging message acknowledging effort
2. Model word slowly: "The word is: [word]"
3. Sound out each phoneme with stretched pronunciation
4. Prompt: "Now let's say it together!"
5. Final model of complete word

#### Retry Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PRONUNCIATION RETRY FLOW                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐                                                 │
│  │  Word Presented │                                                 │
│  │     "cat"       │                                                 │
│  └────────┬────────┘                                                 │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────┐      ┌─────────────────────────────────────┐   │
│  │  Child Swipes & │      │  "caaaat!" (child's pronunciation)  │   │
│  │  Pronounces     │─────▶│                                     │   │
│  └─────────────────┘      └──────────────────┬──────────────────┘   │
│                                              │                       │
│                                              ▼                       │
│                           ┌──────────────────────────────────┐      │
│                           │      PRONUNCIATION CHECK          │      │
│                           │                                   │      │
│                           │   Expected: /k/ /æ/ /t/          │      │
│                           │   Heard:    /k/ /æ/ /t/          │      │
│                           │   Match:    95% ✓                │      │
│                           └─────────────┬────────────────────┘      │
│                                         │                            │
│              ┌──────────────────────────┼───────────────────┐        │
│              │                          │                   │        │
│              ▼                          ▼                   ▼        │
│  ┌───────────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │    ≥70% MATCH     │    │    <70% MATCH    │    │   3 STRIKES  │  │
│  │                   │    │   Attempts < 3   │    │              │  │
│  │   🎉 SUCCESS!     │    │                  │    │   🤝 HELP    │  │
│  │                   │    │   🔄 TRY AGAIN   │    │              │  │
│  │ • Play "Great!"   │    │                  │    │ • Model word │  │
│  │ • Reveal image    │    │ • Play prompt    │    │ • Sound out  │  │
│  │ • Award star      │    │ • Model word     │    │ • Say it     │  │
│  │ • Next word       │    │ • Listen again   │    │   together   │  │
│  │                   │    │                  │    │ • Then move  │  │
│  └───────────────────┘    └──────────────────┘    │   on         │  │
│                                    │              └──────────────┘  │
│                                    │                                 │
│                                    └──────────────┐                  │
│                                                   │                  │
│                                                   ▼                  │
│                           ┌──────────────────────────────────┐      │
│                           │      ATTEMPT 2 / ATTEMPT 3        │      │
│                           │                                   │      │
│                           │  Voice: "Almost! Try once more!"  │      │
│                           │  Model: "cat" (slow, clear)       │      │
│                           │  [Listening for response...]      │      │
│                           └──────────────────────────────────┘      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

#### Pronunciation Detection Services (React Native)

**Requirements:**
- Use speech recognition library (e.g., react-native-voice) for child speech detection
- Configure child-optimized settings: longer minimum input length, extended silence detection
- Start/stop listening based on interaction state
- Convert transcript to phonemes using pronunciation dictionary (e.g., CMU Pronouncing Dictionary)
- Handle speech recognition errors gracefully
- Return pronunciation result with transcript, confidence, phonemes, and match score

#### Parent Override Option

**Requirements:**
- Provide parent controls for manual intervention when speech recognition fails
- Options: Approve (mark as correct), Retry (prompt child to try again), Skip (move to next word)
- Accessible via parental gate or hidden gesture
- Allow parents to help when technology isn't working perfectly
          <Text>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
```

### 4. AI Audio/Speech Generation

#### Voice Synthesis via OpenAI Realtime API

The OpenAI Realtime API handles all voice synthesis (text-to-speech), eliminating the need for separate TTS services:

| Capability | OpenAI Realtime Implementation |
|------------|-------------------------------|
| **Instructor Voice** | Built-in voice selection (shimmer, alloy, echo, etc.) |
| **Natural Responses** | GPT-4o generates contextual, encouraging feedback |
| **Low Latency** | Real-time streaming, <300ms response time |
| **Pronunciation Modeling** | AI can "say" the word to model correct pronunciation |
| **Dynamic Responses** | No pre-recorded audio needed - generates on the fly |

**Voice Options for Children's App:**
- `shimmer` - Warm, friendly, recommended for teaching
- `alloy` - Neutral, clear
- `nova` - Energetic, encouraging

#### Phoneme Audio Requirements

```python
PHONEME_AUDIO_SPECS = {
    "continuous_sounds": {
        # Sounds that can be stretched
        "a": {"short": "a_short.mp3", "long": "a_stretched_3sec.mp3"},
        "e": {"short": "e_short.mp3", "long": "e_stretched_3sec.mp3"},
        "s": {"short": "s_short.mp3", "long": "s_stretched_3sec.mp3"},
        "m": {"short": "m_short.mp3", "long": "m_stretched_3sec.mp3"},
        "f": {"short": "f_short.mp3", "long": "f_stretched_3sec.mp3"},
        # ... all continuous sounds
    },
    "stop_sounds": {
        # Quick sounds - no stretched version
        "d": {"quick": "d_quick.mp3"},
        "t": {"quick": "t_quick.mp3"},
        "b": {"quick": "b_quick.mp3"},
        "p": {"quick": "p_quick.mp3"},
        # ... all stop sounds
    }
}
```

#### AI Voice via OpenAI Realtime API

**Voice Configuration:**
- OpenAI Realtime API provides built-in voice selection (shimmer, alloy, echo, etc.)
- No separate voice cloning service needed
- Consistent instructor voice achieved through API voice selection and prompt engineering
- Voice parameters (tone, speed, emotion) controlled via API instructions

### 4. AI-Powered Content Pipeline

#### Complete Generation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│              LESSON CONTENT GENERATION PIPELINE                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  LESSON DEFINITION (Human-authored)                                  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Lesson 15:                                                    │   │
│  │   new_sounds: ["th"]                                          │   │
│  │   review_sounds: ["a", "s", "m", "t", "e", "r", "d"]         │   │
│  │   word_patterns: ["CVC", "words with 'th'"]                   │   │
│  │   story_theme: "A cat that sits"                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              AI GENERATION LAYER                              │   │
│  │                                                               │   │
│  │  1. Generate word list ──────────▶ [that, this, them, math]  │   │
│  │  2. Generate images for words ───▶ [🖼️] [🖼️] [🖼️] [🖼️]       │   │
│  │  3. Generate story text ─────────▶ "the cat sat on the mat"  │   │
│  │  4. Generate story illustration ─▶ [🖼️ scene]                │   │
│  │  5. Generate all audio ──────────▶ [🔊] instructions + words │   │
│  │  6. Generate comprehension Q's ──▶ ["Where did the cat sit?"]│   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              VALIDATION & REVIEW                              │   │
│  │                                                               │   │
│  │  • Automated checks (decodability, age-appropriate)          │   │
│  │  • Human review queue for flagged content                     │   │
│  │  • A/B testing for effectiveness                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              CONTENT DELIVERY                                 │   │
│  │                                                               │   │
│  │  • Pre-cached in app bundle (core content)                   │   │
│  │  • Downloaded on-demand (supplemental practice)               │   │
│  │  • Real-time generation (adaptive difficulty)                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Interactive Swipe Detection

### Core Interaction: Swiping Under Words

The signature interaction is the child swiping their finger under words while sounding out, mimicking the "touch and slide" technique from the book.

### 1. Swipe Detection Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                 SWIPE DETECTION SYSTEM                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    WORD DISPLAY LAYER                          │ │
│  │                                                                 │ │
│  │              c        a        t                                │ │
│  │              │        │        │                                │ │
│  │         ┌────┴────┬───┴────┬───┴────┐                          │ │
│  │         │  Zone 1 │ Zone 2 │ Zone 3 │  ◄── Hit Zones           │ │
│  │         └─────────┴────────┴────────┘                          │ │
│  │              ●────────●────────●───▶   ◄── Visual Guide        │ │
│  │              ▲                                                  │ │
│  │              │                                                  │ │
│  │         Swipe Path Detection Area                              │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                 GESTURE RECOGNIZER                             │ │
│  │                                                                 │ │
│  │  • Track finger position in real-time                          │ │
│  │  • Detect entry/exit of each letter zone                       │ │
│  │  • Measure dwell time per zone                                 │ │
│  │  • Calculate swipe speed and direction                         │ │
│  │  • Validate swipe path (left-to-right, stays in bounds)       │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                              │                                       │
│                              ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                 AUDIO SYNC ENGINE                              │ │
│  │                                                                 │ │
│  │  Zone 1 Entry ──▶ Play "c" sound                               │ │
│  │  Zone 2 Entry ──▶ Play "a" sound (blend with previous)        │ │
│  │  Zone 3 Entry ──▶ Play "t" sound (blend with previous)        │ │
│  │  Swipe Complete ──▶ Play full word "cat!"                      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2. Letter Zone Implementation

```dart
// Flutter/Dart implementation concept

class WordSwipeDetector extends StatefulWidget {
  final String word;
  final List<LetterData> letters;
  final Function(int letterIndex) onLetterEnter;
  final Function() onSwipeComplete;

  // ...
}

class LetterZone {
  final String letter;
  final Rect bounds;
  final String soundFile;
  final bool isContinuous;  // Can be held
  final Duration minimumDwell;  // For continuous sounds

  LetterZone({
    required this.letter,
    required this.bounds,
    required this.soundFile,
    required this.isContinuous,
    this.minimumDwell = const Duration(milliseconds: 500),
  });
}

class SwipeState {
  int currentLetterIndex = -1;
  DateTime? letterEntryTime;
  List<int> visitedLetters = [];
  Offset? lastPosition;
  bool isValidSwipe = true;

  void reset() {
    currentLetterIndex = -1;
    letterEntryTime = null;
    visitedLetters.clear();
    lastPosition = null;
    isValidSwipe = true;
  }
}
```

### 3. Swipe Validation Rules

```dart
class SwipeValidator {
  static const double VERTICAL_TOLERANCE = 50.0;  // pixels
  static const double MIN_SWIPE_SPEED = 20.0;     // pixels/second
  static const double MAX_SWIPE_SPEED = 500.0;    // pixels/second

  bool validateSwipe(SwipeState state, WordLayout layout) {
    // Rule 1: Must visit all letters in order
    if (!_visitedAllLettersInOrder(state, layout)) return false;

    // Rule 2: Must move left-to-right
    if (!_isLeftToRight(state)) return false;

    // Rule 3: Must stay within vertical bounds
    if (!_staysInBounds(state, layout)) return false;

    // Rule 4: Speed must be appropriate
    if (!_speedIsValid(state)) return false;

    return true;
  }

  bool _visitedAllLettersInOrder(SwipeState state, WordLayout layout) {
    final expected = List.generate(layout.letterCount, (i) => i);
    return listEquals(state.visitedLetters, expected);
  }
}
```

### 4. Audio Synchronization

```dart
class SwipeAudioController {
  final AudioPlayer _player = AudioPlayer();
  final Map<String, AudioSource> _phonemeCache = {};

  // Blend sounds together as finger moves through letters
  Future<void> playLetterSound(
    LetterZone zone,
    Duration dwellTime,
    bool isBlending,
  ) async {
    if (zone.isContinuous) {
      // For continuous sounds, stretch based on dwell time
      await _playStretchedSound(zone.soundFile, dwellTime);
    } else {
      // For stop sounds, play quick version
      await _playQuickSound(zone.soundFile);
    }

    if (isBlending) {
      // Crossfade with next sound for smooth blending
      _prepareNextSound();
    }
  }

  // Real-time blending as finger moves
  void updateBlendPosition(double progress, String currentSound, String nextSound) {
    // Crossfade between sounds based on finger position
    final currentVolume = 1.0 - progress;
    final nextVolume = progress;

    _player.setVolume(currentVolume);
    _nextPlayer.setVolume(nextVolume);
  }
}
```

### 5. Visual Feedback System

```dart
class SwipeFeedbackPainter extends CustomPainter {
  final SwipeState state;
  final WordLayout layout;

  @override
  void paint(Canvas canvas, Size size) {
    // Draw the arrow/path guide
    _drawGuidePath(canvas, layout);

    // Highlight current letter zone
    if (state.currentLetterIndex >= 0) {
      _highlightLetter(canvas, state.currentLetterIndex);
    }

    // Draw finger trail
    _drawFingerTrail(canvas, state.touchPoints);

    // Show progress indicator
    _drawProgressDots(canvas, state.visitedLetters, layout);
  }

  void _drawGuidePath(Canvas canvas, WordLayout layout) {
    final path = Path();
    final paint = Paint()
      ..color = Colors.blue.withOpacity(0.3)
      ..strokeWidth = 8
      ..style = PaintingStyle.stroke;

    // Draw balls under each letter
    for (var zone in layout.zones) {
      canvas.drawCircle(
        Offset(zone.bounds.center.dx, zone.bounds.bottom + 20),
        8,
        Paint()..color = Colors.blue,
      );
    }

    // Draw connecting arrow
    path.moveTo(layout.zones.first.bounds.left, layout.zones.first.bounds.bottom + 20);
    path.lineTo(layout.zones.last.bounds.right + 20, layout.zones.last.bounds.bottom + 20);

    canvas.drawPath(path, paint);

    // Draw arrow head
    _drawArrowHead(canvas, layout.zones.last.bounds.right + 20, layout.zones.last.bounds.bottom + 20);
  }
}
```

### 6. Different Swipe Modes

#### Mode 1: Sound-Out Swipe (Slow)
```
Purpose: Initial decoding
Speed: Slow, deliberate
Audio: Each sound played fully, stretched for continuous sounds
Visual: Ball lights up as finger reaches each letter

User Action:
  ●────●────●───▶
  s    a    t

  Finger on 's': "sssssss" (held)
  Finger on 'a': "aaaaaaa" (held)
  Finger on 't': "t" (quick)
```

#### Mode 2: Blend Swipe (Medium)
```
Purpose: Connecting sounds
Speed: Moderate, flowing
Audio: Sounds blend together without breaks
Visual: Continuous highlight follows finger

User Action:
  ●═══════════▶
    s─a─t

  Continuous: "sssaaaat"
```

#### Mode 3: Fast Read Swipe (Quick)
```
Purpose: Fluent reading
Speed: Quick, single motion
Audio: Full word pronounced
Visual: Whole word highlights

User Action:
  ═══════════════▶
       sat

  Quick swipe: "sat!"
```

### 7. Touch Recognition Settings

```dart
class SwipeSettings {
  // Sensitivity adjustments for different ages/abilities
  static const SwipeSettings beginner = SwipeSettings(
    verticalTolerance: 80.0,      // More forgiving
    minDwellTime: Duration(milliseconds: 300),
    maxSwipeSpeed: 200.0,         // Must go slower
    requireAllLetters: true,
    showGuidePath: true,
    hapticFeedback: true,
  );

  static const SwipeSettings intermediate = SwipeSettings(
    verticalTolerance: 50.0,
    minDwellTime: Duration(milliseconds: 150),
    maxSwipeSpeed: 400.0,
    requireAllLetters: true,
    showGuidePath: true,
    hapticFeedback: true,
  );

  static const SwipeSettings advanced = SwipeSettings(
    verticalTolerance: 30.0,
    minDwellTime: Duration(milliseconds: 50),
    maxSwipeSpeed: 600.0,
    requireAllLetters: false,     // Can skip if known
    showGuidePath: false,         // No guide needed
    hapticFeedback: false,
  );

  final double verticalTolerance;
  final Duration minDwellTime;
  final double maxSwipeSpeed;
  final bool requireAllLetters;
  final bool showGuidePath;
  final bool hapticFeedback;

  const SwipeSettings({
    required this.verticalTolerance,
    required this.minDwellTime,
    required this.maxSwipeSpeed,
    required this.requireAllLetters,
    required this.showGuidePath,
    required this.hapticFeedback,
  });
}
```

### 8. Haptic Feedback Integration

```dart
class SwipeHaptics {
  static Future<void> onLetterEnter() async {
    // Light tap when entering a new letter zone
    await HapticFeedback.lightImpact();
  }

  static Future<void> onContinuousSoundHold() async {
    // Gentle vibration while holding continuous sound
    await HapticFeedback.selectionClick();
  }

  static Future<void> onSwipeComplete(bool success) async {
    if (success) {
      // Success pattern: two quick taps
      await HapticFeedback.mediumImpact();
      await Future.delayed(Duration(milliseconds: 100));
      await HapticFeedback.mediumImpact();
    } else {
      // Gentle indication to try again
      await HapticFeedback.heavyImpact();
    }
  }
}
```

---

## Lesson Structure Implementation

### Lesson Components by Phase

#### Early Lessons (1-20): Foundation
- Sound introduction (2-3 new sounds per lesson)
- Sound review (slowly, then fast)
- Child touches sounds
- Simple word reading (2-3 letter words)

#### Middle Lessons (21-54): Building
- Sound combinations (ar, th, sh, etc.)
- Rhyming patterns
- "Funny words" (irregular spellings)
- Sentence reading begins
- Story introduction

#### Later Lessons (55-100): Fluency
- "Read it the fast way" emphasis
- Longer passages
- Comprehension questions
- Picture comprehension
- Reduced orthographic support

### Lesson Flow Template

```
┌─────────────────────────────────────────────────────────────┐
│  LESSON [X] OF 100                          ⏱ ~20 min      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐                                        │
│  │ 1. SOUNDS       │  Review + New Sound Introduction       │
│  │    (5 min)      │  • Say slowly, say fast                │
│  └────────┬────────┘  • Child touches sounds                │
│           ▼                                                 │
│  ┌─────────────────┐                                        │
│  │ 2. WORDS        │  Word Reading Practice                 │
│  │    (7 min)      │  • Sound out + Say fast                │
│  └────────┬────────┘  • Rhyming words                       │
│           ▼           • Funny words                         │
│  ┌─────────────────┐                                        │
│  │ 3. STORY        │  Connected Text                        │
│  │    (8 min)      │  • First reading (decode)              │
│  └────────┬────────┘  • Second reading (fluency)            │
│           ▼           • Comprehension questions             │
│  ┌─────────────────┐                                        │
│  │ 4. CELEBRATE!   │  Completion Rewards                    │
│  │                 │  • Stars earned                        │
│  └─────────────────┘  • Progress update                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Audio & Interaction Design

### Audio Requirements

#### Voice Recordings Needed
1. **Instructor Voice** (warm, clear adult voice)
   - All scripted prompts
   - Sound demonstrations (slowly and fast)
   - Confirmation phrases
   - Error correction scripts

2. **Sound Library**
   - All 44 English phonemes
   - Continuous sound versions (stretched)
   - Quick sound versions
   - Blended combinations

3. **Feedback Sounds**
   - Success chimes
   - Encouragement phrases
   - Gentle error indicators

### Visual Design Principles

#### Child-Facing Interface
- Large, clear typography (minimum 48pt for letters)
- High contrast (black on white for reading)
- Minimal distractions during instruction
- Consistent touch target sizes (minimum 44x44pt)

#### Color Coding
- **Red text**: Parent/teacher instructions (not shown to child)
- **Black text**: Content child reads
- **Blue highlights**: Current focus item
- **Green**: Correct response indicator
- **Gentle orange**: Try again indicator

### Animation Guidelines
- Smooth ball-to-ball transitions for sounding out
- Finger/pointer follows reading path
- Subtle pulse on "Get ready" cue
- Celebratory particles on completion

### Background Music System

The app features gentle, child-friendly background music that enhances the learning experience without being distracting.

**Requirements:**
- Play different music tracks for different contexts: menu, learning, celebration, waiting
- Low volume (default 0.3) so music doesn't compete with voice instructions
- Loop tracks seamlessly
- Duck music when voice plays (Android)
- Pause when app goes to background
- Support fade in/out transitions
- Enable/disable via settings

#### Music Track Specifications

| Track | BPM | Key | Duration | Use Case |
|-------|-----|-----|----------|----------|
| Gentle Menu | 70-80 | C Major | 2-3 min loop | Child selection, home screen |
| Calm Learning | 60-70 | G Major | 3-4 min loop | During card reading, swiping |
| Celebration | 120 | F Major | 15 sec | Correct answer, level up |
| Soft Waiting | 50-60 | D Major | 2 min loop | Loading, image generation wait |

#### Music Requirements
- Instrumental only (no vocals to distract)
- Xylophone, soft piano, gentle strings, light percussion
- Avoid sudden loud sections
- Royalty-free or licensed for commercial use
- Suggested sources: Artlist, Epidemic Sound, or AI-generated (Suno)

### Sound Effects System

**Requirements:**
- Preload all sound effects on app startup
- Support sound effects: tap, swipe_start, swipe_progress, correct, incorrect, encourage, level_up, star_earned, confetti_pop, image_reveal, woosh, ding, chime
- Play individual sounds with volume control
- Play sound sequences with configurable intervals
- Play correct answer sequence: correct chime → star earned → confetti pop
- Enable/disable sound effects via settings
- Adjustable volume (0.0 to 1.0)

### Celebration Animations

**Confetti Celebration Requirements:**
- Display animated confetti particles falling from top of screen
- Support intensity levels: small (30 pieces), medium (60 pieces), large (100 pieces)
- Each piece has random color, position, delay, rotation, and scale
- Animate pieces falling with rotation and horizontal drift
- Fade out opacity as pieces reach bottom
- Play confetti sound effect on trigger
- Call onComplete callback after animation finishes
- Overlay on top of content (pointer events disabled)

### Star Burst Animation

**Requirements:**
- Display animated stars bursting outward from center point
- Configurable star count (default: 6)
- Stars animate outward in radial pattern with spring physics
- Scale animation: grow then shrink
- Fade in opacity
- Rotate stars as they move
- Use gold/yellow star SVG icons

### Character Bounce Animation

**Requirements:**
- Display animated mascot character that bounces gently during idle state
- On celebration: scale up/down with rotation wiggle animation
- Idle bounce: gentle vertical movement with smooth easing
- Celebration animation: scale sequence (1.3 → 1 → 1.2 → 1) with rotation sequence (-15° → 15° → -10° → 10° → 0°)
- Use React Native Reanimated for smooth 60fps animations

### Audio Assets Structure

```
assets/
├── audio/
│   ├── music/
│   │   ├── gentle_menu.mp3         # Soft xylophone/piano loop
│   │   ├── calm_learning.mp3       # Ambient strings/bells loop
│   │   ├── celebration_fanfare.mp3 # Upbeat short victory tune
│   │   └── soft_waiting.mp3        # Gentle ambient pad
│   │
│   └── sfx/
│       ├── tap.wav                 # Soft button tap
│       ├── swipe_start.wav         # Whoosh sound
│       ├── swipe_tick.wav          # Soft tick for progress
│       ├── correct_chime.wav       # Happy chime/bell
│       ├── gentle_buzz.wav         # Not harsh, encouraging "try again"
│       ├── encourage.wav           # Soft motivational sound
│       ├── level_up_fanfare.wav    # Triumphant short jingle
│       ├── star_sparkle.wav        # Magical sparkle sound
│       ├── confetti_pop.wav        # Party popper sound
│       ├── magic_reveal.wav        # Magical whoosh for image reveal
│       ├── woosh.wav               # Generic transition sound
│       ├── ding.wav                # Simple notification
│       └── chime.wav               # Single bell chime
```

---

## Progress Tracking & Analytics

### Parent Dashboard Metrics

```
┌─────────────────────────────────────────────────────────────┐
│  [CHILD NAME]'S PROGRESS                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Overall Progress: ████████░░░░░░░░░░░░ 42/100 lessons     │
│                                                             │
│  This Week:                                                 │
│  ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐               │
│  │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun │               │
│  │  ★  │  ★  │  ○  │  ★  │  ★  │  ○  │  ○  │               │
│  └─────┴─────┴─────┴─────┴─────┴─────┴─────┘               │
│                                                             │
│  Sounds Mastered: 28/44                                     │
│  Words Read: 156                                            │
│  Stories Completed: 12                                      │
│                                                             │
│  Areas for Review:                                          │
│  • "th" sound - 65% accuracy (needs practice)               │
│  • "said" (funny word) - often confused                     │
│                                                             │
│  [View Detailed Report]  [Adjust Settings]                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Points to Track
- Time per lesson
- Accuracy per sound/word
- Number of corrections needed
- Streak data
- Comparison to expected pace
- Common error patterns

---

## Technical Stack Recommendations

### Mobile Development: React Native

**Framework**: React Native with TypeScript

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| **Framework** | React Native | Cross-platform, large ecosystem, excellent for custom UI |
| **Language** | TypeScript | Type safety, better DX, fewer runtime errors |
| **Navigation** | React Navigation v6 | Industry standard, deep linking support |
| **State** | Zustand + React Query | Simple, performant, good caching |

### Key Technologies

```
┌─────────────────────────────────────────────────────────────────────┐
│                    REACT NATIVE TECH STACK                           │
│                    (Local-First Architecture)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  FRONTEND                                                            │
│  ├── React Native 0.73+ (Core Framework)                            │
│  ├── TypeScript 5.x (Language)                                       │
│  ├── React Navigation 6.x (Navigation)                               │
│  ├── Zustand (Global State Management)                               │
│  ├── React Query / TanStack Query (Query State + Caching)           │
│  ├── React Native Reanimated 3 (Smooth Animations)                  │
│  ├── React Native Gesture Handler (Swipe Detection)                 │
│  ├── React Native Skia (Custom Orthography Rendering)               │
│  └── Expo SDK 52+ (Build tooling, expo-sqlite)                      │
│                                                                      │
│  AUDIO & SPEECH                                                      │
│  ├── expo-av (Audio Playback for pre-recorded phonemes)              │
│  └── OpenAI Realtime API (Speech Recognition + Text-to-Speech)       │
│                                                                      │
│  AI SERVICES (via Supabase Edge Functions - ONLY cloud interaction) │
│  ├── Google Gemini 3 Flash (Word generation, lesson content)        │
│  ├── Google Nano Banana (Image generation via Gemini API)           │
│  ├── OpenAI Realtime Voice API (Interactive voice + pronunciation)  │
│  └── OpenAI Realtime Tool Calling (Dynamic lesson control)          │
│                                                                      │
│  CLOUD SERVICES                                                      │
│  ├── Supabase Auth (Parent authentication via email OTP)           │
│  └── Supabase Edge Functions (API key protection for LLM calls)     │
│                                                                      │
│  LOCAL DATA STORAGE (All user data on device)                        │
│  ├── expo-sqlite (SQLite database - all app data)                   │
│  ├── react-native-mmkv (Fast key-value for session state)           │
│  ├── react-native-fs (File system for cached images/audio)          │
│  └── AsyncStorage (Simple preferences)                               │
│                                                                      │
│  IN-APP PURCHASES                                                    │
│  └── RevenueCat (Subscription management)                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### React Native Package Dependencies

**Core Framework:**
- React 18.2.0, React Native 0.73.x
- TypeScript 5.x

**Navigation:**
- React Navigation 6.x (Stack navigator)

**State Management:**
- Zustand 4.x (Global state)
- TanStack Query 5.x (Query state and caching)

**Animations & Gestures:**
- React Native Reanimated 3.x
- React Native Gesture Handler 2.x
- Lottie React Native 6.x

**Custom Rendering:**
- React Native Skia 0.1.x (Custom orthography)

**Audio:**
- Expo AV 14.x (Audio playback and recording)

**Storage:**
- expo-sqlite (SQLite database)
- react-native-mmkv 2.x (Fast key-value storage)
- react-native-fs 2.x (File system access)

**Authentication:**
- @supabase/supabase-js (Supabase Auth client)

**In-App Purchases:**
- react-native-purchases (RevenueCat)

**Note:** AI service SDKs are NOT included in client dependencies. All AI calls go through Supabase Edge Functions (LLM proxy).

### Environment Variables

**Client-Side (.env):**
- SUPABASE_URL - Supabase project URL
- SUPABASE_ANON_KEY - Supabase anonymous key (for Supabase Auth and Edge Function calls)

**Server-Side (Supabase Edge Functions):**
- GEMINI_API_KEY - Google Gemini API key (for both Gemini 3 Flash and Nano Banana)
- OPENAI_API_KEY - OpenAI API key

### AI Service Cost Estimates

| Service | Usage | Estimated Cost |
|---------|-------|----------------|
| **Gemini 3 Flash** | Word generation, stories | $0.50 per million input tokens, $3.00 per million output tokens |
| **Nano Banana** | Image generation | Pricing via Gemini API (check current rates) |
| **OpenAI Realtime** | Voice interaction | ~$0.06/min audio input, $0.24/min audio output |

**Monthly estimate for active user (1 lesson/day):**
- Gemini 3 Flash: ~$0.50-1.00/month (word generation)
- Nano Banana: ~$5-10/month (with pre-generation caching)
- OpenAI Realtime: ~$15-20/month (20 min voice/day)
- **Total: ~$20-30/user/month** (can be optimized with caching)

### React Native Swipe Component Implementation

**Requirements:**
- Detect horizontal swipe gestures under words using React Native Gesture Handler
- Track finger position and identify which letter zone is being touched
- Enforce left-to-right order: only allow progression if previous letters were visited
- Trigger onLetterEnter callback when entering each letter zone
- Calculate swipe progress (0-1) based on position across word
- On swipe end, check if all letters were visited in order
- Call onSwipeComplete with success boolean
- Display word with custom orthography using React Native Skia
- Show visual guide for swipe path with progress indicator
- Highlight current letter being touched

### Folder Structure

```
instareader/
├── src/
│   ├── components/
│   │   ├── lesson/
│   │   │   ├── WordSwipeDetector.tsx
│   │   │   ├── BlurredImageReveal.tsx
│   │   │   ├── SoundPractice.tsx
│   │   │   ├── StoryReader.tsx
│   │   │   └── OrthographyText.tsx
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── StarRating.tsx
│   │   │   └── ConfettiCelebration.tsx
│   │   ├── parent/
│   │   │   ├── ParentalGate.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ProgressReport.tsx
│   │   │   └── ParentControls.tsx
│   │   └── audio/
│   │       ├── BackgroundMusicPlayer.tsx
│   │       └── SoundEffectManager.tsx
│   │
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── LessonScreen.tsx
│   │   ├── ProgressScreen.tsx
│   │   └── SettingsScreen.tsx
│   │
│   ├── services/
│   │   ├── ai/
│   │   │   ├── wordGenerator.ts
│   │   │   ├── imageGenerator.ts
│   │   │   └── speechSynthesis.ts
│   │   ├── speech/
│   │   │   ├── recognition.ts
│   │   │   ├── pronunciationValidator.ts
│   │   │   └── phonemeAnalyzer.ts
│   │   ├── audio/
│   │   │   ├── audioPlayer.ts
│   │   │   ├── soundBlender.ts
│   │   │   └── phonemeLibrary.ts
│   │   └── storage/
│   │       ├── progressStore.ts
│   │       ├── imageCache.ts
│   │       └── offlineSync.ts
│   │
│   ├── hooks/
│   │   ├── useLesson.ts
│   │   ├── useSpeechRecognition.ts
│   │   ├── useSwipeDetection.ts
│   │   └── useImagePreload.ts
│   │
│   ├── data/
│   │   ├── lessons/
│   │   │   ├── lesson1.json
│   │   │   ├── lesson2.json
│   │   │   └── ...
│   │   ├── sounds/
│   │   │   └── phonemes.json
│   │   └── words/
│   │       └── coreVocabulary.json
│   │
│   ├── types/
│   │   ├── lesson.ts
│   │   ├── word.ts
│   │   └── progress.ts
│   │
│   └── utils/
│       ├── phonemes.ts
│       ├── scoring.ts
│       └── orthography.ts
│
├── assets/
│   ├── fonts/
│   │   └── DistarOrthography.ttf
│   ├── sounds/
│   │   ├── phonemes/
│   │   │   ├── a_short.mp3
│   │   │   ├── a_long.mp3
│   │   │   └── ...
│   │   └── feedback/
│   │       ├── success.mp3
│   │       └── try_again.mp3
│   └── images/
│       └── ui/
│
├── ios/
├── android/
├── package.json
├── tsconfig.json
└── README.md
```

### Speech Recognition Options

1. **Google Speech-to-Text** - Good accuracy, requires internet
2. **Apple Speech Framework** - iOS only, works offline
3. **Vosk** - Open source, offline, customizable
4. **Custom Model** - Train on children's phoneme production

**Recommendation**: Hybrid approach with Vosk for offline + cloud API for enhanced accuracy

---

## Development Phases

### Phase 1: Foundation (MVP)

**Goal**: Working prototype with core swipe-to-read interaction

```
Duration: ~6-8 weeks
┌─────────────────────────────────────────────────────────────────────┐
│                         PHASE 1: MVP                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  SETUP                                                               │
│  ├── [ ] Initialize React Native project with TypeScript            │
│  ├── [ ] Configure React Navigation                                  │
│  ├── [ ] Set up Zustand state management                            │
│  └── [ ] Configure Supabase Auth (Parent authentication)              │
│                                                                      │
│  CORE FEATURES                                                       │
│  ├── [ ] Custom orthography rendering with React Native Skia        │
│  ├── [ ] Swipe detection under words (Gesture Handler)              │
│  ├── [ ] Audio playback engine for phonemes                         │
│  ├── [ ] Basic lesson player (lessons 1-10 hardcoded)               │
│  └── [ ] Blurred image reveal component                             │
│                                                                      │
│  DATA                                                                │
│  ├── [ ] Lesson data structure and JSON format                      │
│  ├── [ ] Static word list for lessons 1-10                          │
│  └── [ ] Pre-recorded phoneme audio files                           │
│                                                                      │
│  UI                                                                  │
│  ├── [ ] Home screen with lesson selector                           │
│  ├── [ ] Basic lesson screen layout                                 │
│  └── [ ] Simple progress tracking (local storage)                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Phase 2: AI Integration & Speech

**Goal**: Add AI-generated content and pronunciation detection

```
Duration: ~8-10 weeks
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 2: AI & SPEECH                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  OPENAI REALTIME VOICE API                                           │
│  ├── [ ] WebSocket connection to OpenAI Realtime API                │
│  ├── [ ] Audio streaming (PCM 16-bit, 24kHz)                        │
│  ├── [ ] Tool definitions for lesson control                        │
│  ├── [ ] Context ingestion for current word/lesson                  │
│  ├── [ ] Retry system via AI (max 3 attempts per word)             │
│  └── [ ] Parent override controls                                   │
│                                                                      │
│  AI CONTENT GENERATION                                               │
│  ├── [ ] Google Gemini 3 Flash for word/story generation          │
│  ├── [ ] Google Nano Banana image generation                       │
│  ├── [ ] OpenAI Realtime API for voice interaction                  │
│  └── [ ] Word validation engine (decodability check)                │
│                                                                      │
│  PRE-GENERATION SYSTEM                                               │
│  ├── [ ] Background image generation queue                          │
│  ├── [ ] Look-ahead caching (next 5 lessons)                        │
│  ├── [ ] Image cache management (LRU eviction)                      │
│  └── [ ] Progress-based pre-generation triggers                     │
│                                                                      │
│  LESSON CONTENT                                                      │
│  ├── [ ] Lessons 1-50 data files                                    │
│  ├── [ ] Story reading module                                       │
│  └── [ ] Comprehension questions                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Phase 3: Polish & Full Content

**Goal**: Complete curriculum and production-ready app

```
Duration: ~8-10 weeks
┌─────────────────────────────────────────────────────────────────────┐
│                   PHASE 3: POLISH & SCALE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  CONTENT COMPLETION                                                  │
│  ├── [ ] Lessons 51-100 data files                                  │
│  ├── [ ] All phoneme audio recordings                               │
│  ├── [ ] Story library expansion                                    │
│  └── [ ] Quality review of AI-generated content                     │
│                                                                      │
│  PARENT FEATURES                                                     │
│  ├── [ ] Dashboard with progress visualization                      │
│  ├── [ ] Detailed analytics (sounds mastered, problem areas)        │
│  ├── [ ] Notification reminders                                     │
│  └── [ ] Multiple child profile support                             │
│                                                                      │
│  GAMIFICATION                                                        │
│  ├── [ ] Star rating system                                         │
│  ├── [ ] Achievement badges                                         │
│  ├── [ ] Streak tracking                                            │
│  └── [ ] Celebration animations (Lottie)                            │
│                                                                      │
│  INFRASTRUCTURE                                                      │
│  ├── [ ] Cloud sync for progress                                    │
│  ├── [ ] Offline mode (WatermelonDB)                                │
│  ├── [ ] Error reporting (Sentry/Crashlytics)                       │
│  └── [ ] Analytics events (Local tracking, optional Supabase Analytics) │
│                                                                      │
│  QUALITY                                                             │
│  ├── [ ] Accessibility audit (VoiceOver/TalkBack)                   │
│  ├── [ ] Performance optimization                                   │
│  ├── [ ] Beta testing with families                                 │
│  └── [ ] App Store / Play Store preparation                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Phase 4: Launch & Enhancement

**Goal**: Launch app and iterate based on feedback

```
Duration: Ongoing
┌─────────────────────────────────────────────────────────────────────┐
│                  PHASE 4: LAUNCH & ITERATE                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  LAUNCH                                                              │
│  ├── [ ] App Store submission                                       │
│  ├── [ ] Play Store submission                                      │
│  ├── [ ] Marketing website                                          │
│  └── [ ] Launch communications                                       │
│                                                                      │
│  POST-LAUNCH ENHANCEMENTS                                            │
│  ├── [ ] Adaptive difficulty based on performance                   │
│  ├── [ ] Additional practice activities                             │
│  ├── [ ] Supplementary word lists                                   │
│  └── [ ] Parent community features                                  │
│                                                                      │
│  ADVANCED FEATURES                                                   │
│  ├── [ ] School/classroom version                                   │
│  ├── [ ] Teacher dashboard                                          │
│  ├── [ ] Multi-language support                                     │
│  └── [ ] Integration with external reading apps                     │
│                                                                      │
│  CONTINUOUS IMPROVEMENT                                              │
│  ├── [ ] A/B testing framework                                      │
│  ├── [ ] User feedback integration                                  │
│  ├── [ ] AI model fine-tuning                                       │
│  └── [ ] Performance monitoring                                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Development Milestones Summary

| Phase | Duration | Key Deliverable |
|-------|----------|-----------------|
| **Phase 1** | 6-8 weeks | Working MVP with swipe-to-read for lessons 1-10 |
| **Phase 2** | 8-10 weeks | AI content generation + pronunciation detection |
| **Phase 3** | 8-10 weeks | Full 100 lessons, production-ready |
| **Phase 4** | Ongoing | Launch + continuous improvement |

---

## Monetization Strategy

### Options

| Model | Description | Considerations |
|-------|-------------|----------------|
| **Freemium** | Lessons 1-20 free, unlock rest | Good conversion, proven model |
| **Subscription** | Monthly/annual access | Recurring revenue, higher LTV |
| **One-time Purchase** | Full unlock for fixed price | Simple, matches book purchase |
| **Tiered** | Basic (free), Plus (lessons), Premium (analytics) | Flexibility |

### Recommended Approach

```
FREE TIER (Lessons 1-10)
├── Full lesson experience
├── Basic progress tracking
└── Limited sounds library

PREMIUM ($49.99 one-time OR $7.99/month)
├── All 100 lessons
├── Full progress analytics
├── Speech recognition features
├── Offline mode
├── Multiple child profiles
└── Cloud sync
```

---

## Content Considerations

### Licensing & IP
- Original book content is copyrighted
- App must create original:
  - Scripts (inspired by but not copied from book)
  - Stories and passages
  - Illustrations
  - Audio recordings
- Consult IP attorney regarding methodology usage

### Pedagogical Review
- Partner with reading specialists
- Beta test with educators
- Conduct efficacy studies
- Iterate based on learning outcomes

---

## Accessibility

### Required Features
- VoiceOver/TalkBack support
- Adjustable text sizes
- High contrast mode
- Reduced motion option
- Closed captions for audio

### Inclusive Design
- Works for children with different learning needs
- Parent-assisted mode for children who can't use touch
- Visual alternatives to audio cues
- Dyslexia-friendly font option

---

## Success Metrics

### Key Performance Indicators

| Metric | Target | Measurement |
|--------|--------|-------------|
| Lesson completion rate | >80% start lesson 2 after lesson 1 | Analytics |
| Daily active users | 5 days/week average | Usage data |
| Program completion | >60% finish all 100 lessons | Progress tracking |
| Reading improvement | 1+ grade level in 6 months | Pre/post assessment |
| Parent satisfaction | >4.5 stars | App store reviews |
| Child engagement | <10% drop-off per lesson | Session analytics |

---

## Competitive Differentiation

### What Makes InstaReader Unique

1. **Research-Backed Method** - Based on DISTAR, proven by Project Follow-Through
2. **Complete Curriculum** - Full 100-lesson sequence, not just activities
3. **Parent-Child Co-Play** - Designed for guided interaction, not passive screen time
4. **Systematic Progression** - True scope and sequence, not random practice
5. **Special Orthography** - Visual scaffolds that fade as skills develop
6. **Scripted Guidance** - Parents don't need teaching experience

### Competitor Analysis

| App | Strength | InstaReader Advantage |
|-----|----------|----------------------|
| Homer | Personalization | More structured progression |
| Hooked on Phonics | Brand recognition | Research-based methodology |
| Khan Academy Kids | Free, broad content | Focused reading curriculum |
| Reading Eggs | Gamification | Parent involvement emphasis |

---

## Next Steps

1. **Validate concept** with parent focus groups
2. **Create prototype** of lesson 1 experience
3. **Develop custom font** for orthography system
4. **Record audio** for initial lesson set
5. **Build MVP** with lessons 1-10
6. **Beta test** with 20-30 families
7. **Iterate** based on feedback
8. **Launch** with Phase 1 feature set

---

## References & Resources

- [Teach Your Child to Read in 100 Easy Lessons - Amazon](https://www.amazon.com/Teach-Your-Child-Read-Lessons/dp/0671631985)
- [NIFDI - National Institute for Direct Instruction](https://www.nifdi.org/)
- [Reading Rockets - Direct Instruction](https://www.readingrockets.org/topics/curriculum-and-instruction/articles/direct-instruction-di-reading-intervention-program)
- [What Works Clearinghouse - Direct Instruction Report](https://ies.ed.gov/ncee/wwc/Docs/InterventionReports/WWC_Direct_Instruction_052107.pdf)
- [Science of Reading Research](https://www.readingrockets.org/topics/about-reading/articles/science-reading-primer)

---

*Document Version: 1.0*
*Created: December 2024*
*Based on: "Teach Your Child to Read in 100 Easy Lessons" methodology analysis*
