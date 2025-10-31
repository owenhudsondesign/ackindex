-- Migration: Fix RLS policies for document_chunks table to enforce ownership
-- Created: 2025-10-31
-- Purpose: Prevent users from accessing chunks from other users' documents

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Authenticated users can read chunks" ON document_chunks;
DROP POLICY IF EXISTS "Authenticated users can insert chunks" ON document_chunks;

-- Create secure policies with ownership checks via documents table
CREATE POLICY "Users can read own document chunks"
  ON document_chunks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_chunks.document_id
      AND d.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can insert own document chunks"
  ON document_chunks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_chunks.document_id
      AND d.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update own document chunks"
  ON document_chunks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_chunks.document_id
      AND d.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete own document chunks"
  ON document_chunks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = document_chunks.document_id
      AND d.created_by = auth.uid()
    )
  );

-- Keep service role access for admin operations
CREATE POLICY "Service role has full access to chunks"
  ON document_chunks FOR ALL
  TO service_role
  USING (true);

-- Add helpful comments
COMMENT ON POLICY "Users can read own document chunks" ON document_chunks IS
  'Users can only read chunks from documents they own';
COMMENT ON POLICY "Users can insert own document chunks" ON document_chunks IS
  'Users can only insert chunks into documents they own';
COMMENT ON POLICY "Users can update own document chunks" ON document_chunks IS
  'Users can only update chunks from documents they own';
COMMENT ON POLICY "Users can delete own document chunks" ON document_chunks IS
  'Users can only delete chunks from documents they own';
