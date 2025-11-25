-- Hybrid Search Function
-- Combines vector similarity search with full-text keyword search
-- This improves recall for specific terms (legal codes, names, etc.)

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
    -- Combine results with weighted scoring
    -- Semantic weight: 0.7, Keyword weight: 0.3
    SELECT
      COALESCE(s.id, k.id) as id,
      COALESCE(s.document_id, k.document_id) as document_id,
      COALESCE(s.content, k.content) as content,
      COALESCE(s.chunk_index, k.chunk_index) as chunk_index,
      COALESCE(s.metadata, k.metadata) as metadata,
      (COALESCE(s.semantic_score, 0) * 0.7 + COALESCE(k.keyword_score, 0) * 0.3) as combined_score
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
