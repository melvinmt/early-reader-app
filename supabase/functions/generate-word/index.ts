import { createClient } from 'npm:@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
// Get publishable key from environment (set as secret)
const EXPECTED_PUBLISHABLE_KEY = Deno.env.get('PUBLISHABLE_KEY') ?? '';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Verify publishable key (apikey header) - custom verification for publishable keys
    const apikey = req.headers.get('apikey');
    if (EXPECTED_PUBLISHABLE_KEY && apikey !== EXPECTED_PUBLISHABLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get Authorization header (user JWT token)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with auth context
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify the JWT token by getting the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { level, phonemes, childId, excludedWords = [] } = await req.json();

    if (!level || !phonemes || !Array.isArray(phonemes) || !childId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: level, phonemes, childId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate word using Gemini with variation
    const excludeText = excludedWords.length > 0 
      ? ` Do NOT use these words (already seen): ${excludedWords.join(', ')}.` 
      : '';
    
    const variationHint = excludedWords.length > 0
      ? ' Generate a DIFFERENT word than the ones already seen. Be creative and vary your responses.'
      : '';
    
    const prompt = `Generate a simple, phonetically regular word suitable for a ${level}-year-old learning to read. The word must use ONLY these phonemes in order: ${phonemes.join(', ')}.${excludeText}${variationHint} Return ONLY the word itself, nothing else.`;

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
                  text: prompt,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const word = data.candidates[0]?.content?.parts[0]?.text?.trim() || '';

    if (!word) {
      throw new Error('No word generated from Gemini');
    }

    // Generate image for the word (using same endpoint as generate-image function)
    const imagePrompt = `A simple, friendly cartoon illustration of "${word}", child-friendly style, white background, no text`;
    
    let imageUrl = '';
    try {
      const imageResponse = await fetch(
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
                    text: imagePrompt,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        const imageBase64 = imageData.candidates[0]?.content?.parts[0]?.inlineData?.data || '';
        if (imageBase64) {
          // Return base64 data URL (client will handle storage)
          imageUrl = `data:image/png;base64,${imageBase64}`;
          console.log('Image generated successfully for word:', word, 'Size:', imageBase64.length);
        } else {
          console.warn('Image response OK but no base64 data found for word:', word, 'Response:', JSON.stringify(imageData).substring(0, 200));
        }
      } else {
        const errorText = await imageResponse.text();
        console.error('Image generation failed for word:', word, 'Status:', imageResponse.status, 'Error:', errorText);
        // Continue without image - client will generate it separately if needed
      }
    } catch (imageError) {
      console.error('Exception during image generation for word:', word, 'Error:', imageError);
      // Continue without image - client will generate it separately if needed
    }

    // Return the generated word with phonemes and image
    return new Response(
      JSON.stringify({
        word,
        phonemes,
        imageUrl,
        level,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: any) {
    console.error('Error generating word:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

