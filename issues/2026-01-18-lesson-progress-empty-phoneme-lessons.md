Title: Lesson progression stalls on lessons without phonemes

Symptoms
- Child levels can stall or behave unpredictably when a lesson has no phonemes.
- In logs, `required=[]` for a lesson and `lessonComplete=false`, preventing advancement.

Root Cause
- `isLessonComplete()` returned false when `lessonPhonemes.length === 0`, so lessons without
  defined phonemes were never considered complete.

Solution
1. Treat lessons with no phonemes as complete in `isLessonComplete()`.
2. Re-run progression simulation to confirm advancement past empty-phoneme lessons.

Prevention
- Add progression simulation tests that log lesson requirements and verify advancement
  through lessons with zero phonemes.
