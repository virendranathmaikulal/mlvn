import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const YCLOUD_API_KEY = Deno.env.get('YCLOUD_API_KEY');
const YCLOUD_BASE_URL = 'https://api.ycloud.com/v2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();

    const headers = {
      'X-API-Key': YCLOUD_API_KEY || '',
      'Content-Type': 'application/json',
    };

    let response;

    if (action === 'create') {
      response = await fetch(`${YCLOUD_BASE_URL}/whatsapp/templates`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
    } else if (action === 'list') {
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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'YCloud API error');
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
