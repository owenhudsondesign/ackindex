-- =====================================================
-- Newsletter System Migration
-- Tables for email subscribers and newsletter triggers
-- =====================================================

-- =====================================================
-- EMAIL SUBSCRIBERS TABLE
-- Separate table for newsletter subscribers (may or may not have accounts)
-- Dreamlit queries this to get recipient list
-- =====================================================
CREATE TABLE IF NOT EXISTS email_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Email info
  email TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional link to user account

  -- Subscription preferences
  is_subscribed BOOLEAN DEFAULT true,
  frequency VARCHAR(20) DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  topics TEXT[] DEFAULT ARRAY['general', 'town_updates'],

  -- Verification (for non-account subscribers)
  verified BOOLEAN DEFAULT false,
  verification_token TEXT UNIQUE,

  -- Timestamps
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  last_email_sent_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for email_subscribers
CREATE INDEX IF NOT EXISTS idx_email_subscribers_email ON email_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_user_id ON email_subscribers(user_id);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_subscribed ON email_subscribers(is_subscribed) WHERE is_subscribed = true;
CREATE INDEX IF NOT EXISTS idx_email_subscribers_frequency ON email_subscribers(frequency);

-- RLS for email_subscribers
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotent migrations)
DROP POLICY IF EXISTS "Users can view own subscription" ON email_subscribers;
DROP POLICY IF EXISTS "Users can update own subscription" ON email_subscribers;
DROP POLICY IF EXISTS "Service role full access to subscribers" ON email_subscribers;

-- Users can view and update their own subscription
CREATE POLICY "Users can view own subscription"
  ON email_subscribers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own subscription"
  ON email_subscribers
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Service role full access (for Dreamlit and admin operations)
CREATE POLICY "Service role full access to subscribers"
  ON email_subscribers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- NEWSLETTER TRIGGERS TABLE
-- Dreamlit listens to this for sending newsletters
-- =====================================================

-- Create newsletter_triggers table
-- Dreamlit will watch this table and send emails when rows are inserted
CREATE TABLE IF NOT EXISTS newsletter_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Newsletter content
  subject TEXT NOT NULL,
  preview_text TEXT, -- Email preview text (shown in inbox)
  html_content TEXT NOT NULL, -- Full HTML email content
  plain_text_content TEXT, -- Plain text fallback

  -- Metadata for Dreamlit
  newsletter_type VARCHAR(50) NOT NULL DEFAULT 'weekly_summary',
  week_start DATE, -- Start of the week being summarized
  week_end DATE, -- End of the week being summarized

  -- Meeting stats for the week
  meetings_count INTEGER DEFAULT 0,
  meeting_types TEXT[], -- Array of meeting types included

  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,

  -- Who triggered it
  triggered_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_newsletter_triggers_status ON newsletter_triggers(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_triggers_created_at ON newsletter_triggers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_triggers_type ON newsletter_triggers(newsletter_type);

-- Row Level Security
ALTER TABLE newsletter_triggers ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read newsletter triggers
CREATE POLICY "Admins can read newsletter triggers"
  ON newsletter_triggers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Policy: Only admins can insert newsletter triggers
CREATE POLICY "Admins can insert newsletter triggers"
  ON newsletter_triggers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Policy: Service role can do everything (for Dreamlit webhooks)
CREATE POLICY "Service role full access"
  ON newsletter_triggers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comment
COMMENT ON TABLE newsletter_triggers IS 'Triggers for Dreamlit to send weekly summary newsletters';
