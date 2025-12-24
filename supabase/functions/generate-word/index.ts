import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

type ContentType = 'sound' | 'word' | 'phrase' | 'sentence';

function getPromptForContentType(
  contentType: ContentType,
  knownSounds: string[],
  targetPattern: string,
  difficulty: number,
  excludeContent: string[]
): string {
  const soundsList = knownSounds.join(', ');
  const excludeList = excludeContent.length > 0 ? excludeContent.join(', ') : 'none';

  switch (contentType) {
    case 'sound':
      return `Generate a single letter sound for a child learning to read.

Requirements:
- Choose ONE sound from these options: ${soundsList}
- Do NOT use any of these (already practiced): ${excludeList}
- Return the lowercase letter only

Return JSON:
{
  "content": "the single letter",
  "phonemes": ["the phoneme sound"],
  "wordCount": 1,
  "difficulty": ${difficulty},
  "imagePrompt": "A large, colorful, friendly cartoon letter [X] with a simple object that starts with this sound, child-friendly style, white background"
}

Return only valid JSON.`;

    case 'word':
      return `Generate 1 decodable word for a child learning to read.

Requirements:
- Use ONLY these sounds/letters: ${soundsList}
- Pattern: ${targetPattern}
- Difficulty level: ${difficulty}/10
- Must be a real English word appropriate for ages 4-6
- Do NOT use these words: ${excludeList}
- Keep it simple: 2-4 letters max for early levels

Return JSON:
{
  "content": "the word",
  "phonemes": ["array", "of", "phonemes"],
  "wordCount": 1,
  "difficulty": ${difficulty},
  "imagePrompt": "A simple, friendly cartoon illustration of [word], child-friendly style, bright colors, white background"
}

Return only valid JSON.`;

    case 'phrase':
      return `Generate 1 simple decodable phrase for a child learning to read.

Requirements:
- Use ONLY words that can be spelled with these sounds: ${soundsList}
- Pattern: ${targetPattern}
- Difficulty level: ${difficulty}/10
- The phrase should be 2-4 words
- All words must be real English words appropriate for ages 4-6
- Common sight words (a, the, is, on, in) are allowed
- Do NOT use these phrases: ${excludeList}

Return JSON:
{
  "content": "the phrase",
  "phonemes": ["array", "of", "all", "phonemes", "in", "phrase"],
  "wordCount": number of words,
  "difficulty": ${difficulty},
  "imagePrompt": "A simple, friendly cartoon scene showing [phrase description], child-friendly style, bright colors, white background"
}

Return only valid JSON.`;

    case 'sentence':
      return `Generate 1 simple decodable sentence for a child learning to read.

Requirements:
- Use ONLY words that can be spelled with these sounds: ${soundsList}
- Pattern: ${targetPattern}
- Difficulty level: ${difficulty}/10
- The sentence should be 3-7 words
- Must be a complete, grammatically correct sentence
- All words must be real English words appropriate for ages 4-6
- Common sight words (a, the, is, on, in, I, he, she, we, it, and, but, can, will, did) are allowed
- End with proper punctuation (. or !)
- Do NOT use these sentences: ${excludeList}

Return JSON:
{
  "content": "The sentence here.",
  "phonemes": ["array", "of", "all", "phonemes", "in", "sentence"],
  "wordCount": number of words,
  "difficulty": ${difficulty},
  "imagePrompt": "A simple, friendly cartoon scene illustrating: [sentence description], child-friendly style, bright colors, white background"
}

Return only valid JSON.`;
  }
}

serve(async (req) => {
  try {
    const { 
      contentType = 'word',
      knownSounds, 
      targetPattern, 
      difficulty, 
      excludeContent = []
    } = await req.json();

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const prompt = getPromptForContentType(
      contentType as ContentType,
      knownSounds,
      targetPattern,
      difficulty,
      excludeContent
    );

    // Call Gemini API
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
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    const result = JSON.parse(jsonText);

    return new Response(JSON.stringify({
      content: result.content,
      contentType,
      phonemes: result.phonemes,
      wordCount: result.wordCount,
      difficulty: result.difficulty,
      imagePrompt: result.imagePrompt,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
