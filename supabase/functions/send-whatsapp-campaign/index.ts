import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { campaignId } = await req.json();
    console.log('=== SEND WHATSAPP CAMPAIGN STARTED ===');
    console.log('Campaign ID:', campaignId);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: messages, error } = await supabase
      .from('whatsapp_messages')
      .select('*, whatsapp_templates(*)')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending');

    if (error) throw error;
    console.log('Found', messages.length, 'pending messages');

    let successCount = 0;
    let failCount = 0;

    for (const message of messages) {
      const template = message.whatsapp_templates;
      console.log('\n--- Sending to:', message.phone_number);
      
      const payload = {
        to: message.phone_number,
        type: 'template',
        template: {
          name: template.ycloud_name,
          language: { code: template.language },
          components: template.components
        }
      };

      console.log('Payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(`${YCLOUD_BASE_URL}/whatsapp/messages`, {
        method: 'POST',
        headers: {
          'X-API-Key': YCLOUD_API_KEY || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('YCloud API response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ SUCCESS:', responseData);
        
        await supabase
          .from('whatsapp_messages')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', message.id);
        
        successCount++;
      } else {
        const errorText = await response.text();
        console.error('❌ FAILED:', response.status, errorText);
        
        await supabase
          .from('whatsapp_messages')
          .update({ status: 'failed', error_message: errorText })
          .eq('id', message.id);
        
        failCount++;
      }
    }

    console.log('\n=== CAMPAIGN COMPLETED ===');
    console.log('Success:', successCount, '| Failed:', failCount);

    return new Response(JSON.stringify({ success: true, sent: successCount, failed: failCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('=== CAMPAIGN ERROR ===', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
