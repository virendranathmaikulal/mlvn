import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

interface CustomerData {
  name?: string;
  phone?: string;
  address?: string;
  medicines?: Array<{ name: string; quantity: string }>;
  isComplete: boolean;
}

const handlePharmacyMessage = async (
  message: string,
  imageUrl?: string,
  previousData?: CustomerData
): Promise<{ response: string; customerData: CustomerData }> => {
  const systemPrompt = `You are a pharmacy assistant. Extract and update customer details:
- Name, Phone, Address, Medicine names with quantities
- Respond in same language (English/Hindi/Hinglish)
- Be friendly, ask missing info one at a time
- When all details collected, confirm order and say "एक व्यक्ति आपके ऑर्डर का ध्यान रखेगा" or "A person will take care of your order"

Previous data: ${JSON.stringify(previousData || {})}
Customer message: ${message}`;

  const payload = {
    contents: [{
      parts: [{ text: systemPrompt }]
    }]
  };

  if (imageUrl) {
    payload.contents[0].parts.push({
      inline_data: {
        mime_type: 'image/jpeg',
        data: imageUrl.split(',')[1]
      }
    });
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  const responseText = result.candidates[0].content.parts[0].text;

  // Extract structured data
  const extractPayload = {
    contents: [{
      parts: [{
        text: `From this conversation, extract JSON with exact format:
{
  "name": "extracted name or null",
  "phone": "extracted phone or null", 
  "address": "extracted address or null",
  "medicines": [{"name": "medicine name", "quantity": "quantity"}] or [],
  "isComplete": true/false
}

Conversation: ${responseText}
Previous: ${JSON.stringify(previousData || {})}`
      }]
    }]
  };

  const extractResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(extractPayload)
  });

  const extractResult = await extractResponse.json();
  let customerData: CustomerData;
  
  try {
    customerData = JSON.parse(extractResult.candidates[0].content.parts[0].text);
  } catch {
    customerData = { ...previousData, isComplete: false } as CustomerData;
  }

  return { response: responseText, customerData };
};

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { message, imageUrl, customerId } = await req.json();
    
    if (!message || !customerId) {
      return new Response(JSON.stringify({ error: 'Message and customerId required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get previous conversation data (implement with Supabase storage)
    const previousData = {}; // TODO: Fetch from database
    
    const { response, customerData } = await handlePharmacyMessage(message, imageUrl, previousData);
    
    // Save conversation state (implement with Supabase)
    if (customerData.isComplete) {
      console.log('Order complete:', customerData);
      // TODO: Save to database, notify staff
    }

    return new Response(JSON.stringify({
      response,
      customerData,
      orderComplete: customerData.isComplete
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Pharmacy chat error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
