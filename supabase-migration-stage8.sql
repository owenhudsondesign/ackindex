-- =====================================================
-- AckIndex Stage 8: Vector Embeddings for RAG
-- Add pgvector extension and update schema
-- =====================================================

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to document_chunks table
ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for vector similarity search (using cosine distance)
-- This dramatically speeds up nearest neighbor searches
CREATE INDEX IF NOT EXISTS idx_chunks_embedding 
ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Note: The index will be built as embeddings are added
-- For optimal performance with large datasets, consider using HNSW:
-- CREATE INDEX idx_chunks_embedding ON document_chunks 
-- USING hnsw (embedding vector_cosine_ops);

-- =====================================================
-- Helper function for semantic search
-- =====================================================

-- Function to find similar chunks using vector similarity
CREATE OR REPLACE FUNCTION search_similar_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
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
  WHERE dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- =====================================================
-- Helper function for hybrid search (vector + text)
-- =====================================================

CREATE OR REPLACE FUNCTION hybrid_search_chunks(
  query_embedding vector(1536),
  query_text text,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  chunk_index int,
  metadata jsonb,
  similarity float,
  text_rank float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT
      dc.id,
      dc.document_id,
      dc.content,
      dc.chunk_index,
      dc.metadata,
      1 - (dc.embedding <=> query_embedding) AS similarity
    FROM document_chunks dc
    WHERE dc.embedding IS NOT NULL
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  text_search AS (
    SELECT
      dc.id,
      ts_rank(to_tsvector('english', dc.content), plainto_tsquery('english', query_text)) AS rank
    FROM document_chunks dc
    WHERE to_tsvector('english', dc.content) @@ plainto_tsquery('english', query_text)
  )
  SELECT
    vs.id,
    vs.document_id,
    vs.content,
    vs.chunk_index,
    vs.metadata,
    vs.similarity,
    COALESCE(ts.rank, 0) AS text_rank
  FROM vector_search vs
  LEFT JOIN text_search ts ON vs.id = ts.id
  ORDER BY (vs.similarity * 0.7 + COALESCE(ts.rank, 0) * 0.3) DESC
  LIMIT match_count;
END;
$$;

-- =====================================================
-- Update RLS policies for new embedding column
-- =====================================================

-- Policy: Allow service role to update embeddings
DROP POLICY IF EXISTS "Service role can update embeddings" ON document_chunks;
CREATE POLICY "Service role can update embeddings"
  ON document_chunks
  FOR UPDATE
  TO service_role
  USING (true);

-- =====================================================
-- Statistics view for monitoring
-- =====================================================

CREATE OR REPLACE VIEW embedding_stats AS
SELECT
  COUNT(*) AS total_chunks,
  COUNT(embedding) AS chunks_with_embeddings,
  COUNT(*) - COUNT(embedding) AS chunks_without_embeddings,
  ROUND(100.0 * COUNT(embedding) / NULLIF(COUNT(*), 0), 2) AS embedding_percentage
FROM document_chunks;

-- =====================================================
-- NOTES FOR DEVELOPERS
-- =====================================================

/*
Vector Embeddings Setup:

1. This migration adds pgvector support for semantic search
2. Each chunk gets a 1536-dimensional embedding (OpenAI's ada-002)
3. Uses cosine similarity for finding relevant content

Usage:
- Generate embeddings when chunks are created
- Use search_similar_chunks() for semantic search
- Use hybrid_search_chunks() for combined vector + text search

To check embedding status:
SELECT * FROM embedding_stats;

To manually search:
SELECT * FROM search_similar_chunks(
  '[0.1, 0.2, ...]'::vector(1536),  -- query embedding
  0.7,                                 -- similarity threshold
  5                                    -- max results
);

Performance:
- IVFFlat index trades some accuracy for speed
- For small datasets (<100k chunks), a simple index is fine
- For large datasets, consider HNSW index
- Rebuild index periodically: REINDEX INDEX idx_chunks_embedding;

Costs:
- OpenAI embeddings: ~$0.0001 per 1K tokens
- Typical chunk (500 tokens): ~$0.00005
- 1000 chunks: ~$0.05
*/

-- =====================================================
-- Verify installation
-- =====================================================

-- Check if pgvector is installed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE EXCEPTION 'pgvector extension is not installed';
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Stage 8 vector embeddings migration completed successfully!';
  RAISE NOTICE 'Run: SELECT * FROM embedding_stats; to check status';
END $$;
