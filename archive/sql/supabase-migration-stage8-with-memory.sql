-- =====================================================
-- AckIndex Stage 8: Vector Embeddings for RAG
-- WITH INCREASED MEMORY FOR PRO PLAN
-- =====================================================

-- Temporarily increase memory for this session
SET maintenance_work_mem = '128MB';

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
    COALESCE(ts.rank, 0.0) AS text_rank
  FROM vector_search vs
  LEFT JOIN text_search ts ON vs.id = ts.id
  ORDER BY (vs.similarity * 0.7 + COALESCE(ts.rank, 0.0) * 0.3) DESC
  LIMIT match_count;
END;
$$;

-- =====================================================
-- Verify setup
-- =====================================================

DO $$
BEGIN
  -- Check if vector extension is enabled
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) THEN
    RAISE NOTICE '✓ pgvector extension enabled';
  ELSE
    RAISE EXCEPTION 'pgvector extension not found';
  END IF;

  -- Check if embedding column exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'document_chunks'
    AND column_name = 'embedding'
  ) THEN
    RAISE NOTICE '✓ embedding column added to document_chunks';
  ELSE
    RAISE EXCEPTION 'embedding column not found';
  END IF;

  -- Check if index was created
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'idx_chunks_embedding'
  ) THEN
    RAISE NOTICE '✓ Vector index created successfully';
  END IF;

  -- Check if functions exist
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'search_similar_chunks'
  ) THEN
    RAISE NOTICE '✓ search_similar_chunks function created';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'hybrid_search_chunks'
  ) THEN
    RAISE NOTICE '✓ hybrid_search_chunks function created';
  END IF;

  RAISE NOTICE '✅ Stage 8 migration complete!';
END $$;
