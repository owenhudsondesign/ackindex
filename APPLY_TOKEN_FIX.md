# Fix Premium Tokens Remaining Display

## Problem
Premium users see "999,999,999 tokens remaining" instead of the actual remaining tokens.

## Root Cause
The `user_dashboard` view has a hardcoded CASE statement that returns 999,999,999 for premium users instead of calculating the actual remaining tokens.

## Solution
Update the view to calculate actual remaining tokens for all users.

## How to Apply

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Paste the following SQL:

```sql
-- Fix tokens_remaining calculation for premium users
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
```

6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Verify it says "Success. No rows returned"

### Option 2: Command Line Script

```bash
npx tsx scripts/fix-tokens-remaining.ts
```

Note: This may fail if you don't have the `exec_sql` RPC function. Use Option 1 instead.

## Verification

After applying the fix:

1. Go to your account page: https://ackindex.com/account
2. Refresh the page
3. The "tokens remaining" should now show the correct calculation
   - Example: If you've used 9,421 tokens out of 50,000
   - You should see: "40,579 tokens remaining"
   - NOT: "999,999,999 tokens remaining"

## What Changed

**Before:**
```sql
CASE
  WHEN p.subscription_tier = 'premium' THEN 999999999
  ELSE p.monthly_token_limit - COALESCE(ut.total_tokens, 0)
END as tokens_remaining
```

**After:**
```sql
p.monthly_token_limit - COALESCE(ut.total_tokens, 0) as tokens_remaining
```

Now all users (free and premium) see their actual remaining tokens based on their monthly limit minus usage.
