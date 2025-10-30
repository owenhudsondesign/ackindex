-- Migration: Add scheduled scraping with batch URL management and deduplication
-- Created: 2025-10-30

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

-- Index for efficient scheduling queries
CREATE INDEX idx_scheduled_scrapes_next_scrape
  ON scheduled_scrapes(next_scrape_at)
  WHERE status = 'active';

-- Index for user lookups
CREATE INDEX idx_scheduled_scrapes_created_by
  ON scheduled_scrapes(created_by);

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

CREATE INDEX idx_content_hashes_url ON content_hashes(url);
CREATE INDEX idx_content_hashes_hash ON content_hashes(content_hash);

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

-- Trigger to automatically update next_scrape_at
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

-- Enable RLS
ALTER TABLE scheduled_scrapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_hashes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scheduled_scrapes
-- Allow users to view their own scheduled scrapes
CREATE POLICY "Users can view own scheduled scrapes"
  ON scheduled_scrapes FOR SELECT
  USING (auth.uid() = created_by);

-- Allow users to insert their own scheduled scrapes
CREATE POLICY "Users can insert own scheduled scrapes"
  ON scheduled_scrapes FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Allow users to update their own scheduled scrapes
CREATE POLICY "Users can update own scheduled scrapes"
  ON scheduled_scrapes FOR UPDATE
  USING (auth.uid() = created_by);

-- Allow users to delete their own scheduled scrapes
CREATE POLICY "Users can delete own scheduled scrapes"
  ON scheduled_scrapes FOR DELETE
  USING (auth.uid() = created_by);

-- Allow service role to access all (for cron jobs)
CREATE POLICY "Service role can manage all scheduled scrapes"
  ON scheduled_scrapes FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for content_hashes
-- Allow users to view content hashes for their documents
CREATE POLICY "Users can view content hashes"
  ON content_hashes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      WHERE d.id = content_hashes.document_id
      AND d.created_by = auth.uid()
    )
  );

-- Allow service role to manage content hashes
CREATE POLICY "Service role can manage content hashes"
  ON content_hashes FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Grant permissions
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
