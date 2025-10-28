# Supabase SQL Migrations Guide

## Overview

AckIndex requires two SQL migrations to be run in Supabase:

1. **Initial Schema** (`supabase-schema.sql`) - Base tables, RLS policies, and indexes
2. **Stage 8 Migration** (`supabase-migration-stage8.sql`) - Vector embeddings support

---

## Migration 1: Initial Schema

**File:** `supabase-schema.sql`

**What it does:**
- Creates `documents` table for storing document metadata
- Creates `document_chunks` table for storing parsed content chunks
- Creates `scrape_jobs` table for tracking Apify scraping jobs
- Sets up Row Level Security (RLS) policies
- Creates indexes for performance
- Adds helper functions

**Tables created:**
- `documents` - Main document metadata and status
- `document_chunks` - Parsed content chunks for RAG
- `scrape_jobs` - Apify job tracking

**How to run:**
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `supabase-schema.sql`
3. Paste into SQL Editor
4. Click **Run**
5. Verify no errors

**Verify installation:**
```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_name IN ('documents', 'document_chunks', 'scrape_jobs');

-- Should return 3 rows
```

---

## Migration 2: Stage 8 Vector Embeddings

**File:** `supabase-migration-stage8.sql`

**What it does:**
- Enables `pgvector` extension for vector similarity search
- Adds `embedding` column to `document_chunks` table (1536-dimensional vectors)
- Creates IVFFlat index for fast similarity search
- Adds helper functions for semantic and hybrid search
- Creates `embedding_stats` view for monitoring
- Updates RLS policies

**Key features:**
- **pgvector extension** - Enables vector operations in PostgreSQL
- **Vector column** - Stores OpenAI embeddings (1536 dimensions)
- **Similarity index** - IVFFlat index for fast nearest-neighbor search
- **Search functions** - `search_similar_chunks()` and `hybrid_search_chunks()`
- **Statistics view** - `embedding_stats` for monitoring embedding coverage

**How to run:**
1. In Supabase SQL Editor
2. Copy entire contents of `supabase-migration-stage8.sql`
3. Paste and click **Run**
4. Verify success message appears

**Verify installation:**
```sql
-- Check pgvector extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check embedding column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'document_chunks' 
  AND column_name = 'embedding';
-- Should show: embedding | USER-DEFINED

-- Check embedding stats
SELECT * FROM embedding_stats;
```

---

## Complete SQL to Run

### Full Schema + Stage 8 Migration

If you want to run everything at once, you can combine both files:

1. Run `supabase-schema.sql` first
2. Then run `supabase-migration-stage8.sql`

**DO NOT** run them simultaneously in the same SQL editor query - run separately.

---

## Database Schema Summary

### Documents Table
```sql
documents
├── id (UUID, primary key)
├── source_type (url/pdf)
├── source_url (TEXT)
├── filename (TEXT)
├── title (TEXT)
├── description (TEXT)
├── status (pending/processing/completed/failed)
├── error_message (TEXT)
├── total_chunks (INTEGER)
├── total_tokens (INTEGER)
├── created_at (TIMESTAMP)
├── updated_at (TIMESTAMP)
├── processed_at (TIMESTAMP)
└── created_by (UUID → auth.users)
```

### Document Chunks Table
```sql
document_chunks
├── id (UUID, primary key)
├── document_id (UUID → documents)
├── content (TEXT)
├── chunk_index (INTEGER)
├── metadata (JSONB)
├── embedding (vector(1536)) ← Stage 8 addition
├── created_at (TIMESTAMP)
└── UNIQUE(document_id, chunk_index)
```

### Scrape Jobs Table
```sql
scrape_jobs
├── id (UUID, primary key)
├── document_id (UUID → documents)
├── apify_run_id (TEXT)
├── apify_status (VARCHAR)
├── url (TEXT)
├── config (JSONB)
├── pages_crawled (INTEGER)
├── pdfs_found (INTEGER)
├── created_at (TIMESTAMP)
└── completed_at (TIMESTAMP)
```

---

## Helper Functions

### search_similar_chunks()
Semantic search using vector similarity.

```sql
SELECT * FROM search_similar_chunks(
  '[0.1, 0.2, ...]'::vector(1536),  -- query embedding
  0.7,                                 -- similarity threshold (0-1)
  5                                    -- max results
);
```

### hybrid_search_chunks()
Combines vector similarity + text search.

```sql
SELECT * FROM hybrid_search_chunks(
  '[0.1, 0.2, ...]'::vector(1536),  -- query embedding
  'search terms',                      -- text query
  5                                    -- max results
);
```

### get_recent_activity()
Get recent document activity.

```sql
SELECT * FROM get_recent_activity(10);  -- last 10 documents
```

### embedding_stats (View)
Monitor embedding coverage.

```sql
SELECT * FROM embedding_stats;
-- Returns:
-- total_chunks, chunks_with_embeddings, 
-- chunks_without_embeddings, embedding_percentage
```

---

## Indexes

Performance indexes created:

**Documents table:**
- `idx_documents_status` - Filter by status
- `idx_documents_created_at` - Sort by date
- `idx_documents_source_type` - Filter by type

**Document chunks table:**
- `idx_chunks_document_id` - Lookup by document
- `idx_chunks_content_search` - Full-text search (GIN index)
- `idx_chunks_metadata` - JSONB metadata search (GIN index)
- `idx_chunks_embedding` - Vector similarity search (IVFFlat) ← Stage 8

**Scrape jobs table:**
- `idx_scrape_jobs_document_id` - Lookup by document
- `idx_scrape_jobs_apify_run_id` - Lookup by Apify ID

---

## Security (RLS Policies)

All tables have Row Level Security enabled:

**Documents:**
- ✅ Authenticated users can SELECT (read all documents)
- ✅ Authenticated users can INSERT (create documents)
- ✅ Authenticated users can UPDATE (modify documents)
- ✅ Authenticated users can DELETE (remove documents)

**Document Chunks:**
- ✅ Authenticated users can SELECT (read all chunks)
- ✅ Authenticated users can INSERT (create chunks)

**Scrape Jobs:**
- ✅ Authenticated users can SELECT (read all jobs)
- ✅ Authenticated users can INSERT (create jobs)

**Service Role:**
- ✅ Service role can UPDATE chunks (for embedding generation)

---

## Troubleshooting

### "Extension vector is not installed"
**Error:** `pgvector extension is not installed`

**Fix:**
1. Go to Supabase Dashboard → Database → Extensions
2. Search for "vector"
3. Click "Enable"
4. Return to SQL Editor
5. Re-run `supabase-migration-stage8.sql`

### "Column already exists"
**Error:** `column "embedding" of relation "document_chunks" already exists`

**Cause:** Migration already partially run.

**Fix:** The migration uses `ADD COLUMN IF NOT EXISTS`, so this shouldn't cause errors. If it does, the column already exists - skip this step.

### RLS Policy errors
**Error:** `new row violates row-level security policy`

**Fix:** Check that:
1. User is authenticated
2. RLS policies are installed (run `supabase-schema.sql`)
3. User has a valid session in Supabase

### Index creation timeout
**Error:** Index takes too long to create

**Fix:** This is normal for large tables. Let it run in the background. For datasets > 100K chunks, consider using HNSW index instead of IVFFlat.

---

## Performance Tips

1. **Rebuild index periodically:**
   ```sql
   REINDEX INDEX idx_chunks_embedding;
   ```

2. **For large datasets (>100K chunks):**
   Use HNSW index instead of IVFFlat:
   ```sql
   DROP INDEX IF EXISTS idx_chunks_embedding;
   CREATE INDEX idx_chunks_embedding 
   ON document_chunks 
   USING hnsw (embedding vector_cosine_ops);
   ```

3. **Monitor query performance:**
   ```sql
   EXPLAIN ANALYZE
   SELECT * FROM search_similar_chunks(
     '[0.1, 0.2, ...]'::vector(1536),
     0.7,
     5
   );
   ```

4. **Vacuum and analyze regularly:**
   ```sql
   VACUUM ANALYZE document_chunks;
   ```

---

## Next Steps

After running both migrations:

1. ✅ Verify all tables exist
2. ✅ Check that pgvector extension is enabled
3. ✅ Test the embedding_stats view
4. ✅ Proceed to application setup (see `SETUP-CHECKLIST.md`)

For more information, see:
- `STAGE-8-COMPLETE.md` - Technical documentation
- Supabase Docs: https://supabase.com/docs/guides/database/extensions/pgvector

