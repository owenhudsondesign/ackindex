# Apply Shared Knowledge Base RLS Fix

## IMPORTANT: This Migration Replaces the Previous One

If you already applied the previous RLS migrations (`20251031_fix_documents_rls.sql`, etc.), you **MUST** apply this new migration to fix the overly-restrictive policies.

## What Was Wrong

The previous migrations prevented users from reading documents they didn't create. This broke the chatbot because:
- ❌ Admins upload documents (created_by = admin_id)
- ❌ Regular users couldn't read those documents
- ❌ Chatbot couldn't search the knowledge base

## The Fix: Shared Knowledge Base Model

This migration implements the correct model:

### Read Access (SELECT) - ✅ OPEN
- **ALL authenticated users** can read ALL documents
- **ALL authenticated users** can read ALL chunks
- **ALL authenticated users** can see scrape jobs
- This allows the chatbot to work for everyone

### Write Access (INSERT/UPDATE/DELETE) - 🔒 RESTRICTED
- **ONLY document owners** can modify their documents
- **ONLY document owners** can modify chunks in their documents
- **ONLY document owners** can modify scrape jobs for their documents
- Admins typically own all content

## How to Apply

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard → Your Project → SQL Editor
2. Copy the contents of: `supabase/migrations/20251031_fix_rls_shared_knowledge_base.sql`
3. Paste and run
4. Verify no errors

### Option 2: Via Script

```bash
npx tsx scripts/apply-rls-fixes.ts
```

## What This Changes

### Documents Table
```sql
-- ❌ OLD (Too restrictive):
USING (created_by = auth.uid())  -- Only read YOUR documents

-- ✅ NEW (Shared KB):
USING (true)  -- Read ALL documents
```

### Document Chunks Table
```sql
-- ❌ OLD:
USING (created_by = auth.uid())  -- Only read YOUR chunks

-- ✅ NEW:
USING (true)  -- Read ALL chunks (for search)
```

### Scrape Jobs Table
```sql
-- ❌ OLD:
USING (created_by = auth.uid())  -- Only read YOUR jobs

-- ✅ NEW:
USING (true)  -- Read ALL jobs (for transparency)
```

## Testing After Migration

1. **As Admin**: Upload a document
2. **As Regular User**:
   - ✅ Should be able to search/query that document in chatbot
   - ✅ Should be able to see the document in search results
   - ❌ Should NOT be able to delete the document
   - ❌ Should NOT be able to modify the document

## Security Notes

### What's Still Protected
- ✅ Only admins can access `/admin` routes (we added auth checks)
- ✅ Only admins can upload/scrape content
- ✅ Only admins can trigger scraping
- ✅ Only document owners can modify their content
- ✅ Service role operations are protected

### What's Shared (By Design)
- 📖 All authenticated users can READ all documents
- 📖 All authenticated users can SEARCH all content
- 📖 All authenticated users can USE the chatbot

This is the correct model for a shared knowledge base chatbot!
