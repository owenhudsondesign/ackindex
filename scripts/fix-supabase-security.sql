-- ================================================================
-- Supabase Security Fixes
-- Run these in Supabase SQL Editor
-- ================================================================

-- ================================================================
-- STEP 1: INVESTIGATE - Check current state
-- ================================================================

-- 1.1 Check what user_dashboard exposes
SELECT * FROM user_dashboard LIMIT 3;

-- 1.2 Get view definition
SELECT pg_get_viewdef('public.user_dashboard'::regclass, true);

-- 1.3 Test as anon role (should fail or not show auth data)
SET ROLE anon;
SELECT * FROM user_dashboard LIMIT 1;
RESET ROLE;

-- 1.4 List all SECURITY DEFINER views
SELECT
  schemaname,
  viewname,
  viewowner,
  pg_get_viewdef((schemaname || '.' || viewname)::regclass, true) as definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('user_dashboard', 'embedding_stats', 'entry_stats');

-- ================================================================
-- STEP 2: FIX CRITICAL ISSUES
-- ================================================================

-- 2.1 Fix user_dashboard (Option A: Remove SECURITY DEFINER)
-- First, backup the current definition
-- SELECT pg_get_viewdef('public.user_dashboard'::regclass, true);

-- Then recreate without SECURITY DEFINER
-- NOTE: Replace this with your actual view definition
/*
CREATE OR REPLACE VIEW public.user_dashboard AS
SELECT
  up.id,
  up.full_name,
  up.subscription_tier,
  up.monthly_token_limit,
  up.tokens_used_this_month,
  up.tokens_remaining_this_month,
  -- DO NOT include: up.email, auth.users columns
  up.created_at,
  up.updated_at
FROM user_profiles up
WHERE up.id = auth.uid();  -- Only show current user's data
*/

-- 2.2 Fix embedding_stats (if it uses SECURITY DEFINER)
-- Get current definition first:
SELECT pg_get_viewdef('public.embedding_stats'::regclass, true);

-- Recreate without SECURITY DEFINER if safe to do so

-- 2.3 Fix entry_stats (if it uses SECURITY DEFINER)
-- Get current definition first:
SELECT pg_get_viewdef('public.entry_stats'::regclass, true);

-- Recreate without SECURITY DEFINER if safe to do so

-- ================================================================
-- STEP 3: FIX HIGH PRIORITY FUNCTIONS (search_path)
-- ================================================================

-- 3.1 Fix search_similar_chunks (CRITICAL - used in every query)
-- Get current definition first
SELECT pg_get_functiondef('public.search_similar_chunks'::regproc);

-- Then add SET search_path
-- Example template (adjust to your actual function):
/*
CREATE OR REPLACE FUNCTION public.search_similar_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  chunk_index int,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.chunk_index,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
*/

-- 3.2 Fix can_user_query
-- Get definition
SELECT pg_get_functiondef('public.can_user_query'::regproc);

-- Add SET search_path = public, pg_temp

-- 3.3 Fix record_usage
-- Get definition
SELECT pg_get_functiondef('public.record_usage'::regproc);

-- Add SET search_path = public, pg_temp

-- 3.4 Fix is_admin
-- Get definition
SELECT pg_get_functiondef('public.is_admin'::regproc);

-- Add SET search_path = public, pg_temp

-- 3.5 Fix handle_new_user (trigger function)
-- Get definition
SELECT pg_get_functiondef('public.handle_new_user'::regproc);

-- Add SET search_path = public, pg_temp

-- ================================================================
-- STEP 4: VERIFY FIXES
-- ================================================================

-- 4.1 Verify auth.users not exposed to anon
SET ROLE anon;
SELECT * FROM auth.users LIMIT 1;  -- Should ERROR
RESET ROLE;

-- 4.2 Verify user_dashboard doesn't leak data
SET ROLE anon;
SELECT * FROM user_dashboard LIMIT 1;  -- Should ERROR or return no rows
RESET ROLE;

-- 4.3 Verify functions have search_path set
SELECT
  proname as function_name,
  prosecdef as is_security_definer,
  proconfig as config
FROM pg_proc
WHERE proname IN (
  'search_similar_chunks',
  'can_user_query',
  'record_usage',
  'is_admin',
  'handle_new_user'
)
AND pronamespace = 'public'::regnamespace;
-- proconfig should show: {search_path=public,pg_temp}

-- 4.4 Verify RLS enabled on critical tables
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'user_profiles',
    'documents',
    'document_chunks',
    'query_logs',
    'conversations',
    'conversation_messages'
  )
ORDER BY tablename;
-- All should have rls_enabled = true

-- ================================================================
-- STEP 5: TESTING QUERIES
-- ================================================================

-- 5.1 Test that search still works
SELECT * FROM search_similar_chunks(
  (SELECT embedding FROM document_chunks LIMIT 1),
  0.7,
  5
);

-- 5.2 Test user can see only their own data
SET ROLE authenticated;
SET request.jwt.claim.sub = 'some-user-id';  -- Replace with real user ID
SELECT * FROM user_profiles WHERE id = current_setting('request.jwt.claim.sub')::uuid;
RESET ROLE;

-- 5.3 Test admin functions work
-- (As admin user)
SELECT is_admin();

-- ================================================================
-- NOTES
-- ================================================================

/*
IMPORTANT:
1. Backup your database before making changes
2. Test in staging/dev first
3. Some views may NEED SECURITY DEFINER for admin operations
4. Review each function's purpose before changing

SECURITY DEFINER is OK when:
- Function is admin-only (has proper access controls)
- Needs to bypass RLS for legitimate aggregations
- Properly validates all inputs

SECURITY DEFINER is NOT OK when:
- User-facing function without input validation
- Exposes auth.users or other sensitive data
- No access controls on who can call it

For production:
1. Fix user_dashboard first (BLOCKER)
2. Review and fix SECURITY DEFINER views
3. Add search_path to critical functions
4. Test thoroughly
5. Monitor for errors after deployment
*/
