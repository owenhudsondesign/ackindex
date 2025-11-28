-- =====================================================
-- Add follow-up email tracking columns to user_profiles
-- =====================================================
-- Run this migration in Supabase SQL Editor

-- Add columns to track follow-up email status
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS followup_email_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS followup_email_sent_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient querying of users who need follow-up emails
CREATE INDEX IF NOT EXISTS idx_user_profiles_followup_email
ON user_profiles(created_at, followup_email_sent)
WHERE followup_email_sent = false OR followup_email_sent IS NULL;
