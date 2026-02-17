-- WhatsApp Templates (reusable message templates)
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_content TEXT NOT NULL,
  media_url TEXT,
  category TEXT DEFAULT 'promotional' CHECK (category IN ('promotional', 'transactional')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WhatsApp Promotional Campaigns
CREATE TABLE IF NOT EXISTS public.whatsapp_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_id UUID REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
  message_content TEXT NOT NULL,
  media_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'completed', 'failed')),
  scheduled_at TIMESTAMPTZ,
  launched_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_read INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WhatsApp Campaign-Contact Junction
CREATE TABLE IF NOT EXISTS public.whatsapp_campaign_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, contact_id)
);

-- WhatsApp Messages (promotional outbound)
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  message_content TEXT NOT NULL,
  media_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  whatsapp_message_id TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WhatsApp Conversations (bot - inbound/outbound chat)
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  conversation_status TEXT DEFAULT 'active' CHECK (conversation_status IN ('active', 'resolved', 'abandoned')),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WhatsApp Conversation Messages (chat history)
CREATE TABLE IF NOT EXISTS public.whatsapp_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'document')),
  content TEXT NOT NULL,
  media_url TEXT,
  whatsapp_message_id TEXT,
  sender_phone TEXT,
  receiver_phone TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order Leads (captured from bot conversations)
CREATE TABLE IF NOT EXISTS public.order_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  medicine_names JSONB,
  order_details JSONB,
  lead_status TEXT DEFAULT 'new' CHECK (lead_status IN ('new', 'contacted', 'confirmed', 'delivered', 'cancelled')),
  lead_source TEXT DEFAULT 'whatsapp_bot',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_user ON public.whatsapp_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_user ON public.whatsapp_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_status ON public.whatsapp_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_campaign ON public.whatsapp_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON public.whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_user ON public.whatsapp_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON public.whatsapp_conversations(customer_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversation_messages_conv ON public.whatsapp_conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_order_leads_user ON public.order_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_order_leads_status ON public.order_leads(lead_status);

-- Enable RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaign_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users access own whatsapp_templates" ON public.whatsapp_templates FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own whatsapp_campaigns" ON public.whatsapp_campaigns FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own whatsapp_campaign_contacts" ON public.whatsapp_campaign_contacts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.whatsapp_campaigns WHERE id = campaign_id AND user_id = auth.uid())
);
CREATE POLICY "Users access own whatsapp_messages" ON public.whatsapp_messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own whatsapp_conversations" ON public.whatsapp_conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own whatsapp_conversation_messages" ON public.whatsapp_conversation_messages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.whatsapp_conversations WHERE id = conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Users access own order_leads" ON public.order_leads FOR ALL USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_whatsapp_templates_updated_at BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_campaigns_updated_at BEFORE UPDATE ON public.whatsapp_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_messages_updated_at BEFORE UPDATE ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_conversations_updated_at BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_order_leads_updated_at BEFORE UPDATE ON public.order_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Pharmacy Chat Integration - Minimal Schema Changes
-- Builds on existing whatsapp_conversations and order_leads tables

-- 1. Add pharmacy-specific fields to existing order_leads table
ALTER TABLE public.order_leads 
ADD COLUMN IF NOT EXISTS medicines JSONB, -- [{"name": "Paracetamol", "quantity": "2 strips"}]
ADD COLUMN IF NOT EXISTS customer_data_complete BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS order_total DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS prescription_image_url TEXT;

-- 2. Add conversation context to whatsapp_conversations
ALTER TABLE public.whatsapp_conversations
ADD COLUMN IF NOT EXISTS conversation_context JSONB, -- Current AI context
ADD COLUMN IF NOT EXISTS conversation_type TEXT DEFAULT 'general' CHECK (conversation_type IN ('general', 'pharmacy_order', 'support'));

-- 3. Pharmacy staff notifications
CREATE TABLE IF NOT EXISTS public.pharmacy_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_lead_id UUID REFERENCES public.order_leads(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'new_order', 'order_complete', 'prescription_uploaded'
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_leads_medicines ON public.order_leads USING GIN (medicines);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_type ON public.whatsapp_conversations(conversation_type);
CREATE INDEX IF NOT EXISTS idx_pharmacy_notifications_unread ON public.pharmacy_notifications(is_read, created_at);

-- Enable RLS
ALTER TABLE public.pharmacy_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users access own pharmacy_notifications" ON public.pharmacy_notifications FOR ALL USING (
  EXISTS (SELECT 1 FROM public.order_leads WHERE id = order_lead_id AND user_id = auth.uid())
);
