-- Migration: Fix RLS policies for scrape_jobs table to enforce ownership
-- Created: 2025-10-31
-- Purpose: Prevent users from accessing scrape jobs for other users' documents

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Authenticated users can read scrape_jobs" ON scrape_jobs;
DROP POLICY IF EXISTS "Authenticated users can insert scrape_jobs" ON scrape_jobs;

-- Create secure policies with ownership checks via documents table
CREATE POLICY "Users can read own scrape jobs"
  ON scrape_jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = scrape_jobs.document_id
      AND d.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert own scrape jobs"
  ON scrape_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = scrape_jobs.document_id
      AND d.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update own scrape jobs"
  ON scrape_jobs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = scrape_jobs.document_id
      AND d.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete own scrape jobs"
  ON scrape_jobs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = scrape_jobs.document_id
      AND d.created_by = auth.uid()
    )
  );

-- Keep service role access for admin/cron operations
CREATE POLICY "Service role has full access to scrape_jobs"
  ON scrape_jobs FOR ALL
  TO service_role
  USING (true);

-- Add helpful comments
COMMENT ON POLICY "Users can read own scrape jobs" ON scrape_jobs IS
  'Users can only read scrape jobs for documents they own';
COMMENT ON POLICY "Users can insert own scrape jobs" ON scrape_jobs IS
  'Users can only create scrape jobs for documents they own';
COMMENT ON POLICY "Users can update own scrape jobs" ON scrape_jobs IS
  'Users can only update scrape jobs for documents they own';
COMMENT ON POLICY "Users can delete own scrape jobs" ON scrape_jobs IS
  'Users can only delete scrape jobs for documents they own';
