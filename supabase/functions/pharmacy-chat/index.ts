import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Medicine {
  name: string;
  quantity: string;
  notes?: string;
}

interface ConversationContext {
  items: Medicine[];
  customer_name?: string;
  delivery_address?: string;
  is_complete: boolean;
  summary?: string;
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
  conversationId: string,
  imageUrl?: string,
  context?: ConversationContext
): Promise<{ response: string; context: ConversationContext; orderComplete: boolean; orderLeadId?: string }> => {
  const currentState = context || { items: [], is_complete: false };
  
  // Fetch last 10 messages for conversation history
  const { data: recentMessages, count } = await supabase
    .from('whatsapp_conversation_messages')
    .select('direction, content', { count: 'exact' })
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(10);
  
  const conversationHistory = (recentMessages || [])
    .reverse()
    .map(m => `${m.direction === 'inbound' ? 'Customer' : 'Bot'}: ${m.content}`)
    .join('\n');

  // Add summary if exists (for long conversations)
  const contextPrefix = currentState.summary 
    ? `PREVIOUS CONVERSATION SUMMARY: ${currentState.summary}\n\nRECENT MESSAGES:\n` 
    : '';

  const systemPrompt = `You are 'Aditi', a very friendly and polite pharmacy assistant from Maikoolal virendra nath medical store on WhatsApp. You speak natural conversational Hinglish (e.g., "Main aapki kya help kar sakti hoon?").

YOUR PRIMARY GOAL: Generate an **Order Lead**.
You do NOT need a perfect or exact order. If the customer is not tech-savvy, gives vague medicine names, or forgets quantities, ACCEPT IT happily. A human pharmacist will call them later to confirm exact details and pricing.

CRITICAL LOGIC RULES:

1. **Prescription Image Handling:**
   - If customer sends a prescription image, acknowledge it and create an order lead immediately
   - Say: "Ji haan, prescription mil gaya! Main aapka order prepare kar rahi hoon. Pharmacist aapko call karenge details confirm karne ke liye."
   - Set "is_complete": true for prescription orders
   - Add "Prescription medicines" to items list

2. **Lead Generation over Perfection:** 
   - NEVER get stuck in a loop asking for missing details.
   - If a user says "Sir dard ki goli de do", just add "Sir dard ki goli" to the items list.
   - If quantity is missing, default to "To be confirmed on call".
   - If the user seems in a hurry (e.g., "jaldi bhej do", "kitna time lagega"), trigger order completion immediately.

3. **Item Merging (Silent Internal Logic):**
   - If the user asks for a generic category ("dard ki dawa") and later names a specific medicine ("Dolo 650"), REPLACE the generic category with the specific medicine in your JSON list.
   - Do this silently. DO NOT explain this merge to the user.

4. **Ambiguity Handling:**
   - "10 quantity" → assume "10 Tablets".
   - "1 Patta" or "Strip" → assume "1 Strip".

5. **"Nothing Else" / Finalization Protocol:**
   - If the user says "Bas", "That's it", "Aur kuch nahi", "Bhej do", "Done", or asks for the bill/time:
   - If delivery_address is missing, ask ONCE: "Ji theek hai! Bas ek address bata dijiye delivery ke liye?"
   - If address is provided OR user responds to address request, set "is_complete": true immediately
   - Never ask for address more than once - generate lead anyway for manual collection

6. **Delivery & Recommendations:**
   - Delivery Time: If asked, say: "Delivery usually 30-60 minutes mein ho jati hai."
   - Recommendations: If they ask what medicine to take, say: "Sorry, main dawa suggest nahi kar sakti. Please aap dawai ka naam bata dijiye ya doctor ka parcha (prescription) bhej dijiye."

CURRENT KNOWN STATE:
- Items in Cart: ${JSON.stringify(currentState.items)}
- Customer Name: ${currentState.customer_name || "Not provided"}
- Customer Address: ${currentState.delivery_address || "Not provided"}
- Prescription Image: ${imageUrl ? "Received" : "Not provided"}

CONVERSATION HISTORY:
${contextPrefix}${conversationHistory}

CUSTOMER'S NEW MESSAGE: ${message}

RESPONSE FORMAT (MUST BE VALID JSON ONLY):
{
  "internal_reasoning": "Brief thought process",
  "extracted_items": [{"name": "medicine name", "quantity": "quantity or 'To be confirmed on call'", "action": "add|replace_generic"}],
  "extracted_name": "customer name or null",
  "extracted_address": "delivery address or null",
  "is_complete": true/false,
  "bot_response": "Your friendly Hinglish response to customer"
}

OUTPUT ONLY THE JSON. NO MARKDOWN, NO EXPLANATIONS.`;

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Use v1 API with gemini-2.5-flash
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  console.log('Calling Gemini API: v1/gemini-2.5-flash');
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: systemPrompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    })
  });
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Gemini API error:', response.status, errorBody);
    throw new Error(`Gemini API failed: ${response.status}`);
  }
  
  console.log('✓ Gemini API success');
  
  const result = await response.json();
  if (!result.candidates?.[0]) throw new Error('No response from Gemini');
  
  let responseText = result.candidates[0].content.parts[0].text;
  console.log('Raw LLM response:', responseText.substring(0, 150));
  
  // Extract JSON from response (handle markdown wrapping)
  let jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    responseText = jsonMatch[1];
  } else {
    jsonMatch = responseText.match(/```\s*([\s\S]*?)```/);
    if (jsonMatch) responseText = jsonMatch[1];
  }
  
  let llmOutput;
  try {
    llmOutput = JSON.parse(responseText.trim());
    console.log('✓ JSON parsed successfully');
  } catch (e) {
    console.error('JSON parse error:', e.message);
    console.error('Cleaned text:', responseText.substring(0, 200));
    throw new Error(`Failed to parse LLM response: ${e.message}`);
  }

  // Merge items intelligently
  let updatedItems = [...currentState.items];
  
  for (const newItem of llmOutput.extracted_items || []) {
    if (newItem.action === 'replace_generic') {
      // Remove generic items (e.g., "dard ki dawa")
      updatedItems = updatedItems.filter(item => 
        !item.name.toLowerCase().includes('dawa') && 
        !item.name.toLowerCase().includes('medicine')
      );
    }
    
    // Check for duplicates
    const existingIndex = updatedItems.findIndex(item => 
      item.name.toLowerCase() === newItem.name.toLowerCase()
    );
    
    if (existingIndex >= 0) {
      updatedItems[existingIndex] = newItem; // Update quantity if changed
    } else {
      updatedItems.push(newItem);
    }
  }

  const updatedContext: ConversationContext = {
    items: updatedItems,
    customer_name: llmOutput.extracted_name || currentState.customer_name,
    delivery_address: llmOutput.extracted_address || currentState.delivery_address,
    is_complete: llmOutput.is_complete || (llmOutput.is_complete === false ? false : currentState.is_complete),
    summary: currentState.summary
  };

  // Auto-summarize if conversation exceeds 20 messages
  if ((count || 0) > 20 && !currentState.summary) {
    const summaryResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Summarize this pharmacy conversation in 2-3 sentences (what items discussed, any issues):\n${conversationHistory}` }] }]
      })
    });
    if (summaryResponse.ok) {
      const summaryResult = await summaryResponse.json();
      updatedContext.summary = summaryResult.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
  }

  // BUG FIX #3: Prevent empty order completion
  const orderComplete = updatedContext.is_complete && updatedContext.items.length > 0;

  let orderLeadId: string | undefined;
  if (orderComplete) {
    // BUG FIX #1: Prevent duplicate order leads with idempotency check
    const { data: existingLead } = await supabase
      .from('order_leads')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('lead_status', 'new')
      .single();
    
    if (!existingLead) {
      orderLeadId = await createOrderLead(userId, phone, conversationId, updatedContext, imageUrl);
    } else {
      orderLeadId = existingLead.id;
    }
  }

  return { 
    response: llmOutput.bot_response || "Kuch gadbad ho gayi. Please dobara try karein.", 
    context: updatedContext, 
    orderComplete, 
    orderLeadId 
  };
};



const createOrderLead = async (userId: string, phone: string, conversationId: string, context: ConversationContext, imageUrl?: string): Promise<string> => {
  const { data: orderLead, error } = await supabase
    .from('order_leads')
    .insert({
      user_id: userId,
      conversation_id: conversationId,
      customer_phone: phone,
      customer_name: context.customer_name || 'To be confirmed',
      customer_address: context.delivery_address || 'To be confirmed',
      medicines: context.items,
      customer_data_complete: !!(context.customer_name && context.delivery_address),
      prescription_image_url: imageUrl,
      lead_status: 'new'
    })
    .select('id')
    .single();
    
  if (error) throw error;
  
  // BUG FIX #6: Handle notification failure gracefully
  try {
    await supabase.from('pharmacy_notifications').insert({
      order_lead_id: orderLead.id,
      notification_type: 'new_order',
      message: `New pharmacy order from ${context.customer_name || phone}: ${context.items.map(m => m.name).join(', ')}`
    });
  } catch (notifError) {
    console.error('Notification insert failed:', notifError);
  }
  
  return orderLead.id;
};

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const { message, phone, image_url, user_id }: ChatRequest = await req.json();
    console.log(`📞 Pharmacy chat request - Phone: ${phone}, User: ${user_id}, Message: "${message}"`);
    
    if (!message || !phone || !user_id) {
      console.error('❌ Missing required fields:', { message: !!message, phone: !!phone, user_id: !!user_id });
      return new Response(JSON.stringify({ error: 'message, phone, user_id required' }), { 
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // BUG FIX #2: Allow reopening resolved conversations for repeat customers
    const { data: conversation } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('customer_phone', phone)
      .eq('user_id', user_id)
      .in('conversation_status', ['active', 'resolved'])
      .order('last_message_at', { ascending: false })
      .limit(1)
      .single();

    let conversationId: string;
    let context: ConversationContext | undefined;
    
    if (conversation) {
      conversationId = conversation.id;
      // BUG FIX #9: Validate and sanitize context
      try {
        context = conversation.conversation_context || { items: [], is_complete: false };
        // Reset completion if conversation was resolved
        if (conversation.conversation_status === 'resolved') {
          context = { ...context, is_complete: false };
        }
      } catch (e) {
        context = { items: [], is_complete: false };
      }
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

    // BUG FIX #5: Handle message save failure
    const { error: msgError } = await supabase.from('whatsapp_conversation_messages').insert({
      conversation_id: conversationId,
      direction: 'inbound',
      content: message,
      media_url: image_url,
      sender_phone: phone
    });
    
    if (msgError) {
      console.error('Failed to save inbound message:', msgError);
    }

    // BUG FIX #8: Handle LLM API failures gracefully with retry
    let response, updatedContext, orderComplete, orderLeadId;
    let retries = 2;
    let lastError;
    
    while (retries > 0) {
      try {
        ({ response, context: updatedContext, orderComplete, orderLeadId } = await handlePharmacyMessage(
          message, phone, user_id, conversationId, image_url, context
        ));
        break;
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${3 - retries} failed:`, error.message);
        retries--;
        if (retries === 0) {
          // Log final error for debugging
          console.error('All retries exhausted. Final error:', lastError);
          // Final fallback
          response = "Sorry, main abhi busy hoon. Thodi der mein dobara message karein.";
          updatedContext = context || { items: [], is_complete: false };
          orderComplete = false;
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

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
    const { error: outMsgError } = await supabase.from('whatsapp_conversation_messages').insert({
      conversation_id: conversationId,
      direction: 'outbound',
      content: response,
      receiver_phone: phone
    });
    
    if (outMsgError) {
      console.error('Failed to save outbound message:', outMsgError);
    }

    console.log(`🤖 Generated response: "${response}", Order complete: ${orderComplete}`);

    return new Response(JSON.stringify({
      response,
      order_complete: orderComplete,
      order_lead_id: orderLeadId
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('🔴 Pharmacy chat error:', error);
    return new Response(JSON.stringify({ 
      error: 'Service unavailable', 
      response: 'Sorry, I am temporarily unavailable. Please try again.' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
