-- Add template_id to whatsapp_messages table
ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES whatsapp_templates(id);

-- Add template_id to whatsapp_campaigns table
ALTER TABLE whatsapp_campaigns 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES whatsapp_templates(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_template_id ON whatsapp_messages(template_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_template_id ON whatsapp_campaigns(template_id);
