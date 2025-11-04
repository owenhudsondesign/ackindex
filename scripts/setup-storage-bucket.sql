-- Setup Supabase Storage for PDF uploads
-- Run this in Supabase SQL Editor

-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload PDFs
CREATE POLICY "Authenticated users can upload PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pdfs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read their own PDFs
CREATE POLICY "Users can read their own PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'pdfs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow service role to read all PDFs (for processing)
CREATE POLICY "Service role can read all PDFs"
ON storage.objects
FOR SELECT
TO service_role
USING (bucket_id = 'pdfs');

-- Allow service role to delete processed PDFs
CREATE POLICY "Service role can delete PDFs"
ON storage.objects
FOR DELETE
TO service_role
USING (bucket_id = 'pdfs');
