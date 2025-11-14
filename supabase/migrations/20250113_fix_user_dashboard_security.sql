-- ================================================================
-- Fix Critical Security Issue: user_dashboard exposes auth.users
-- Issue: Current view exposes u.email from auth.users to all roles
-- Solution: Remove auth.users dependency, use only user_profiles
-- Date: 2025-01-13
-- ================================================================

-- STEP 1: Drop existing view
DROP VIEW IF EXISTS public.user_dashboard;

-- STEP 2: Recreate view WITHOUT auth.users dependency
-- This view now only uses user_profiles which has proper RLS
CREATE OR REPLACE VIEW public.user_dashboard
WITH (security_invoker = true)  -- Use caller's permissions, not creator's
AS
SELECT
  p.id,
  p.full_name,
  p.subscription_tier,
  p.subscription_status,
  p.monthly_token_limit,
  p.email_updates_enabled,
  COALESCE(ut.total_tokens, 0) as tokens_used_this_month,
  COALESCE(ut.query_count, 0) as queries_this_month,
  -- Calculate actual remaining tokens for all users (including premium)
  p.monthly_token_limit - COALESCE(ut.total_tokens, 0) as tokens_remaining,
  p.created_at,
  p.updated_at
FROM user_profiles p
LEFT JOIN usage_tracking ut ON p.id = ut.user_id
  AND ut.year = EXTRACT(YEAR FROM NOW())
  AND ut.month = EXTRACT(MONTH FROM NOW())
WHERE p.id = auth.uid();  -- CRITICAL: Only show current user's own data

-- STEP 3: Grant access only to authenticated users
GRANT SELECT ON public.user_dashboard TO authenticated;

-- STEP 4: Ensure user_profiles has RLS enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- STEP 5: Verify/create RLS policy on user_profiles
-- Users can only see their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;

CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- STEP 6: Verify/create RLS policy on usage_tracking
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own usage" ON usage_tracking;

CREATE POLICY "Users can view own usage"
  ON usage_tracking
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ================================================================
-- NOTES:
-- ================================================================
/*
WHAT WAS FIXED:
1. Removed u.email from auth.users (was security leak)
2. Added WHERE p.id = auth.uid() to ensure users only see their own data
3. Changed to security_invoker=true (use caller's permissions, not view creator's)
4. Added explicit RLS policies on underlying tables
5. Email is already in user_profiles if needed, access via application code

WHY THIS IS SECURE:
- View only accesses user_profiles and usage_tracking (both have RLS)
- WHERE clause restricts to current user's data only
- security_invoker means RLS policies are enforced
- anon role has no access (not granted)
- authenticated users can only see their own data

IF EMAIL IS NEEDED:
- Email is stored in user_profiles.email (if you added it)
- Or fetch from auth.users in application code (server-side only)
- Never expose auth.users in views accessible to client

TESTING:
-- As authenticated user (should see own data)
SELECT * FROM user_dashboard;

-- As anon (should see nothing)
SET ROLE anon;
SELECT * FROM user_dashboard;  -- Should return 0 rows or error
RESET ROLE;
*/
