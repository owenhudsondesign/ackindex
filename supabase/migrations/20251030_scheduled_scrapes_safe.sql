-- Migration: Add scheduled scraping with batch URL management and deduplication
-- Created: 2025-10-30
-- SAFE VERSION: Handles existing objects gracefully

-- Table for managing scheduled scrapes
CREATE TABLE IF NOT EXISTS scheduled_scrapes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  scrape_frequency INTERVAL DEFAULT '1 week', -- e.g., '1 day', '1 week', '1 month'
  last_scraped_at TIMESTAMPTZ,
  next_scrape_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'failed')),
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  error_message TEXT,
  error_count INTEGER DEFAULT 0
);

-- Index for efficient scheduling queries (safe creation)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scheduled_scrapes_next_scrape') THEN
    CREATE INDEX idx_scheduled_scrapes_next_scrape
      ON scheduled_scrapes(next_scrape_at)
      WHERE status = 'active';
  END IF;
END $$;

-- Index for user lookups (safe creation)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scheduled_scrapes_created_by') THEN
    CREATE INDEX idx_scheduled_scrapes_created_by
      ON scheduled_scrapes(created_by);
  END IF;
END $$;

-- Content hash table for deduplication
CREATE TABLE IF NOT EXISTS content_hashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_count INTEGER DEFAULT 0,
  content_length INTEGER DEFAULT 0
);

-- Safe index creation for content_hashes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_content_hashes_url') THEN
    CREATE INDEX idx_content_hashes_url ON content_hashes(url);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_content_hashes_hash') THEN
    CREATE INDEX idx_content_hashes_hash ON content_hashes(content_hash);
  END IF;
END $$;

-- Function to update next_scrape_at based on frequency
CREATE OR REPLACE FUNCTION update_next_scrape_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_scraped_at IS NOT NULL AND NEW.scrape_frequency IS NOT NULL THEN
    NEW.next_scrape_at := NEW.last_scraped_at + NEW.scrape_frequency;
  ELSIF NEW.scrape_frequency IS NOT NULL THEN
    -- If never scraped, schedule for immediate scraping
    NEW.next_scrape_at := NOW();
  END IF;

  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update next_scrape_at (safe creation)
DROP TRIGGER IF EXISTS trigger_update_next_scrape ON scheduled_scrapes;
CREATE TRIGGER trigger_update_next_scrape
  BEFORE INSERT OR UPDATE OF last_scraped_at, scrape_frequency
  ON scheduled_scrapes
  FOR EACH ROW
  EXECUTE FUNCTION update_next_scrape_time();

-- Function to get URLs ready for scraping
CREATE OR REPLACE FUNCTION get_urls_for_scraping(batch_size INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  url TEXT,
  title TEXT,
  priority INTEGER,
  last_scraped_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.url,
    s.title,
    s.priority,
    s.last_scraped_at
  FROM scheduled_scrapes s
  WHERE s.status = 'active'
    AND (s.next_scrape_at IS NULL OR s.next_scrape_at <= NOW())
  ORDER BY s.priority DESC, s.next_scrape_at ASC NULLS FIRST
  LIMIT batch_size;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (safe - does nothing if already enabled)
ALTER TABLE scheduled_scrapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_hashes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scheduled_scrapes
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own scheduled scrapes" ON scheduled_scrapes;
DROP POLICY IF EXISTS "Users can insert own scheduled scrapes" ON scheduled_scrapes;
DROP POLICY IF EXISTS "Users can update own scheduled scrapes" ON scheduled_scrapes;
DROP POLICY IF EXISTS "Users can delete own scheduled scrapes" ON scheduled_scrapes;
DROP POLICY IF EXISTS "Service role can manage all scheduled scrapes" ON scheduled_scrapes;

-- Create policies
CREATE POLICY "Users can view own scheduled scrapes"
  ON scheduled_scrapes FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own scheduled scrapes"
  ON scheduled_scrapes FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own scheduled scrapes"
  ON scheduled_scrapes FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own scheduled scrapes"
  ON scheduled_scrapes FOR DELETE
  USING (auth.uid() = created_by);

CREATE POLICY "Service role can manage all scheduled scrapes"
  ON scheduled_scrapes FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for content_hashes
DROP POLICY IF EXISTS "Users can view content hashes" ON content_hashes;
DROP POLICY IF EXISTS "Service role can manage content hashes" ON content_hashes;

CREATE POLICY "Users can view content hashes"
  ON content_hashes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = content_hashes.document_id
      AND d.created_by = auth.uid()
    )
  );

CREATE POLICY "Service role can manage content hashes"
  ON content_hashes FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Grant permissions (safe - does nothing if already granted)
GRANT SELECT, INSERT, UPDATE, DELETE ON scheduled_scrapes TO authenticated;
GRANT SELECT ON content_hashes TO authenticated;
GRANT ALL ON scheduled_scrapes TO service_role;
GRANT ALL ON content_hashes TO service_role;

-- Add comments
COMMENT ON TABLE scheduled_scrapes IS 'URLs scheduled for periodic scraping';
COMMENT ON TABLE content_hashes IS 'Content hashes for deduplication - prevents re-processing unchanged content';
COMMENT ON COLUMN scheduled_scrapes.scrape_frequency IS 'Interval between scrapes (e.g., ''1 day'', ''1 week'', ''1 month'')';
COMMENT ON COLUMN scheduled_scrapes.priority IS 'Priority 1-10, higher numbers scraped first';
COMMENT ON COLUMN scheduled_scrapes.status IS 'active = will be scraped, paused = temporarily disabled, failed = repeated errors';
