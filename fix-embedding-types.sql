-- =====================================================
-- Fix Embedding Types: Convert string embeddings to vector type
-- =====================================================

-- This migration fixes embeddings that were stored as text/JSON
-- instead of the proper vector(1536) type

-- Step 1: Create a temporary column with the correct type
ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS embedding_temp vector(1536);

-- Step 2: Convert existing string embeddings to vector type
-- The embeddings are stored as JSON strings like "[-0.023,0.019,...]"
-- We need to cast them to vector type
UPDATE document_chunks
SET embedding_temp = embedding::vector(1536)
WHERE embedding IS NOT NULL;

-- Step 3: Drop the old embedding column
ALTER TABLE document_chunks
DROP COLUMN IF EXISTS embedding;

-- Step 4: Rename the temp column to embedding
ALTER TABLE document_chunks
RENAME COLUMN embedding_temp TO embedding;

-- Step 5: Recreate the index
DROP INDEX IF EXISTS idx_chunks_embedding;
CREATE INDEX idx_chunks_embedding 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

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

