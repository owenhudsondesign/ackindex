-- Fix tokens_remaining calculation for premium users
-- Previously showed 999,999,999 for premium, now shows actual remaining tokens

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
  -- Calculate actual remaining tokens for all users (including premium)
  p.monthly_token_limit - COALESCE(ut.total_tokens, 0) as tokens_remaining
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
LEFT JOIN usage_tracking ut ON u.id = ut.user_id
  AND ut.year = EXTRACT(YEAR FROM NOW())
  AND ut.month = EXTRACT(MONTH FROM NOW());
