# Supabase Security & Performance Issues

**Generated**: 2025-01-13
**Source**: Supabase Database Linter

---

## 🚨 CRITICAL (ERROR Level) - Must Fix Before Launch

### 1. **Exposed Auth Users** ❌ BLOCKER
**Issue**: View `user_dashboard` in the public schema may expose `auth.users` data to anon or authenticated roles.

**Risk**: HIGH - User email addresses, metadata, and potentially sensitive auth data could be exposed.

**Fix**:
```sql
-- Option 1: Add RLS to the view (recommended)
-- Check what user_dashboard returns
SELECT * FROM user_dashboard LIMIT 1;

-- Option 2: Remove the view if not needed
DROP VIEW IF EXISTS public.user_dashboard;

-- Option 3: Recreate without exposing auth.users directly
-- Use joins with proper RLS instead
```

**Priority**: 🔴 CRITICAL - Fix immediately

---

### 2. **Security Definer Views** ❌ BLOCKER
**Issue**: 3 views defined with SECURITY DEFINER:
- `public.embedding_stats`
- `public.user_dashboard`
- `public.entry_stats`

**Risk**: MEDIUM-HIGH - These views run with creator's permissions, bypassing RLS.

**Why It's Dangerous**:
- If exploited, users could access data they shouldn't see
- Bypasses Row Level Security policies
- Can be used for privilege escalation

**Fix**:
```sql
-- Check if SECURITY DEFINER is actually needed
-- If not, recreate views without it:

-- 1. Check current definition
\d+ public.user_dashboard

-- 2. Recreate without SECURITY DEFINER
CREATE OR REPLACE VIEW public.user_dashboard AS
  -- your view query here
  -- Make sure it respects RLS
;

-- Repeat for:
-- - embedding_stats
-- - entry_stats
```

**When SECURITY DEFINER is OK**:
- Admin-only operations that need elevated permissions
- Must be carefully reviewed and restricted

**Priority**: 🔴 CRITICAL - Review and fix before launch

---

## ⚠️ HIGH PRIORITY (WARN Level) - Should Fix Soon

### 3. **Function Search Path Mutable** ⚠️
**Issue**: 33 functions don't have fixed `search_path`, including critical ones:
- `search_similar_chunks` (used in every query!)
- `can_user_query`
- `record_usage`
- `is_admin`
- `handle_new_user`

**Risk**: MEDIUM - Potential for schema hijacking attacks

**Attack Scenario**:
```sql
-- Attacker creates malicious function in their schema
CREATE SCHEMA attacker;
CREATE FUNCTION attacker.now() RETURNS text AS 'SELECT secret FROM auth.users' LANGUAGE sql;

-- If search_path is mutable, this could be called instead of pg_catalog.now()
```

**Fix** (for each function):
```sql
-- Example for search_similar_chunks
CREATE OR REPLACE FUNCTION public.search_similar_chunks(...)
RETURNS ... AS $$
  -- function body
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;  -- ← Add this line

-- Repeat for all 33 functions
```

**Priority**: 🟡 HIGH - Should fix within 1-2 weeks

---

### 4. **Extensions in Public Schema** ⚠️
**Issue**: `pg_trgm` and `vector` installed in public schema

**Risk**: LOW-MEDIUM - Recommended to move to separate schema

**Fix**:
```sql
-- Create extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move extensions (requires superuser or extension owner)
-- WARNING: This might break existing queries if they don't schema-qualify
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
ALTER EXTENSION vector SET SCHEMA extensions;

-- Update search_path to include extensions schema
ALTER DATABASE postgres SET search_path TO public, extensions;
```

**Note**: This may require updating function definitions to reference `extensions.vector` type.

**Priority**: 🟡 MEDIUM - Can defer to post-launch

---

### 5. **Leaked Password Protection Disabled** ⚠️
**Issue**: HaveIBeenPwned password checking is disabled

**Risk**: LOW - Users can use compromised passwords

**Fix** (in Supabase Dashboard):
```
1. Go to Authentication → Policies
2. Enable "Leaked Password Protection"
3. Set minimum password strength requirements
```

**Priority**: 🟢 LOW - Nice to have, enable when convenient

---

## 📋 Action Plan

### Phase 1: Critical Fixes (Before Launch)
- [ ] **Investigate `user_dashboard` view** - What does it expose?
- [ ] **Fix or remove `user_dashboard`** - Ensure no auth.users data leaks
- [ ] **Review SECURITY DEFINER views** - Remove if not needed
- [ ] **Test auth data access** - Verify anon role can't see user emails

**Time Estimate**: 2-4 hours

---

### Phase 2: High Priority (Post-Launch Week 1)
- [ ] **Fix search_path for critical functions** (start with these):
  - `search_similar_chunks`
  - `can_user_query`
  - `record_usage`
  - `is_admin`
  - `handle_new_user`

**Time Estimate**: 3-5 hours

---

### Phase 3: Remaining Warnings (Post-Launch Month 1)
- [ ] **Fix remaining 28 functions** - Add search_path
- [ ] **Move extensions to separate schema** - If beneficial
- [ ] **Enable leaked password protection** - In Supabase dashboard

**Time Estimate**: 2-3 hours

---

## 🔍 How to Investigate

### Check user_dashboard exposure:
```sql
-- See what the view returns
SELECT * FROM user_dashboard LIMIT 5;

-- Check view definition
SELECT pg_get_viewdef('public.user_dashboard'::regclass, true);

-- Test as anon role
SET ROLE anon;
SELECT * FROM user_dashboard;
RESET ROLE;
```

### Check SECURITY DEFINER views:
```sql
-- List all SECURITY DEFINER views
SELECT
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views
WHERE definition ILIKE '%security definer%'
  AND schemaname = 'public';
```

### Verify RLS is enabled:
```sql
-- Check which tables have RLS enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## 📚 Resources

- [Supabase Security Best Practices](https://supabase.com/docs/guides/database/database-linter)
- [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Search Path Security](https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH)

---

## ✅ Testing After Fixes

```sql
-- 1. Verify auth.users not exposed
SET ROLE anon;
SELECT * FROM auth.users LIMIT 1;  -- Should fail
SELECT * FROM user_dashboard LIMIT 1;  -- Should not expose auth data
RESET ROLE;

-- 2. Verify functions have search_path
SELECT
  proname,
  prosecdef,
  proconfig
FROM pg_proc
WHERE proname = 'search_similar_chunks';
-- Should show search_path in proconfig

-- 3. Verify RLS on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;
-- Should return empty or only tables that intentionally don't need RLS
```
