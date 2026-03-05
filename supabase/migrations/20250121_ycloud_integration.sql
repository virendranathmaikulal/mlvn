-- Add YCloud integration fields to whatsapp_templates table
ALTER TABLE whatsapp_templates 
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS ycloud_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS ycloud_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS components JSONB,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Create unique constraint for YCloud templates
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_templates_ycloud_unique 
ON whatsapp_templates(ycloud_name, language) WHERE ycloud_name IS NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_user_status ON whatsapp_templates(user_id, status);
