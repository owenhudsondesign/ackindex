-- =====================================================
-- AckIndex Stage 9: User Profiles, Subscriptions & Usage Tracking
-- =====================================================

-- =====================================================
-- USER PROFILES TABLE
-- Extended user information beyond auth.users
-- =====================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic info
  full_name TEXT,
  
  -- Email preferences
  email_updates_enabled BOOLEAN DEFAULT false,
  email_updates_frequency VARCHAR(20) DEFAULT 'weekly' CHECK (email_updates_frequency IN ('daily', 'weekly', 'monthly')),
  
  -- Subscription info
  subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'past_due', 'trialing')),
  
  -- Usage limits
  monthly_token_limit INTEGER DEFAULT 10000, -- Free tier: 10k tokens/month
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_starts_at TIMESTAMP WITH TIME ZONE,
  subscription_ends_at TIMESTAMP WITH TIME ZONE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer ON user_profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_tier ON user_profiles(subscription_tier);

-- =====================================================
-- USAGE TRACKING TABLE
-- Track token usage per user per month
-- =====================================================
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User reference
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Usage period
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  
  -- Token usage
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  
  -- Query count
  query_count INTEGER DEFAULT 0,
  
  -- Cost tracking (in cents)
  estimated_cost_cents INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one record per user per month
  CONSTRAINT unique_user_month UNIQUE (user_id, year, month)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period ON usage_tracking(year, month);

-- =====================================================
-- SUBSCRIPTION HISTORY TABLE
-- Track subscription changes over time
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User reference
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Subscription details
  tier VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  stripe_subscription_id TEXT,
  stripe_invoice_id TEXT,
  
  -- Pricing
  amount_cents INTEGER,
  currency VARCHAR(3) DEFAULT 'usd',
  
  -- Event details
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'subscription_created',
    'subscription_updated',
    'subscription_cancelled',
    'payment_succeeded',
    'payment_failed',
    'tier_upgraded',
    'tier_downgraded'
  )),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user history
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at DESC);

-- =====================================================
-- EMAIL SUBSCRIBERS TABLE
-- Separate table for newsletter subscribers (may or may not have accounts)
-- =====================================================
CREATE TABLE IF NOT EXISTS email_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Email info
  email TEXT UNIQUE NOT NULL,
  
  -- User reference (if they have an account)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Subscription preferences
  is_subscribed BOOLEAN DEFAULT true,
  frequency VARCHAR(20) DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  
  -- Topics (for future segmentation)
  topics TEXT[] DEFAULT ARRAY['general', 'town_updates'],
  
  -- Verification
  verified BOOLEAN DEFAULT false,
  verification_token TEXT UNIQUE,
  
  -- Timestamps
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  last_email_sent_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_subscribers_email ON email_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_user_id ON email_subscribers(user_id);
CREATE INDEX IF NOT EXISTS idx_email_subscribers_subscribed ON email_subscribers(is_subscribed) WHERE is_subscribed = true;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Auto-create user profile when user signs up
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Function to get or create current month's usage record
CREATE OR REPLACE FUNCTION get_current_usage(p_user_id UUID)
RETURNS usage_tracking AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM NOW());
  current_month INTEGER := EXTRACT(MONTH FROM NOW());
  usage_record usage_tracking;
BEGIN
  -- Try to get existing record
  SELECT * INTO usage_record
  FROM usage_tracking
  WHERE user_id = p_user_id
    AND year = current_year
    AND month = current_month;
  
  -- If not exists, create it
  IF NOT FOUND THEN
    INSERT INTO usage_tracking (user_id, year, month)
    VALUES (p_user_id, current_year, current_month)
    RETURNING * INTO usage_record;
  END IF;
  
  RETURN usage_record;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can make a query (has tokens remaining)
CREATE OR REPLACE FUNCTION can_user_query(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_limit INTEGER;
  current_usage INTEGER;
  user_tier VARCHAR(20);
BEGIN
  -- Get user's tier and limit
  SELECT subscription_tier, monthly_token_limit
  INTO user_tier, user_limit
  FROM user_profiles
  WHERE id = p_user_id;
  
  -- Premium users have unlimited usage
  IF user_tier = 'premium' THEN
    RETURN true;
  END IF;
  
  -- Get current month's usage
  SELECT COALESCE(total_tokens, 0)
  INTO current_usage
  FROM usage_tracking
  WHERE user_id = p_user_id
    AND year = EXTRACT(YEAR FROM NOW())
    AND month = EXTRACT(MONTH FROM NOW());
  
  -- Check if under limit
  RETURN COALESCE(current_usage, 0) < user_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to record usage
CREATE OR REPLACE FUNCTION record_usage(
  p_user_id UUID,
  p_input_tokens INTEGER,
  p_output_tokens INTEGER,
  p_cost_cents INTEGER DEFAULT 0
)
RETURNS void AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM NOW());
  current_month INTEGER := EXTRACT(MONTH FROM NOW());
BEGIN
  INSERT INTO usage_tracking (
    user_id,
    year,
    month,
    input_tokens,
    output_tokens,
    total_tokens,
    query_count,
    estimated_cost_cents
  )
  VALUES (
    p_user_id,
    current_year,
    current_month,
    p_input_tokens,
    p_output_tokens,
    p_input_tokens + p_output_tokens,
    1,
    p_cost_cents
  )
  ON CONFLICT (user_id, year, month)
  DO UPDATE SET
    input_tokens = usage_tracking.input_tokens + p_input_tokens,
    output_tokens = usage_tracking.output_tokens + p_output_tokens,
    total_tokens = usage_tracking.total_tokens + (p_input_tokens + p_output_tokens),
    query_count = usage_tracking.query_count + 1,
    estimated_cost_cents = usage_tracking.estimated_cost_cents + p_cost_cents,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_usage_tracking_updated_at ON usage_tracking;
CREATE TRIGGER update_usage_tracking_updated_at
  BEFORE UPDATE ON usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;

-- User Profiles: Users can read/update their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Service role can do anything (for webhooks)
CREATE POLICY "Service role full access to profiles"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true);

-- Usage Tracking: Users can view their own usage
CREATE POLICY "Users can view own usage"
  ON usage_tracking
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access to usage"
  ON usage_tracking
  FOR ALL
  TO service_role
  USING (true);

-- Subscription History: Users can view their own history
CREATE POLICY "Users can view own subscription history"
  ON subscription_history
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role full access to history"
  ON subscription_history
  FOR ALL
  TO service_role
  USING (true);

-- Email Subscribers: Only service role can access
CREATE POLICY "Service role full access to subscribers"
  ON email_subscribers
  FOR ALL
  TO service_role
  USING (true);

-- =====================================================
-- HELPER VIEWS
-- =====================================================

-- View for user dashboard
CREATE OR REPLACE VIEW user_dashboard AS
SELECT
  u.id,
  u.email,
  p.full_name,
  p.subscription_tier,
  p.subscription_status,
  p.monthly_token_limit,
  p.email_updates_enabled,
  COALESCE(ut.total_tokens, 0) as tokens_used_this_month,
  COALESCE(ut.query_count, 0) as queries_this_month,
  CASE
    WHEN p.subscription_tier = 'premium' THEN 999999999
    ELSE p.monthly_token_limit - COALESCE(ut.total_tokens, 0)
  END as tokens_remaining
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
LEFT JOIN usage_tracking ut ON u.id = ut.user_id
  AND ut.year = EXTRACT(YEAR FROM NOW())
  AND ut.month = EXTRACT(MONTH FROM NOW());

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Set default limits for existing users (if any)
-- This will run once during migration
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM auth.users WHERE id NOT IN (SELECT id FROM user_profiles)
  LOOP
    INSERT INTO user_profiles (id)
    VALUES (user_record.id);
  END LOOP;
END $$;

-- =====================================================
-- NOTES
-- =====================================================

/*
Pricing Tiers:

FREE TIER:
- 10,000 tokens per month (~25-30 queries)
- Email updates opt-in
- Basic chat access

PREMIUM TIER ($9.99/month):
- Unlimited tokens
- Priority support
- Early access to new features
- Advanced search features

To check user's current usage:
SELECT * FROM user_dashboard WHERE id = 'user-uuid';

To check if user can query:
SELECT can_user_query('user-uuid');

To record usage after a chat:
SELECT record_usage('user-uuid', 500, 200, 1);
*/

