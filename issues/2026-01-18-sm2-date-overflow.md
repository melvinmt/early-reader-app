Title: SM-2 interval growth causes Date overflow in long simulations

Symptoms
- Full journey simulation fails with `RangeError: Invalid time value`.
- Logs show extremely large future review dates (e.g., year 10000+).

Root Cause
- SM-2 interval multiplies by ease factor without an upper bound.
- Repeated successful reviews compound the interval until JavaScript Date overflows.

Solution
1. Cap SM-2 `nextInterval` to a reasonable maximum (e.g., 3650 days).
2. Re-run full journey simulation to verify stability.

Prevention
- Keep a hard cap on spaced repetition intervals to avoid time overflow.
- Add long-run simulation tests that exercise repeated success paths.
