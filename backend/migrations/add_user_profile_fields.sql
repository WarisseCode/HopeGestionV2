-- Add profile fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"language": "fr", "currency": "XOF", "timezone": "GMT+1", "notifications": {"email": true, "whatsapp": false}}'::jsonb;
