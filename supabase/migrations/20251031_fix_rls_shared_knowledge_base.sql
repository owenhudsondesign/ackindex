-- Migration: Fix RLS policies for SHARED KNOWLEDGE BASE model
-- Created: 2025-10-31
-- Purpose: Allow all users to READ documents, but only owners can MODIFY/DELETE
--
-- Model: Shared Knowledge Base
-- - Admins upload/scrape content
-- - ALL authenticated users can search/read that content
-- - Only document owners (admins) can modify/delete content
--
-- This REPLACES the previous overly-restrictive policies

-- ========================================
-- DOCUMENTS TABLE - Shared Read, Restricted Write
-- ========================================

-- Drop the overly-restrictive policies from previous migration
DROP POLICY IF EXISTS "Users can read own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
DROP POLICY IF EXISTS "Service role has full access to documents" ON documents;

-- Create new policies for shared knowledge base
CREATE POLICY "All authenticated users can read all documents"
  ON documents FOR SELECT
  TO authenticated
  USING (true);  -- ✅ Anyone can read for chatbot queries

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Service role needs full access for admin operations and cron jobs
CREATE POLICY "Service role has full access to documents"
  ON documents FOR ALL
  TO service_role
  USING (true);

-- ========================================
-- DOCUMENT_CHUNKS TABLE - Shared Read, Restricted Write
-- ========================================

-- Drop previous policies
DROP POLICY IF EXISTS "Users can read own document chunks" ON document_chunks;
DROP POLICY IF EXISTS "Users can insert own document chunks" ON document_chunks;
DROP POLICY IF EXISTS "Users can update own document chunks" ON document_chunks;
DROP POLICY IF EXISTS "Users can delete own document chunks" ON document_chunks;
DROP POLICY IF EXISTS "Service role has full access to chunks" ON document_chunks;

-- Create new policies for shared knowledge base
CREATE POLICY "All authenticated users can read all chunks"
  ON document_chunks FOR SELECT
  TO authenticated
  USING (true);  -- ✅ Anyone can read for search/chatbot

CREATE POLICY "Users can insert chunks for own documents"
  ON document_chunks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_chunks.document_id
      AND d.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update chunks from own documents"
  ON document_chunks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_chunks.document_id
      AND d.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete chunks from own documents"
  ON document_chunks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_chunks.document_id
      AND d.created_by = auth.uid()
    )
  );

-- Service role needs full access
CREATE POLICY "Service role has full access to chunks"
  ON document_chunks FOR ALL
  TO service_role
  USING (true);

-- ========================================
-- SCRAPE_JOBS TABLE - Shared Read, Restricted Write
-- ========================================

-- Drop previous policies
DROP POLICY IF EXISTS "Users can read own scrape jobs" ON scrape_jobs;
DROP POLICY IF EXISTS "Users can insert own scrape jobs" ON scrape_jobs;
DROP POLICY IF EXISTS "Users can update own scrape jobs" ON scrape_jobs;
DROP POLICY IF EXISTS "Users can delete own scrape jobs" ON scrape_jobs;
DROP POLICY IF EXISTS "Service role has full access to scrape_jobs" ON scrape_jobs;

-- Create new policies for shared knowledge base
CREATE POLICY "All authenticated users can read scrape jobs"
  ON scrape_jobs FOR SELECT
  TO authenticated
  USING (true);  -- ✅ Anyone can see scraping status

CREATE POLICY "Users can insert scrape jobs for own documents"
  ON scrape_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = scrape_jobs.document_id
      AND d.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update scrape jobs for own documents"
  ON scrape_jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = scrape_jobs.document_id
      AND d.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete scrape jobs for own documents"
  ON scrape_jobs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = scrape_jobs.document_id
      AND d.created_by = auth.uid()
    )
  );

-- Service role needs full access for cron jobs
CREATE POLICY "Service role has full access to scrape_jobs"
  ON scrape_jobs FOR ALL
  TO service_role
  USING (true);

-- ========================================
-- HELPFUL COMMENTS
-- ========================================

COMMENT ON POLICY "All authenticated users can read all documents" ON documents IS
  'Shared knowledge base - all users can read all documents for chatbot queries';

COMMENT ON POLICY "Users can insert own documents" ON documents IS
  'Only document owners (typically admins) can create new documents';

COMMENT ON POLICY "All authenticated users can read all chunks" ON document_chunks IS
  'Shared knowledge base - all users can search all content';

COMMENT ON POLICY "All authenticated users can read scrape jobs" ON scrape_jobs IS
  'Users can see scraping activity for transparency';

-- ========================================
-- VERIFICATION QUERY (Run this to test)
-- ========================================

-- Test as different users:
-- 1. Admin uploads document (created_by = admin_id)
-- 2. Regular user should be able to SELECT that document
-- 3. Regular user should NOT be able to UPDATE/DELETE that document
