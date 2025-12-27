# Effective Harnesses for Long-Running Agents

Best practices for building agents that work reliably across multiple sessions and context windows.

## Core Problem

Long-running agents struggle because they work in discrete sessions with no memory of prior context. Even frontier models fail at complex tasks spanning multiple context windows when given only high-level prompts.

## Two-Part Solution Architecture

### 1. Initializer Agent (First Session Only)

Sets up the foundational environment:

- **`init.sh` script** - Enables the development server to run reliably
- **`claude-progress.txt` file** - Maintains a log of completed work
- **Initial git commit** - Documents what files were added
- **Feature list (JSON)** - Comprehensive breakdown of all end-to-end features, each initially marked as `"passes": false`

### 2. Coding Agent (Subsequent Sessions)

Follows a structured workflow:

1. Reads progress files and git history to understand context
2. Works on **only one feature at a time** (critical constraint)
3. Commits progress with descriptive messages
4. Updates progress documentation
5. Leaves code in production-ready state

## Key Implementation Patterns

### Feature List Management

Use JSON instead of Markdown - models are less likely to inappropriately modify structured data.

```json
{
  "features": [
    {
      "id": "auth-001",
      "category": "Authentication",
      "description": "User can sign in with email OTP",
      "steps": [
        "Enter email on login screen",
        "Receive OTP code",
        "Enter code and gain access"
      ],
      "passes": false
    }
  ]
}
```

### Startup Checklist

Each session must begin with:

1. Run `pwd` to confirm working directory
2. Read git logs and progress files
3. Select next highest-priority incomplete feature
4. Run basic end-to-end tests before new development

### Testing Strategy

- Provide browser automation tools (e.g., Puppeteer MCP)
- Explicitly prompt for **user-level testing** rather than just unit tests
- This significantly improves bug detection

## Critical Success Factors

| Factor | Why It Matters |
|--------|----------------|
| **Incremental progress** | Addressing one feature per session prevents context exhaustion and undocumented half-implementations |
| **Clean state enforcement** | Require proper documentation and git commits to prevent downstream sessions from debugging unrelated issues |
| **Clear artifact trails** | Progress files and git history enable quick context recovery despite context window limitations |

## Common Failure Modes & Prevention

| Problem | Prevention |
|---------|------------|
| Agent declares victory prematurely | Maintain comprehensive feature list; only mark items complete after testing |
| Environment left in broken state | Require git commits and progress documentation before session ends |
| Features marked complete without testing | Mandate end-to-end browser/device automation testing |
| Time wasted on setup | Provide `init.sh` for automatic server startup |

## Session Handoff Protocol

Before ending any session:

1. Commit all changes with descriptive message
2. Update `claude-progress.txt` with:
   - What was completed
   - What issues were encountered
   - What should be tackled next
3. Ensure tests pass or document known failures
4. Leave no uncommitted work

## Multi-Agent Architecture (Future)

Consider specialized agents with distinct roles:

- **Coding Agent** - Implements features
- **Testing Agent** - Validates implementations with E2E tests
- **QA Agent** - Reviews code quality and consistency
- **Cleanup Agent** - Refactors and removes dead code

## Applying to This Project

For Early Reader, implement these patterns:

```
/earlyreader
├── init.sh                    # Dev server startup script
├── claude-progress.txt        # Session-by-session log
├── features.json              # All features with pass/fail status
└── src/
```

### Feature Categories for Early Reader

1. **Authentication** - Supabase email OTP flow
2. **Onboarding** - Child management, subscription
3. **Card Generation** - Gemini word generation, Imagen images
4. **Voice Interaction** - OpenAI Realtime API integration
5. **Spaced Repetition** - SM-2 algorithm, card queue management
6. **UI/UX** - Swipe detection, blur reveal, orthography rendering

Each feature should have clear acceptance criteria and be testable via device automation.
