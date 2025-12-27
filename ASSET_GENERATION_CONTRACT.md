# Asset Generation Contract

The `scripts/generate-cards.ts` script can be run at any time to regenerate assets.
The generated dataset MUST maintain these guarantees for the codebase and tests to work correctly.

## Minimum Viable Dataset

The generated curriculum must include:

- **At least 40 phoneme/digraph cards** (DISTAR methodology has 44, but test mode may have fewer)
- **At least 300 word cards** (full curriculum has ~400+)
- **At least 80 sentence cards** (full curriculum has ~100)
- **Coverage of lessons 1-100** (at least 1 card per 10-lesson range)

These minimums ensure the curriculum has sufficient content for:
- Progressive phoneme introduction
- Word unlocking as phonemes are learned
- Sentence practice at appropriate levels
- Multi-session learning progression

## Card Structure Guarantees

All generated cards MUST have:

### Required Fields
- `id`: Unique identifier (format: `{number}-{sanitized-name}`)
- `type`: One of `'letter'`, `'digraph'`, `'word'`, or `'sentence'`
- `display`: Display text (may include macrons, orthography markers)
- `plainText`: Plain text version (no formatting)
- `phonemes`: Array of phoneme symbols (strings)
- `lesson`: Number between 1-100

### Asset Paths
All cards MUST have valid asset paths:
- `imagePath`: Format `assets/{locale}/{card-id}/image.webp`
- `audioPath`: Format `assets/{locale}/{card-id}/audio.mp3`
- `promptPath`: Format `assets/{locale}/{card-id}/prompt.mp3`
- `tryAgainPath`: Format `assets/{locale}/{card-id}/try-again.mp3`
- `noInputPath`: Format `assets/{locale}/{card-id}/no-input.mp3`
- `greatJobPath`: Format `assets/{locale}/{card-id}/great-job.mp3`

### Type-Specific Requirements

**Phoneme Cards** (`type: 'letter'` or `type: 'digraph'`):
- Must have exactly 1 phoneme in `phonemes` array
- `phonemes[0]` must match `plainText` (case-insensitive)
- Must have `orthography` object with appropriate markers

**Word Cards** (`type: 'word'`):
- Must have `phonemeAudioPaths` array (may be empty if phoneme cards don't exist)
- Must have `soundedOutPath`: Format `assets/{locale}/{card-id}/audio-sounded.mp3`
- `phonemes` array must contain valid phoneme symbols

**Sentence Cards** (`type: 'sentence'`):
- Must have `words` array
- `words` array must contain the individual words from `plainText`
- May have `phonemeAudioPaths` and `wordAudioPaths` arrays (may be empty)

## Lesson Progression Guarantees

The curriculum MUST maintain these progression rules:

1. **Phonemes introduced progressively**: Not all phonemes in lesson 1
   - Phonemes should be distributed across lessons 1-89 (matching DISTAR methodology)
   - At least 20 unique lesson numbers should have phoneme introductions

2. **Words available as phonemes are learned**: 
   - After lesson 5, words should be available
   - Words should use phonemes that have been introduced in prior lessons
   - Simple words (2-3 phonemes) should appear early

3. **Each lesson range has meaningful content**:
   - Lessons 1-10: At least some cards
   - Lessons 11-30: At least some cards
   - Lessons 31-50: At least some cards
   - Lessons 51-70: At least some cards
   - Lessons 71-89: At least some cards

## Test Dependencies

Tests rely on these contracts, NOT on:
- ❌ Specific card IDs (e.g., `001-m`, `002-s`)
- ❌ Exact total card counts (e.g., exactly 721 cards)
- ❌ Specific words existing (e.g., "am", "cat", "the")
- ❌ Specific asset file names
- ❌ Exact lesson assignments for specific cards

Tests DO rely on:
- ✅ Minimum card counts by type
- ✅ Card structure completeness
- ✅ Asset path format validity
- ✅ Lesson progression rules
- ✅ Phoneme consistency

## Regeneration Safety

When assets are regenerated:

1. **Card IDs may change**: Sequential numbering resets, IDs may differ
2. **Total counts may vary**: Test mode (12 cards) vs full mode (~780 cards)
3. **Word selection may differ**: Test mode randomly selects words
4. **Asset paths change**: Depend on card IDs which change

The codebase and tests are designed to handle these variations by:
- Using dynamic queries instead of hardcoded values
- Finding cards by properties (type, lesson) instead of assuming specific content
- Validating formats generically without assuming specific IDs
- Using conditional test skips when required test data isn't available

## Validation

After regenerating assets, run:

```bash
# Run all tests to ensure nothing broke
npm test

# Test with test mode assets
npm run generate-cards
npm test

# Test with full mode assets
npm run generate-cards:full
npm test
```

All tests should pass regardless of which assets are generated, as long as the minimum viable dataset guarantees are met.

