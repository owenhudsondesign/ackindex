-- ================================================================
-- Fix Critical Security Issue: user_dashboard exposes auth.users
-- Issue: Current view exposes u.email from auth.users to all roles
-- Solution: Remove email from view, fetch on server-side instead
-- Date: 2025-01-13
-- ================================================================

-- STEP 1: Drop existing view
DROP VIEW IF EXISTS public.user_dashboard;

-- STEP 2: Recreate view WITHOUT email (email will be fetched server-side)
-- This view now only uses user_profiles and usage_tracking which have proper RLS
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
-- VERIFICATION QUERIES (run these after migration)
-- ================================================================

/*
-- Test 1: Verify view works for authenticated users
SELECT * FROM user_dashboard;  -- Should show current user's data

-- Test 2: Verify anon role cannot access
SET ROLE anon;
SELECT * FROM user_dashboard;  -- Should return 0 rows or error
RESET ROLE;

-- Test 3: Verify no direct access to auth.users
SET ROLE authenticated;
SELECT * FROM auth.users;  -- Should ERROR
RESET ROLE;

-- Test 4: Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_profiles', 'usage_tracking');
-- Both should show rowsecurity = true
*/

-- ================================================================
-- APPLICATION CODE CHANGE REQUIRED
-- ================================================================

/*
IMPORTANT: Update src/lib/userProfile.ts

The getUserDashboard() function needs to fetch email from auth.users
separately using the service role client:

export async function getUserDashboard(userId: string): Promise<UserDashboard | null> {
  // Fetch dashboard data (no email)
  const { data: dashboardData, error: dashboardError } = await supabaseAdmin
    .from('user_dashboard')
    .select('*')
    .eq('id', userId)
    .single();

  if (dashboardError) {
    logger.error({ error: dashboardError, userId }, 'Error fetching user dashboard');
    return null;
  }

  // Fetch email from auth.users (server-side only, using service role)
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

  if (userError) {
    logger.error({ error: userError, userId }, 'Error fetching user email');
    return null;
  }

  // Combine the data
  return {
    ...dashboardData,
    email: userData.user.email || '',
  };
}

WHY THIS IS SECURE:
- View doesn't expose auth.users (anon/authenticated can't access it)
- Email is fetched server-side using service role (secure)
- Client never has direct access to auth.users table
- RLS policies enforce user can only see their own data

ALTERNATIVE OPTION (if you want email in view):
Add an email column to user_profiles and sync it from auth.users:

-- Migration: Add email to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Sync existing emails
UPDATE user_profiles p
SET email = (SELECT email FROM auth.users u WHERE u.id = p.id);

-- Create trigger to keep email in sync
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_email();

Then update the view to include p.email instead of u.email.
*/
