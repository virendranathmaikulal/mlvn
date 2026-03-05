import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const YCLOUD_API_KEY = Deno.env.get('YCLOUD_API_KEY');
const YCLOUD_BASE_URL = 'https://api.ycloud.com/v2';
const WABA_ID = Deno.env.get('WABA_ID');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    console.log('YCloud function called:', action, params);
    console.log('YCLOUD_API_KEY exists:', !!YCLOUD_API_KEY);

    const headers = {
      'X-API-Key': YCLOUD_API_KEY || '',
      'Content-Type': 'application/json',
    };

    let response;

    if (action === 'create') {
      const payload = { ...params, wabaId: WABA_ID };
      console.log('Creating template with payload:', payload);
      
      response = await fetch(`${YCLOUD_BASE_URL}/whatsapp/templates`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    } else if (action === 'list') {
      console.log('Fetching templates from YCloud...');
      response = await fetch(`${YCLOUD_BASE_URL}/whatsapp/templates`, {
        method: 'GET',
        headers,
      });
    } else if (action === 'sync') {
      response = await fetch(`${YCLOUD_BASE_URL}/whatsapp/templates/${params.name}/${params.language}`, {
        method: 'GET',
        headers,
      });
    } else {
      throw new Error('Invalid action');
    }

    console.log('YCloud API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('YCloud API error:', errorText);
      throw new Error(errorText || 'YCloud API error');
    }

    const data = await response.json();
    console.log('YCloud API response data:', data);
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
