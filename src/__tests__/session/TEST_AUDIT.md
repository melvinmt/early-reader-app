# Session Tests Audit

## Critical Issue Found

Tests were passing while the code was broken. The "10 cards per session" requirement was not being validated at runtime.

## Test Coverage Analysis

### ✅ Tests That Actually Test Runtime Behavior

1. **consecutive-cards.test.ts**
   - Tests: `getNextCard()` exclusion logic
   - Runtime: ✅ Yes (uses mocks but tests actual function calls)
   - Would catch: Consecutive card bugs
   - Status: **GOOD** but needs update for `getCardQueue()` approach

### ❌ Tests That Only Test Static Data (NOT Runtime)

1. **session-size.test.ts**
   - Tests: Static curriculum data (`getCardsUpToLesson()`)
   - Runtime: ❌ NO - Only checks if curriculum HAS cards, not if code GENERATES them
   - Would catch: ❌ NO - The "only 1 card generated" bug would NOT be caught
   - Status: **BROKEN** - Needs runtime validation

2. **mixed-types.test.ts**
   - Tests: Static curriculum data (card types in curriculum)
   - Runtime: ❌ NO
   - Would catch: ❌ NO - Doesn't validate actual session generation
   - Status: **INCOMPLETE** - Needs runtime validation

3. **no-repeats.test.ts**
   - Tests: Static curriculum data (uniqueness of card IDs)
   - Runtime: ❌ NO
   - Would catch: ❌ NO - Doesn't validate exclusion logic at runtime
   - Status: **REDUNDANT** - consecutive-cards.test.ts already covers this

## Missing Critical Tests

### 1. `getCardQueue()` Runtime Validation
**Status: MISSING**
- Should test: `getCardQueue(childId)` actually returns 10 cards
- Should catch: Bug where only 1 card is generated
- Priority: **CRITICAL**

### 2. Session Queue Management
**Status: MISSING**
- Should test: Queue-based approach in LearningScreen works correctly
- Should catch: Queue not being populated, consecutive cards in queue
- Priority: **HIGH**

### 3. Edge Cases for Session Size
**Status: MISSING**
- Should test: Behavior when fewer than 10 cards are available
- Should catch: System breaking when limited cards available
- Priority: **MEDIUM**

## Test Reliability Score

| Test File | Static Data | Runtime Behavior | Catches Real Bugs | Score |
|-----------|-------------|------------------|-------------------|-------|
| session-size.test.ts | ✅ | ❌ | ❌ | 1/3 ❌ |
| mixed-types.test.ts | ✅ | ❌ | ❌ | 1/3 ❌ |
| no-repeats.test.ts | ✅ | ❌ | ❌ | 1/3 ❌ |
| consecutive-cards.test.ts | ❌ | ✅ | ✅ | 2/3 ⚠️ |
| **getCardQueue tests** | ❌ | ❌ | ❌ | 0/3 ❌ **MISSING** |

## Action Items

1. ✅ Add runtime test for `getCardQueue()` (CRITICAL)
2. ✅ Update consecutive-cards.test.ts to test `getCardQueue()` approach
3. ⚠️ Add warnings to static-only tests
4. ⚠️ Document what each test actually validates

## Trust Level: LOW ⚠️

**Before fixes**: Tests passed while code was broken. Cannot trust tests.

**After fixes**: Need to add runtime validation tests before we can trust them.

