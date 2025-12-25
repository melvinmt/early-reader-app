import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

serve(async (req) => {
  try {
    const { word, imagePrompt } = await req.json();

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const prompt = imagePrompt || `A simple, friendly cartoon illustration of a ${word}, child-friendly style, white background, no text`;

    // Call Nano Banana (Gemini Image Generation)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
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
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Image generation error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract base64 image from response
    // Note: Actual response structure may vary - adjust based on Nano Banana API
    const imageBase64 = data.candidates[0]?.content?.parts[0]?.inlineData?.data || '';

    return new Response(
      JSON.stringify({ imageBase64 }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});





