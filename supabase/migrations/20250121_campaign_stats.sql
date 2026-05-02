-- Add message statistics to whatsapp_campaigns table
ALTER TABLE whatsapp_campaigns 
ADD COLUMN IF NOT EXISTS messages_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS messages_failed INTEGER DEFAULT 0;
