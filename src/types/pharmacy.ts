// Pharmacy Chat - Minimal Types (extends existing)

export interface Medicine {
  name: string;
  quantity: string;
  notes?: string;
}

export interface PharmacyOrderLead {
  id: string;
  user_id: string;
  conversation_id?: string;
  customer_name?: string;
  customer_phone: string;
  customer_address?: string;
  medicines?: Medicine[];
  customer_data_complete: boolean;
  order_total?: number;
  prescription_image_url?: string;
  lead_status: 'new' | 'contacted' | 'confirmed' | 'delivered' | 'cancelled';
  notes?: string;
  created_at: string;
}

export interface ConversationContext {
  step: 'greeting' | 'collecting_medicines' | 'collecting_details' | 'confirming' | 'complete';
  collected_data: {
    name?: string;
    phone?: string;
    address?: string;
    medicines: Medicine[];
  };
  language: 'en' | 'hi' | 'hinglish';
}

export interface ChatRequest {
  message: string;
  phone: string;
  image_url?: string;
  user_id: string; // Pharmacy owner
}

export interface ChatResponse {
  response: string;
  order_complete: boolean;
  order_lead_id?: string;
  next_step: string;
}
