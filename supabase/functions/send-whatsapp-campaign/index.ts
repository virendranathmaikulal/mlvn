import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const YCLOUD_API_KEY = Deno.env.get('YCLOUD_API_KEY');
const YCLOUD_BASE_URL = 'https://api.ycloud.com/v2';
const WHATSAPP_FROM_NUMBER = Deno.env.get('WHATSAPP_FROM_NUMBER');

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
      
      // Transform stored template components into the send-time format required by the WhatsApp API.
      //
      // Components are stored in creation format. The send-time API expects:
      //   HEADER (IMAGE): { type: "HEADER", parameters: [{ type: "image", image: { link: "<url>" } }] }
      //                   Image URL comes from component.example.header_url (stored by YCloud).
      //   BODY (static):  Omit — static text is baked into the approved template.
      //   FOOTER:         Omit — always static.
      //   BUTTONS:        Only include buttons that need runtime parameters:
      //                   - Dynamic URL (has {{1}}): { type: "BUTTON", sub_type: "URL", index, parameters: [{type:"text",text:"..."}] }
      //                   - QUICK_REPLY:             { type: "BUTTON", sub_type: "QUICK_REPLY", index, parameters: [{type:"payload",payload:"..."}] }
      //                   - Static URL / PHONE_NUMBER: omit entirely — fully defined in the approved template.
      const sendComponents: any[] = [];

      for (const component of (template.components || [])) {
        const type = (component.type || '').toUpperCase();

        if (type === 'BUTTONS' && Array.isArray(component.buttons)) {
          component.buttons.forEach((btn: any, index: number) => {
            // Static URL buttons (no {{1}}) and PHONE_NUMBER buttons are fully defined
            // in the approved template — do NOT include them in the send payload at all.
            // Only include BUTTON components that actually need a runtime parameter:
            //   - Dynamic URL buttons with {{1}} suffix → need a text parameter
            //   - QUICK_REPLY buttons → need a payload parameter
            if (btn.type === 'URL' && btn.url && btn.url.includes('{{1}}')) {
              sendComponents.push({
                type: 'BUTTON',
                sub_type: 'URL',
                index,
                parameters: [{ type: 'text', text: '' }],
              });
            } else if (btn.type === 'QUICK_REPLY') {
              sendComponents.push({
                type: 'BUTTON',
                sub_type: 'QUICK_REPLY',
                index,
                parameters: [{ type: 'payload', payload: btn.text }],
              });
            }
            // Static URL and PHONE_NUMBER buttons: omit entirely
          });

        } else if (type === 'HEADER') {
          // Only include HEADER if it has a dynamic media URL to supply at send time.
          // Fixed images approved during template creation are embedded — no component needed.
          if (component.format === 'IMAGE') {
            // Image URL is stored in components by YCloud under example.header_url
            const imageUrl = component.example?.header_url?.[0] || '';
            if (imageUrl) {
              sendComponents.push({
                type: 'HEADER',
                parameters: [{ type: 'image', image: { link: imageUrl } }],
              });
            }
          }
          // TEXT/VIDEO/DOCUMENT headers are static — omit, baked into the approved template

        } else if (type === 'BODY') {
          // Only include BODY if it contains variables that need to be filled in
          const bodyText: string = component.text || '';
          const hasVariables = bodyText.includes('{{');
          if (hasVariables) {
            // Extract positional variables like {{1}}, {{2}} and replace with contact data
            const parameters: any[] = [];
            const varMatches = bodyText.match(/\{\{(\w+)\}\}/g) || [];
            varMatches.forEach((match: string) => {
              const key = match.replace(/\{\{|\}\}/g, '');
              const value = message.contact_data?.[key] || '';
              parameters.push({ type: 'text', text: value });
            });
            if (parameters.length > 0) {
              sendComponents.push({ type: 'BODY', parameters });
            }
          }
          // Static body — omit, text is baked into the approved template

        } else if (type === 'FOOTER') {
          // FOOTER is always static — omit at send time
        }
        // Any other component types: omit (creation-only fields)
      }

      const payload = {
        from: WHATSAPP_FROM_NUMBER,
        to: message.phone_number,
        type: 'template',
        template: {
          name: template.ycloud_name,
          language: { code: template.language },
          components: sendComponents
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

    await supabase
      .from('whatsapp_campaigns')
      .update({ 
        status: failCount === 0 ? 'completed' : 'completed_with_errors',
        messages_sent: successCount,
        messages_failed: failCount
      })
      .eq('id', campaignId);

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
