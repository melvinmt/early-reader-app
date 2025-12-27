# Test Documentation Guide

This document explains what each test file validates and what it does NOT validate, ensuring clarity on test coverage and trustworthiness.

## Quick Reference

| Test File | Type | Runtime? | Integration? | Trust Level |
|-----------|------|----------|--------------|-------------|
| `session-size.test.ts` | Static | ❌ | ❌ | ⚠️ Low (data only) |
| `mixed-types.test.ts` | Static | ❌ | ❌ | ⚠️ Low (data only) |
| `no-repeats.test.ts` | Static | ❌ | ❌ | ⚠️ Low (data only) |
| `consecutive-cards.test.ts` | Runtime | ✅ | ❌ | ✅ High |
| `getCardQueue-runtime.test.ts` | Runtime | ✅ | ❌ | ✅ High |
| `getCardQueue-integration.test.ts` | Integration | ✅ | ✅ | ✅✅ Very High |
| `full-journey-simulation.test.ts` | Documentation | - | - | 📋 Requirements only |

## Test Categories

### 1. Static Data Tests (Low Trust Level)

These tests validate the STRUCTURE of curriculum data, NOT runtime behavior.

#### `session-size.test.ts`
- **WHAT IT VALIDATES:**
  - ✅ Curriculum has cards available at each lesson
  - ✅ Curriculum structure is correct
  
- **WHAT IT DOES NOT VALIDATE:**
  - ❌ `getCardQueue()` actually returns 10 cards at runtime
  - ❌ Runtime session generation logic
  - ❌ Database interactions
  - ❌ Card queue management

- **TRUST LEVEL:** ⚠️ Low - Would NOT catch "only 1 card" bug

#### `mixed-types.test.ts`
- **WHAT IT VALIDATES:**
  - ✅ Curriculum has multiple card types available
  - ✅ Data structure supports mixed types
  
- **WHAT IT DOES NOT VALIDATE:**
  - ❌ Runtime actually generates mixed card types
  - ❌ `getCardQueue()` mixes types correctly
  - ❌ Priority system respects type diversity

- **TRUST LEVEL:** ⚠️ Low - Data structure only

#### `no-repeats.test.ts`
- **WHAT IT VALIDATES:**
  - ✅ Curriculum has unique cards
  - ✅ Data structure supports uniqueness
  
- **WHAT IT DOES NOT VALIDATE:**
  - ❌ Runtime prevents consecutive repeats
  - ❌ `getNextCard()` exclusion logic works
  - ❌ Queue management prevents duplicates

- **TRUST LEVEL:** ⚠️ Low - Data only (runtime tested in `consecutive-cards.test.ts`)

### 2. Runtime Unit Tests (High Trust Level)

These tests validate ACTUAL runtime behavior with mocked dependencies.

#### `consecutive-cards.test.ts`
- **WHAT IT VALIDATES:**
  - ✅ `getNextCard()` never returns same card twice in a row
  - ✅ Exclusion logic works across all priority levels
  - ✅ Edge cases handled correctly
  - ✅ System skips excluded cards even when only option
  
- **WHAT IT DOES NOT VALIDATE:**
  - ❌ Full integration with real database
  - ❌ `getCardQueue()` batch generation (tested separately)
  - ❌ LearningScreen component behavior
  - ❌ End-to-end session flow

- **TRUST LEVEL:** ✅ High - Would catch consecutive card bugs

#### `getCardQueue-runtime.test.ts`
- **WHAT IT VALIDATES:**
  - ✅ `getCardQueue()` returns 10 cards when available
  - ✅ Session size matches requirements
  - ✅ Card structure is valid
  - ✅ System handles edge cases gracefully
  - ✅ **CRITICAL: Never returns only 1 card when more available**
  
- **WHAT IT DOES NOT VALIDATE:**
  - ❌ Full integration with real database (uses mocked DB)
  - ❌ Complete end-to-end session flow
  - ❌ All edge cases with real curriculum data
  
- **TRUST LEVEL:** ✅ High - **Would have caught "only 1 card" bug**

### 3. Integration Tests (Very High Trust Level)

These tests use realistic database interactions to validate behavior.

#### `getCardQueue-integration.test.ts`
- **WHAT IT VALIDATES:**
  - ✅ `getCardQueue()` works with realistic database interactions
  - ✅ Full data flow from database → card generation → result
  - ✅ Edge cases with real data structures
  - ✅ Integration between database, curriculum, and card generation
  - ✅ **CRITICAL: Never returns only 1 card when more available**
  
- **WHAT IT DOES NOT VALIDATE:**
  - ❌ Actual SQLite database (uses in-memory test database)
  - ❌ Full end-to-end session flow (see full-journey-simulation)
  - ❌ Real file system or asset loading
  
- **TRUST LEVEL:** ✅✅ Very High - **Most reliable runtime test**

### 4. Documentation/Requirements Tests

#### `full-journey-simulation.test.ts`
- **WHAT IT IS:**
  - 📋 Documentation of comprehensive requirements
  - 📋 Placeholder for future implementation
  - 📋 Guide for ultimate end-to-end test
  
- **WHAT IT SHOULD VALIDATE (when implemented):**
  - ✅ Complete child journey through all lessons
  - ✅ Session generation at every milestone
  - ✅ All edge cases throughout journey
  - ✅ System stability over 100+ sessions
  
- **TRUST LEVEL:** 📋 Documentation only (not implemented)

## Test Infrastructure

### `integration-test-setup.ts`
Provides utilities for integration tests:
- `InMemoryTestDatabase`: In-memory database implementation
- `IntegrationTestHelper`: Helper class for setting up test scenarios
- `setupMockDatabase`: Function to wire up mocks with test database

## Key Learnings from Bug Investigation

### The "Only 1 Card" Bug
- **What happened:** `getCardQueue()` returned only 1 card instead of 10
- **Why static tests didn't catch it:** They only tested curriculum data, not runtime behavior
- **Solution:** Added `getCardQueue-runtime.test.ts` and `getCardQueue-integration.test.ts`
- **Critical assertion:** `expect(result.cards.length).toBe(CARDS_PER_SESSION)` when cards available

### The "Consecutive Cards" Bug
- **What happened:** Same card appeared twice in a row
- **Why tests didn't catch it:** Static tests only checked data structure
- **Solution:** Added `consecutive-cards.test.ts` with comprehensive runtime tests
- **Critical assertion:** `expect(card2.word).not.toBe(card1.word)` with exclusion

## Recommendations for Future Tests

1. **Always test runtime behavior, not just data structure**
   - If a test only validates data structure, mark it clearly
   - Add runtime tests for actual function behavior

2. **Use integration tests for critical paths**
   - Database interactions should be tested with realistic mocks
   - Use `IntegrationTestHelper` for consistent setup

3. **Document what each test validates**
   - Clear headers in each test file
   - Explicit "WHAT IT VALIDATES" vs "WHAT IT DOES NOT VALIDATE"

4. **Prioritize tests that catch real bugs**
   - Runtime tests > Static tests
   - Integration tests > Unit tests (for critical paths)
   - End-to-end tests > Component tests (for user-facing features)

## Running Tests

```bash
# Run all session tests
npm test src/__tests__/session

# Run specific test categories
npm test src/__tests__/session/getCardQueue-runtime.test.ts
npm test src/__tests__/session/getCardQueue-integration.test.ts
npm test src/__tests__/session/consecutive-cards.test.ts

# Run static tests (lower priority)
npm test src/__tests__/session/session-size.test.ts
```

## Trustworthiness Checklist

When reviewing tests, ask:
- [ ] Does it test runtime behavior or just data structure?
- [ ] Does it use mocks appropriately (not too many, not too few)?
- [ ] Does it test the actual bug scenarios?
- [ ] Is it clear what the test validates vs. what it doesn't?
- [ ] Would it catch the bugs we've seen in production?

If answers are unclear, add documentation or improve the test.

