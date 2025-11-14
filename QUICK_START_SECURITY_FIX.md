# 🚀 Quick Start: Deploy Security Fix (15 min)

## Step 1: Run Database Migration (2 min)

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to: **SQL Editor**
3. Open this file: `supabase/migrations/20250113_fix_user_dashboard_security_v2.sql`
4. **Copy ALL contents** and paste into SQL Editor
5. Click **"Run"**
6. ✅ Verify: "Success. No rows returned"

---

## Step 2: Push to Production (3 min)

```bash
# The fix is already committed
git push origin main

# Vercel will auto-deploy in ~2 minutes
# Watch deployment at: https://vercel.com/dashboard
```

---

## Step 3: Verify Fix Worked (5 min)

### In Supabase SQL Editor:

```sql
-- Test 1: Anon role should NOT see data
SET ROLE anon;
SELECT * FROM user_dashboard;  -- Expected: 0 rows
RESET ROLE;

-- Test 2: Verify RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'usage_tracking');
-- Expected: Both show rowsecurity = true
```

### In Your App:

1. Go to https://ackindex.com/account (or your domain)
2. Log in
3. Check that:
   - ✅ Email displays correctly
   - ✅ Token usage shows correctly
   - ✅ No errors in console (F12)

---

## Step 4: Verify Supabase Linter (2 min)

1. Supabase Dashboard → **Database** → **Linter**
2. Look for: `auth_users_exposed`
3. ✅ Should be **GONE** from the list

---

## ✅ Done!

If all 4 steps passed, the critical security issue is fixed.

## 🆘 If Something Breaks

See rollback instructions in: `DEPLOY_SECURITY_FIX.md`

---

## 📚 Full Documentation

- **This file**: Quick 15-min deployment
- **DEPLOY_SECURITY_FIX.md**: Detailed deployment guide with rollback
- **SECURITY_FIX_SUMMARY.md**: What was changed and why
- **SECURITY_ISSUES_SUMMARY.md**: All Supabase security issues
