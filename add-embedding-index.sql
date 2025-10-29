-- =====================================================
-- Add IVFFlat Index for Embedding Performance
-- =====================================================

-- Run this migration when:
-- 1. You have 1000+ chunks in your database, OR
-- 2. You upgrade to a paid Supabase plan with more memory

-- This index dramatically speeds up vector similarity searches
-- but requires ~61 MB of memory to create

-- Check current chunk count first:
-- SELECT COUNT(*) FROM document_chunks WHERE embedding IS NOT NULL;

-- Create the IVFFlat index
CREATE INDEX IF NOT EXISTS idx_chunks_embedding 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Verify the index was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE indexname = 'idx_chunks_embedding'
  ) THEN
    RAISE NOTICE 'Index created successfully!';
  ELSE
    RAISE NOTICE 'Index creation failed or already exists';
  END IF;
END $$;

-- =====================================================
-- Performance Notes
-- =====================================================

/*
IVFFlat Index:
- Best for: 1,000 - 1,000,000 vectors
- Memory required: ~61 MB for creation
- Trade-off: Slightly less accurate but much faster
- Lists parameter: 100 is good for small-medium datasets

Alternative: HNSW Index (if available)
- Best for: Any size dataset
- More accurate than IVFFlat
- Requires more memory
- Example:
  CREATE INDEX idx_chunks_embedding 
  ON document_chunks 
  USING hnsw (embedding vector_cosine_ops);

Without Index:
- Fine for < 1,000 chunks
- Query time: ~10-50ms
- No memory overhead

With Index:
- Recommended for 1,000+ chunks  
- Query time: ~1-5ms
- Requires maintenance_work_mem >= 61 MB
*/

