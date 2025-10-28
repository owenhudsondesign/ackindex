-- =====================================================
-- AckIndex Database Schema
-- Stage 7: Document Storage and Content Chunks
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- =====================================================
-- DOCUMENTS TABLE
-- Stores metadata about uploaded/scraped documents
-- =====================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Source information
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('url', 'pdf')),
  source_url TEXT,
  filename TEXT,
  
  -- Document metadata
  title TEXT,
  description TEXT,
  
  -- Processing status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  
  -- Content stats
  total_chunks INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- User tracking (for future multi-user support)
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_source_type ON documents(source_type);

-- =====================================================
-- DOCUMENT_CHUNKS TABLE
-- Stores parsed and chunked content for RAG retrieval
-- =====================================================
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Reference to parent document
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Chunk content
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  
  -- Metadata for context
  metadata JSONB DEFAULT '{}',
  
  -- Search optimization
  content_vector TEXT, -- Will be used for embeddings in Stage 8
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure chunks are ordered
  CONSTRAINT unique_document_chunk UNIQUE (document_id, chunk_index)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_content_search ON document_chunks USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_chunks_metadata ON document_chunks USING gin(metadata);

-- =====================================================
-- SCRAPE_JOBS TABLE
-- Tracks Apify scraping jobs
-- =====================================================
CREATE TABLE IF NOT EXISTS scrape_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Reference to document
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Apify job details
  apify_run_id TEXT,
  apify_status VARCHAR(50),
  
  -- Job configuration
  url TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  
  -- Results
  pages_crawled INTEGER DEFAULT 0,
  pdfs_found INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_document_id ON scrape_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_apify_run_id ON scrape_jobs(apify_run_id);

-- =====================================================
-- AUTO-UPDATE TIMESTAMP FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to documents table
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all documents
CREATE POLICY "Authenticated users can read documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert documents
CREATE POLICY "Authenticated users can insert documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update documents
CREATE POLICY "Authenticated users can update documents"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can delete documents
CREATE POLICY "Authenticated users can delete documents"
  ON documents
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can read all chunks
CREATE POLICY "Authenticated users can read chunks"
  ON document_chunks
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert chunks
CREATE POLICY "Authenticated users can insert chunks"
  ON document_chunks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can read scrape jobs
CREATE POLICY "Authenticated users can read scrape_jobs"
  ON scrape_jobs
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert scrape jobs
CREATE POLICY "Authenticated users can insert scrape_jobs"
  ON scrape_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get recent activity
CREATE OR REPLACE FUNCTION get_recent_activity(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  source_type VARCHAR,
  source_url TEXT,
  filename TEXT,
  title TEXT,
  status VARCHAR,
  total_chunks INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.source_type,
    d.source_url,
    d.filename,
    d.title,
    d.status,
    d.total_chunks,
    d.created_at
  FROM documents d
  ORDER BY d.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Uncomment to insert sample data for testing
/*
INSERT INTO documents (source_type, source_url, title, status, total_chunks)
VALUES 
  ('url', 'https://nantucket-ma.gov/example', 'Example Town Document', 'completed', 5),
  ('pdf', NULL, 'sample-permit.pdf', 'processing', 0);
*/

-- =====================================================
-- NOTES FOR DEVELOPERS
-- =====================================================

/*
This schema supports:

1. Document Management
   - Track both URL scrapes and direct PDF uploads
   - Monitor processing status
   - Store metadata and statistics

2. Content Chunking
   - Store parsed content in searchable chunks
   - Maintain chunk order and context
   - Support future vector embeddings

3. Job Tracking
   - Track Apify scraping jobs
   - Monitor job status and results
   - Link jobs to documents

4. Security
   - RLS policies ensure only authenticated users can access
   - Future enhancement: add user-specific policies

5. Performance
   - Indexes on frequently queried fields
   - Full-text search on chunk content
   - JSONB for flexible metadata

To apply this schema:
1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Paste this entire file
4. Click "Run"

For production:
- Add vector embeddings column in Stage 8
- Consider partitioning for large datasets
- Add more granular RLS policies per user
*/
