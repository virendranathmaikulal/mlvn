import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Medicine {
  name: string;
  quantity: string;
  notes?: string;
}

interface ConversationContext {
  step: 'greeting' | 'collecting_medicines' | 'collecting_details' | 'confirming' | 'complete';
  collected_data: {
    name?: string;
    phone?: string;
    address?: string;
    medicines: Medicine[];
  };
  language: 'en' | 'hi' | 'hinglish';
}

interface ChatRequest {
  message: string;
  phone: string;
  image_url?: string;
  user_id: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const handlePharmacyMessage = async (
  message: string,
  phone: string,
  userId: string,
  imageUrl?: string,
  context?: ConversationContext
): Promise<{ response: string; context: ConversationContext; orderComplete: boolean; orderLeadId?: string }> => {
  const currentStep = context?.step || 'greeting';
  const collectedData = context?.collected_data || { medicines: [] };
  
  const systemPrompt = `You are a pharmacy assistant. Current step: ${currentStep}
Collected data: ${JSON.stringify(collectedData)}

Rules:
1. Respond in same language (English/Hindi/Hinglish)
2. Be friendly, ask one thing at a time
3. Extract medicines with quantities from messages/images
4. When all details complete, say "आपका ऑर्डर तैयार है" or "Your order is ready"

Flow: greeting → medicines → details → confirm → complete`;

  const contents = [{
    role: 'user',
    parts: [{
      text: `${systemPrompt}\n\nCustomer message: ${message}`,
      ...(imageUrl ? { inlineData: { mimeType: 'image/jpeg', data: imageUrl.split(',')[1] } } : {})
    }]
  }];

  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents })
  });

  if (!response.ok) throw new Error(`Gemini API failed: ${response.status}`);
  
  const result = await response.json();
  if (!result.candidates?.[0]) throw new Error('No response from Gemini');
  
  const responseText = result.candidates[0].content.parts[0].text;

  // Extract structured data
  const extractResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Extract JSON: {"name":"...","phone":"...","address":"...","medicines":[{"name":"...","quantity":"..."}],"step":"greeting|collecting_medicines|collecting_details|confirming|complete","isComplete":true/false}\n\nMessage: ${message}\nResponse: ${responseText}\nCurrent: ${JSON.stringify(collectedData)}` }] }]
    })
  });

  let updatedContext: ConversationContext;
  try {
    const extractResult = await extractResponse.json();
    const jsonText = extractResult.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const extracted = JSON.parse(jsonText.replace(/```json|```/g, '').trim());
    
    updatedContext = {
      step: extracted.step || getNextStep(currentStep, extracted),
      collected_data: {
        name: extracted.name || collectedData.name,
        phone: extracted.phone || collectedData.phone || phone,
        address: extracted.address || collectedData.address,
        medicines: [...collectedData.medicines, ...(extracted.medicines || [])]
      },
      language: context?.language || detectLanguage(message)
    };
  } catch (e) {
    updatedContext = { ...context, step: currentStep, collected_data: collectedData, language: 'en' } as ConversationContext;
  }

  const orderComplete = updatedContext.step === 'complete' && 
    updatedContext.collected_data.name && 
    updatedContext.collected_data.phone && 
    updatedContext.collected_data.medicines.length > 0;

  let orderLeadId: string | undefined;
  if (orderComplete) {
    orderLeadId = await createOrderLead(userId, phone, updatedContext.collected_data, imageUrl);
  }

  return { response: responseText, context: updatedContext, orderComplete, orderLeadId };
};

const getNextStep = (current: string, extracted: any): string => {
  if (extracted.medicines?.length > 0 && current === 'greeting') return 'collecting_details';
  if (extracted.name && extracted.address && current === 'collecting_details') return 'confirming';
  if (current === 'confirming') return 'complete';
  return current;
};

const detectLanguage = (text: string): 'en' | 'hi' | 'hinglish' => {
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (/\b(hai|chahiye|mujhe|aap|kya)\b/i.test(text)) return 'hinglish';
  return 'en';
};

const createOrderLead = async (userId: string, phone: string, data: any, imageUrl?: string): Promise<string> => {
  const { data: orderLead, error } = await supabase
    .from('order_leads')
    .insert({
      user_id: userId,
      customer_phone: phone,
      customer_name: data.name,
      customer_address: data.address,
      medicines: data.medicines,
      customer_data_complete: true,
      prescription_image_url: imageUrl,
      lead_status: 'new'
    })
    .select('id')
    .single();
    
  if (error) throw error;
  
  // Notify staff
  await supabase.from('pharmacy_notifications').insert({
    order_lead_id: orderLead.id,
    notification_type: 'new_order',
    message: `New pharmacy order from ${data.name || phone}: ${data.medicines.map(m => m.name).join(', ')}`
  });
  
  return orderLead.id;
};

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const { message, phone, image_url, user_id }: ChatRequest = await req.json();
    
    if (!message || !phone || !user_id) {
      return new Response(JSON.stringify({ error: 'message, phone, user_id required' }), { 
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get/create conversation
    const { data: conversation } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('customer_phone', phone)
      .eq('user_id', user_id)
      .eq('conversation_status', 'active')
      .single();

    let conversationId: string;
    let context: ConversationContext | undefined;
    
    if (conversation) {
      conversationId = conversation.id;
      context = conversation.conversation_context;
    } else {
      const { data: newConv, error } = await supabase
        .from('whatsapp_conversations')
        .insert({
          user_id,
          customer_phone: phone,
          conversation_type: 'pharmacy_order',
          conversation_status: 'active'
        })
        .select('id')
        .single();
      
      if (error || !newConv) {
        throw new Error(`Failed to create conversation: ${error?.message}`);
      }
      conversationId = newConv.id;
    }

    // Save user message
    await supabase.from('whatsapp_conversation_messages').insert({
      conversation_id: conversationId,
      direction: 'inbound',
      content: message,
      media_url: image_url,
      sender_phone: phone
    });

    const { response, context: updatedContext, orderComplete, orderLeadId } = await handlePharmacyMessage(
      message, phone, user_id, image_url, context
    );

    // Update conversation context
    await supabase
      .from('whatsapp_conversations')
      .update({ 
        conversation_context: updatedContext,
        last_message_at: new Date().toISOString(),
        conversation_status: orderComplete ? 'resolved' : 'active'
      })
      .eq('id', conversationId);

    // Save bot response
    await supabase.from('whatsapp_conversation_messages').insert({
      conversation_id: conversationId,
      direction: 'outbound',
      content: response,
      receiver_phone: phone
    });

    return new Response(JSON.stringify({
      response,
      order_complete: orderComplete,
      order_lead_id: orderLeadId,
      next_step: updatedContext.step
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Pharmacy chat error:', error);
    return new Response(JSON.stringify({ 
      error: 'Service unavailable', 
      response: 'Sorry, I am temporarily unavailable. Please try again.' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
