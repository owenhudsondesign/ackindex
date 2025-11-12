-- =====================================================
-- Blog Posts Transcript Enhancement
-- Add full transcript display and searchability to blog posts
-- =====================================================

-- Add full_transcript field to blog_posts
-- Note: We don't store the transcript here, we reconstruct it from document_chunks
-- This migration just adds helper functions

-- =====================================================
-- Function to get full transcript for a document
-- Reconstructs transcript from chunks in order
-- =====================================================
CREATE OR REPLACE FUNCTION get_full_transcript(doc_id UUID)
RETURNS TABLE (
  full_text TEXT,
  total_chunks INTEGER,
  has_timestamps BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    STRING_AGG(dc.content, E'\n\n' ORDER BY dc.chunk_index) as full_text,
    COUNT(*)::INTEGER as total_chunks,
    BOOL_OR((dc.metadata->>'start_time') IS NOT NULL) as has_timestamps
  FROM document_chunks dc
  WHERE dc.document_id = doc_id
    AND (dc.metadata->>'chunk_type' = 'transcript' OR dc.metadata->>'chunk_type' IS NULL);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function to get transcript chunks with metadata
-- Returns chunks with timestamps for display
-- =====================================================
CREATE OR REPLACE FUNCTION get_transcript_chunks(doc_id UUID)
RETURNS TABLE (
  chunk_index INTEGER,
  content TEXT,
  start_time NUMERIC,
  end_time NUMERIC,
  speakers TEXT[],
  chunk_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.chunk_index,
    dc.content,
    (dc.metadata->>'start_time')::NUMERIC as start_time,
    (dc.metadata->>'end_time')::NUMERIC as end_time,
    CASE
      WHEN dc.metadata->'speakers' IS NOT NULL
      THEN ARRAY(SELECT jsonb_array_elements_text(dc.metadata->'speakers'))
      ELSE NULL
    END as speakers,
    COALESCE(dc.metadata->>'chunk_type', 'transcript') as chunk_type
  FROM document_chunks dc
  WHERE dc.document_id = doc_id
  ORDER BY dc.chunk_index;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function to search within a document's transcript
-- Useful for finding specific quotes or topics
-- =====================================================
CREATE OR REPLACE FUNCTION search_document_transcript(
  doc_id UUID,
  search_query TEXT
)
RETURNS TABLE (
  chunk_index INTEGER,
  content TEXT,
  start_time NUMERIC,
  end_time NUMERIC,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.chunk_index,
    dc.content,
    (dc.metadata->>'start_time')::NUMERIC as start_time,
    (dc.metadata->>'end_time')::NUMERIC as end_time,
    ts_rank(
      to_tsvector('english', dc.content),
      plainto_tsquery('english', search_query)
    ) as rank
  FROM document_chunks dc
  WHERE dc.document_id = doc_id
    AND to_tsvector('english', dc.content) @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC, dc.chunk_index;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Add index for transcript search performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_document_chunks_chunk_type
  ON document_chunks((metadata->>'chunk_type'));

-- =====================================================
-- NOTES
-- =====================================================
/*
This migration enhances blog posts with full transcript capabilities:

1. get_full_transcript(doc_id)
   - Reconstructs the complete transcript from chunks
   - Returns full text, chunk count, and timestamp availability
   - Filters to only transcript chunks (not summary chunks)

2. get_transcript_chunks(doc_id)
   - Returns individual chunks with metadata
   - Includes timestamps and speaker information
   - Useful for building timestamped transcript displays

3. search_document_transcript(doc_id, query)
   - Full-text search within a specific document
   - Returns matching chunks with relevance ranking
   - Includes timestamps for context

Usage in blog posts:
- Display full searchable transcript below the article
- Allow users to find specific quotes
- Link timestamps to source video
- Export transcripts for archival

To apply:
1. Run in Supabase SQL Editor
2. Functions are accessible to authenticated users
3. Can be called from Next.js API routes
*/
