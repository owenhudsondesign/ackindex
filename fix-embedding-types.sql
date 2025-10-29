-- =====================================================
-- Fix Embedding Types: Convert string embeddings to vector type
-- =====================================================

-- This migration fixes embeddings that were stored as text/JSON
-- instead of the proper vector(1536) type

-- Step 1: Drop the embedding_stats view (it depends on the embedding column)
DROP VIEW IF EXISTS embedding_stats;

-- Step 2: Create a temporary column with the correct type
ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS embedding_temp vector(1536);

-- Step 3: Convert existing string embeddings to vector type
-- The embeddings are stored as JSON strings like "[-0.023,0.019,...]"
-- We need to cast them to vector type
UPDATE document_chunks
SET embedding_temp = embedding::vector(1536)
WHERE embedding IS NOT NULL;

-- Step 4: Drop the old embedding column
ALTER TABLE document_chunks
DROP COLUMN IF EXISTS embedding;

-- Step 5: Rename the temp column to embedding
ALTER TABLE document_chunks
RENAME COLUMN embedding_temp TO embedding;

-- Step 6: Recreate the index
-- Note: IVFFlat index requires more memory than free tier provides
-- For small datasets (< 1000 chunks), we can skip the index or use a simpler one
DROP INDEX IF EXISTS idx_chunks_embedding;

-- Option 1: No index (fine for small datasets)
-- The RPC function will still work, just slightly slower

-- Option 2: If you have more data later, you can create the index separately:
-- CREATE INDEX idx_chunks_embedding 
-- ON document_chunks 
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

-- Step 7: Recreate the embedding_stats view
CREATE OR REPLACE VIEW embedding_stats AS
SELECT
  COUNT(*) AS total_chunks,
  COUNT(embedding) AS chunks_with_embeddings,
  COUNT(*) - COUNT(embedding) AS chunks_without_embeddings,
  ROUND(100.0 * COUNT(embedding) / NULLIF(COUNT(*), 0), 2) AS embedding_percentage
FROM document_chunks;

-- Step 6: Verify the fix
DO $$
DECLARE
  chunk_count INTEGER;
  embedding_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO chunk_count FROM document_chunks;
  SELECT COUNT(*) INTO embedding_count FROM document_chunks WHERE embedding IS NOT NULL;
  
  RAISE NOTICE 'Total chunks: %', chunk_count;
  RAISE NOTICE 'Chunks with embeddings: %', embedding_count;
  RAISE NOTICE 'Embedding type fix completed successfully!';
END $$;

