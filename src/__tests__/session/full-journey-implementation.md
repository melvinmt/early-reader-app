# Full Journey Simulation Test - Implementation Guide

## Goal

Create a comprehensive integration test that simulates a child progressing through all 100 lessons, validating that the system works correctly at every stage.

## What This Test Must Validate

### 1. Session Generation at Every Stage
- ✅ `getCardQueue()` returns at least 10 cards (or maximum available)
- ✅ All cards are valid and have required fields
- ✅ Cards are appropriate for child's current lesson
- ✅ System gracefully handles limited cards (< 10)

### 2. No Consecutive Cards
- ✅ Never see same card twice in a row
- ✅ Queue-based exclusion works correctly
- ✅ System handles edge cases (only 1 card available)

### 3. Progress Through All Lessons
- ✅ Child can progress from lesson 1 to 100
- ✅ Sessions work at every milestone (1, 5, 10, 25, 50, 75, 100)
- ✅ System maintains quality throughout journey

### 4. Edge Cases
- ✅ Brand new child (no progress)
- ✅ Limited cards available
- ✅ Many due review cards
- ✅ Mixed priorities (high/medium/low)
- ✅ Lesson boundaries and transitions
- ✅ Rapid progression (many sessions)

## Implementation Approach

### Phase 1: Basic Simulation Framework

```typescript
class ChildJourneySimulator {
  private childId: string;
  private currentLesson: number = 1;
  private cardsSeen: Set<string> = new Set();
  private lastCard: string | null = null;
  
  async simulateFullJourney() {
    for (let lesson = 1; lesson <= 100; lesson++) {
      await this.simulateLesson(lesson);
    }
  }
  
  async simulateLesson(lesson: number) {
    // Set child to this lesson
    // Generate sessions until lesson criteria met
    // Validate each session
  }
  
  async generateSession() {
    // Call getCardQueue()
    // Validate 10 cards (or max available)
    // Validate no consecutive cards
    // Track cards seen
  }
}
```

### Phase 2: Database Setup

Options:
1. **Real Database**: Use test database (better-sqlite3, sql.js)
2. **Mocked Database**: Mock all database functions
3. **Hybrid**: Real structure, mocked data

Recommendation: Start with mocked database for speed, add real database option later.

### Phase 3: Validation Framework

```typescript
class SessionValidator {
  validateSession(cards: LearningCard[], lastCard: string | null) {
    // Validate size (10 or max available)
    // Validate no consecutive cards
    // Validate card quality
    // Validate appropriateness for lesson
  }
}
```

### Phase 4: Edge Case Testing

Create specific scenarios:
- New child scenario
- Limited cards scenario  
- Review-heavy scenario
- Rapid progression scenario

## Critical Assertions

These assertions would have caught the bugs:

```typescript
// Session size assertion
expect(session.cards.length).toBeGreaterThanOrEqual(
  Math.min(10, maxAvailableCards)
);
expect(session.cards.length).toBeGreaterThan(1); // Critical: never just 1

// Consecutive card assertion
const words = session.cards.map(c => c.word);
for (let i = 1; i < words.length; i++) {
  expect(words[i]).not.toBe(words[i-1]);
}

// Cross-session consecutive assertion
if (lastCard) {
  expect(session.cards[0].word).not.toBe(lastCard);
}
```

## Test Structure

```
describe('Full Child Journey Simulation', () => {
  describe('Basic Journey (Lesson 1-100)', () => {
    // Simulate full journey, validate at milestones
  });
  
  describe('Edge Cases', () => {
    // New child
    // Limited cards
    // Review-heavy
    // Rapid progression
  });
  
  describe('Quality Validation', () => {
    // Card structure
    // Curriculum matching
    // Performance
  });
});
```

## Success Criteria

Test passes when:
1. ✅ Child can progress through all 100 lessons
2. ✅ Every session has >= 10 cards (or max available)
3. ✅ No consecutive cards ever appear
4. ✅ All edge cases handled gracefully
5. ✅ System maintains quality throughout

## Current Status

⚠️ **NOT IMPLEMENTED** - Documentation and requirements only.

To implement:
1. Set up database mocking/integration
2. Create simulation framework
3. Implement validation logic
4. Run against all 100 lessons
5. Validate edge cases

## This Test Would Have Caught

- ✅ "Only 1 card generated" bug
- ✅ Consecutive card bugs  
- ✅ Session size violations
- ✅ Edge case failures
- ✅ Regression bugs

This is THE test that ensures we can trust the system with "the life of our mothers" 🚀

