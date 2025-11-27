-- Fix hybrid_search_chunks function for Voyage AI voyage-3-large embeddings
--
-- Changes:
-- 1. Update vector dimensions from 1536 to 1024 (Voyage AI voyage-3-large)
-- 2. Fix scoring formula to not dilute semantic scores when no keyword match
--
-- The old formula: (semantic_score * 0.7 + keyword_score * 0.3)
-- Problem: When keyword_score = 0, this reduces a 70% semantic match to 49%
--
-- New formula: Only blend when keyword matches exist, otherwise use pure semantic score

-- First drop the old function
DROP FUNCTION IF EXISTS hybrid_search_chunks(vector(1536), text, int);
DROP FUNCTION IF EXISTS hybrid_search_chunks(vector(1024), text, int);

-- Create the fixed function
CREATE OR REPLACE FUNCTION hybrid_search_chunks(
  query_embedding vector(1024),  -- Changed from 1536 for Voyage AI voyage-3-large
  query_text text,
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
  WITH semantic_results AS (
    -- Vector similarity search
    SELECT
      dc.id,
      dc.document_id,
      dc.content,
      dc.chunk_index,
      dc.metadata,
      1 - (dc.embedding <=> query_embedding) as semantic_score
    FROM document_chunks dc
    WHERE dc.embedding IS NOT NULL
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  keyword_results AS (
    -- Full-text keyword search
    SELECT
      dc.id,
      dc.document_id,
      dc.content,
      dc.chunk_index,
      dc.metadata,
      ts_rank(to_tsvector('english', dc.content), websearch_to_tsquery('english', query_text)) as keyword_score
    FROM document_chunks dc
    WHERE to_tsvector('english', dc.content) @@ websearch_to_tsquery('english', query_text)
    ORDER BY keyword_score DESC
    LIMIT match_count * 2
  ),
  combined AS (
    -- Combine results with smart scoring
    -- Only blend when keyword matches exist, otherwise preserve pure semantic score
    SELECT
      COALESCE(s.id, k.id) as id,
      COALESCE(s.document_id, k.document_id) as document_id,
      COALESCE(s.content, k.content) as content,
      COALESCE(s.chunk_index, k.chunk_index) as chunk_index,
      COALESCE(s.metadata, k.metadata) as metadata,
      CASE
        -- When we have both semantic and keyword match, blend them
        WHEN s.semantic_score IS NOT NULL AND k.keyword_score IS NOT NULL AND k.keyword_score > 0
        THEN (s.semantic_score * 0.7 + k.keyword_score * 0.3)
        -- When we only have semantic match, use pure semantic score (don't dilute)
        WHEN s.semantic_score IS NOT NULL
        THEN s.semantic_score
        -- When we only have keyword match (rare), use keyword score
        ELSE COALESCE(k.keyword_score, 0)
      END as combined_score
    FROM semantic_results s
    FULL OUTER JOIN keyword_results k ON s.id = k.id
  )
  SELECT
    c.id,
    c.document_id,
    c.content,
    c.chunk_index,
    c.metadata,
    c.combined_score as similarity
  FROM combined c
  ORDER BY c.combined_score DESC
  LIMIT match_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION hybrid_search_chunks TO authenticated, anon, service_role;

-- Also update search_similar_chunks if it exists with old dimensions
DROP FUNCTION IF EXISTS search_similar_chunks(vector(1536), float, int);

CREATE OR REPLACE FUNCTION search_similar_chunks(
  query_embedding vector(1024),  -- Changed from 1536
  match_threshold float DEFAULT 0.5,
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
    1 - (dc.embedding <=> query_embedding) as similarity
  FROM document_chunks dc
  WHERE dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) >= match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION search_similar_chunks TO authenticated, anon, service_role;
