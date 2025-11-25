-- Add upload_token column for token-based chunk authentication
-- This allows chunk uploads to authenticate without relying on cookies

ALTER TABLE video_upload_sessions
ADD COLUMN IF NOT EXISTS upload_token TEXT;

-- Create index for token lookups
CREATE INDEX IF NOT EXISTS idx_upload_sessions_token ON video_upload_sessions(upload_token);

COMMENT ON COLUMN video_upload_sessions.upload_token IS 'Secure token for authenticating chunk uploads without cookies';
