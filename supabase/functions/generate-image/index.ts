import { createClient } from 'npm:@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
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
    // Verify publishable key (apikey header)
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
    const { prompt, word } = await req.json();

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const imagePrompt = prompt || `A simple, friendly cartoon illustration of ${word || 'a word'}, child-friendly style, white background, no text`;

    console.log('Generating image with Nano Banana (Gemini 2.5 Flash Image) API');
    console.log('Prompt:', imagePrompt);
    
    // Use Nano Banana (Gemini 2.5 Flash Image) API for image generation
    // Model: gemini-2.5-flash-image
    // Can optionally set response_modalities to ['Image'] to get only image (no text)
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
                  text: imagePrompt,
                },
              ],
            },
          ],
          // Optional: request only image response (no text)
          generationConfig: {
            responseModalities: ['IMAGE'],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Image generation error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Log the full response structure for debugging
    console.log('Nano Banana API response status:', response.status);
    console.log('Response structure:', {
      hasCandidates: !!data.candidates,
      candidatesLength: data.candidates?.length || 0,
      firstCandidate: data.candidates?.[0] ? {
        hasContent: !!data.candidates[0].content,
        contentKeys: data.candidates[0].content ? Object.keys(data.candidates[0].content) : [],
        hasParts: !!data.candidates[0].content?.parts,
        partsLength: data.candidates[0].content?.parts?.length || 0,
        firstPart: data.candidates[0].content?.parts?.[0] ? {
          keys: Object.keys(data.candidates[0].content.parts[0]),
          hasInlineData: !!data.candidates[0].content.parts[0].inlineData,
          hasText: !!data.candidates[0].content.parts[0].text,
          inlineDataKeys: data.candidates[0].content.parts[0].inlineData ? Object.keys(data.candidates[0].content.parts[0].inlineData) : [],
        } : null,
      } : null,
      fullResponseKeys: Object.keys(data),
    });
    
    // Extract image data from Nano Banana response
    // The response structure is: candidates[0].content.parts[0].text (description)
    // and candidates[0].content.parts[1].inlineData.data (actual image)
    let imageBase64 = '';
    
    // Check all parts for inlineData
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (let i = 0; i < parts.length; i++) {
      if (parts[i]?.inlineData?.data) {
        imageBase64 = parts[i].inlineData.data;
        console.log(`Found image data in parts[${i}].inlineData.data, length:`, imageBase64.length);
        break;
      }
    }
    
    // Fallback: try parts[0] if not found in loop
    if (!imageBase64 && data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
      imageBase64 = data.candidates[0].content.parts[0].inlineData.data;
      console.log('Found image data in parts[0].inlineData.data (fallback), length:', imageBase64.length);
    }
    
    // Log what we found
    if (!imageBase64) {
      console.error('No image data found in response');
      console.error('Full response (first 2000 chars):', JSON.stringify(data).substring(0, 2000));
    }

    if (!imageBase64) {
      throw new Error('No image data returned from Gemini. Response structure may have changed.');
    }

    // Return base64 data URL (client will handle storage)
    const imageUrl = `data:image/png;base64,${imageBase64}`;

    return new Response(
      JSON.stringify({ imageUrl }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: any) {
    console.error('Error generating image:', error);
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

