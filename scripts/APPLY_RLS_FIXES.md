# Applying RLS Security Fixes

## Critical Security Updates

These migrations fix vulnerabilities where any authenticated user could access ANY other user's data.

## Option 1: Apply via Script (Recommended)

```bash
npx tsx scripts/apply-rls-fixes.ts
```

## Option 2: Apply Manually via Supabase SQL Editor

If the script doesn't work, apply each migration manually:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to: SQL Editor
3. Copy and paste each migration file in order:

### Migration 1: Fix Documents Table
```
supabase/migrations/20251031_fix_documents_rls.sql
```

### Migration 2: Fix Document Chunks Table
```
supabase/migrations/20251031_fix_document_chunks_rls.sql
```

### Migration 3: Fix Scrape Jobs Table
```
supabase/migrations/20251031_fix_scrape_jobs_rls.sql
```

4. Click "Run" for each migration
5. Verify no errors appear

## What These Migrations Do

**Before:** Any authenticated user could read/modify/delete ANY user's documents
**After:** Users can ONLY access their own documents

### Specific Changes:

1. **Documents Table**
   - ❌ Old: `USING (true)` - anyone can access
   - ✅ New: `USING (created_by = auth.uid())` - only owner can access

2. **Document Chunks Table**
   - ❌ Old: `USING (true)` - anyone can access
   - ✅ New: Checks document ownership via JOIN

3. **Scrape Jobs Table**
   - ❌ Old: `USING (true)` - anyone can access
   - ✅ New: Checks document ownership via JOIN

## Testing After Migration

Create two test users and verify:
1. User A cannot see User B's documents
2. User A cannot modify User B's documents
3. User A can still see their own documents
4. Admin operations still work (via service role)

## Rollback (if needed)

If something breaks, you can rollback by re-applying the original policies from:
```
supabase-schema.sql (lines 138-191)
```

However, this will restore the security vulnerability!
