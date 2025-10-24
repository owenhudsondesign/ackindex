-- AckIndex Database Migration: Add Insights and Comparisons
-- Run this script in the Supabase SQL Editor to add new columns to existing database

-- Add new columns to entries table
ALTER TABLE public.entries
ADD COLUMN IF NOT EXISTS insights jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS comparisons jsonb DEFAULT '[]'::jsonb;

-- Update the table comment
COMMENT ON TABLE public.entries IS 'Enhanced with insights and comparisons for better civic data storytelling';

-- Verify the changes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'entries'
  AND column_name IN ('insights', 'comparisons');

-- Done! Your database now supports insights and comparisons.
