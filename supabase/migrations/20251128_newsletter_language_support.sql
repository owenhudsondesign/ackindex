-- =====================================================
-- Newsletter Language Support Migration
-- Add language preferences for multilingual newsletters
-- =====================================================

-- Add preferred_language to email_subscribers
ALTER TABLE email_subscribers
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'en';

-- Add index for language filtering
CREATE INDEX IF NOT EXISTS idx_email_subscribers_language
ON email_subscribers(preferred_language);

-- Add language-specific content columns to newsletter_triggers
ALTER TABLE newsletter_triggers
ADD COLUMN IF NOT EXISTS html_content_es TEXT,
ADD COLUMN IF NOT EXISTS html_content_pt TEXT,
ADD COLUMN IF NOT EXISTS plain_text_content_es TEXT,
ADD COLUMN IF NOT EXISTS plain_text_content_pt TEXT,
ADD COLUMN IF NOT EXISTS subject_es TEXT,
ADD COLUMN IF NOT EXISTS subject_pt TEXT;

-- Comment for clarity
COMMENT ON COLUMN email_subscribers.preferred_language IS 'User preferred language: en (English), es (Spanish), pt (Portuguese)';
COMMENT ON COLUMN newsletter_triggers.html_content_es IS 'Spanish translation of newsletter HTML content';
COMMENT ON COLUMN newsletter_triggers.html_content_pt IS 'Portuguese translation of newsletter HTML content';
