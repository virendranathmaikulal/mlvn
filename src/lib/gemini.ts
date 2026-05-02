import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export interface CustomerData {
  name?: string;
  phone?: string;
  address?: string;
  medicines?: Array<{ name: string; quantity: string }>;
  isComplete: boolean;
}

export const handlePharmacyMessage = async (
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

  const parts = [{ text: systemPrompt }];
  if (imageUrl) {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageUrl.split(',')[1] // Remove data:image/jpeg;base64, prefix
      }
    });
  }

  const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
  const response = result.response.text();

  // Extract structured data from response
  const extractPrompt = `From this conversation, extract JSON with exact format:
{
  "name": "extracted name or null",
  "phone": "extracted phone or null", 
  "address": "extracted address or null",
  "medicines": [{"name": "medicine name", "quantity": "quantity"}] or [],
  "isComplete": true/false
}

Conversation: ${response}
Previous: ${JSON.stringify(previousData || {})}`;

  const extractResult = await model.generateContent(extractPrompt);
  let customerData: CustomerData;
  
  try {
    customerData = JSON.parse(extractResult.response.text());
  } catch {
    customerData = { ...previousData, isComplete: false } as CustomerData;
  }

  return { response, customerData };
};
