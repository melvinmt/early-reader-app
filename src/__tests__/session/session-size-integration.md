# Runtime Session Size Integration Tests

## Problem

The existing `session-size.test.ts` only tests static curriculum data, NOT the actual runtime behavior of `getCardQueue` or `getNextCard`. This means:

1. **Tests pass** even when the code only generates 1 card
2. **Tests don't validate** that sessions actually have 10 cards
3. **Tests don't catch bugs** like the one where only "me" was available

## Required Integration Tests

These tests need to run against a REAL database (or properly mocked one) to validate actual behavior:

### Test 1: getCardQueue Returns 10 Cards
```typescript
it('getCardQueue generates 10 cards for a new child', async () => {
  const child = await createTestChild();
  const result = await getCardQueue(child.id);
  expect(result.cards.length).toBeGreaterThanOrEqual(10);
});
```

### Test 2: getNextCard Can Generate 10+ Unique Cards
```typescript
it('getNextCard can generate 10+ unique cards in sequence', async () => {
  const child = await createTestChild();
  const seenWords = new Set<string>();
  let lastWord: string | undefined;
  
  for (let i = 0; i < 15; i++) {
    const card = await getNextCard(child.id, lastWord);
    if (!card) break;
    seenWords.add(card.word);
    lastWord = card.word;
  }
  
  expect(seenWords.size).toBeGreaterThanOrEqual(10);
});
```

### Test 3: Session Doesn't Break With Limited Cards
```typescript
it('session continues even when only 1 card initially available', async () => {
  // This validates the fix where excludeWord doesn't break sessions
  const child = await createTestChild();
  // ... simulate scenario with only 1 card
  // ... verify session can continue
});
```

## Current Status

- ✅ Tests are DOCUMENTED in `runtime-session-size.test.ts`
- ❌ Tests are SKIPPED because they require database setup
- ❌ Existing `session-size.test.ts` only tests static data

## Next Steps

1. Set up proper database mocking for integration tests
2. Or use a real test database (better-sqlite3, sql.js, etc.)
3. Enable and run the integration tests
4. Ensure CI/CD runs these tests

## Impact

Without these tests:
- Bugs like "only 1 card generated" won't be caught
- Requirements validation is incomplete
- Users experience broken sessions

