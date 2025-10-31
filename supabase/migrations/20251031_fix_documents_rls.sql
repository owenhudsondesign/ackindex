-- Migration: Fix RLS policies for documents table to enforce ownership
-- Created: 2025-10-31
-- Purpose: Prevent users from accessing other users' documents

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Authenticated users can read documents" ON documents;
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON documents;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON documents;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON documents;

-- Create secure policies with ownership checks
CREATE POLICY "Users can read own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

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

-- Keep service role access for admin operations
CREATE POLICY "Service role has full access to documents"
  ON documents FOR ALL
  TO service_role
  USING (true);

-- Add helpful comments
COMMENT ON POLICY "Users can read own documents" ON documents IS
  'Users can only view documents they created';
COMMENT ON POLICY "Users can insert own documents" ON documents IS
  'Users can only insert documents with themselves as creator';
COMMENT ON POLICY "Users can update own documents" ON documents IS
  'Users can only update their own documents';
COMMENT ON POLICY "Users can delete own documents" ON documents IS
  'Users can only delete their own documents';
