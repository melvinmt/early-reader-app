import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

serve(async (req) => {
  try {
    const { knownSounds, targetPattern, difficulty, excludeWords = [], count = 1 } = await req.json();

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Call Gemini 3 Flash API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Generate ${count} decodable word(s) for a child learning to read.

Requirements:
- Use only these sounds: ${knownSounds.join(', ')}
- Pattern: ${targetPattern}
- Difficulty level: ${difficulty}/10
- Must be real English words appropriate for ages 4-6
- Exclude these words: ${excludeWords.join(', ') || 'none'}

For each word, return JSON with:
{
  "word": "the word",
  "phonemes": ["array", "of", "phonemes"],
  "syllables": number,
  "difficulty": number,
  "imagePrompt": "A simple, friendly cartoon illustration of [word], child-friendly style, white background"
}

Return only valid JSON array.`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;

    // Parse JSON from response
    const words = JSON.parse(text);

    return new Response(JSON.stringify(Array.isArray(words) ? words[0] : words), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
