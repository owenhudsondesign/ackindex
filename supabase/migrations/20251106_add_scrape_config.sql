-- Add granular scrape configuration options to scheduled_scrapes table
-- Date: 2025-11-06

-- Add columns for Apify scraper configuration
ALTER TABLE scheduled_scrapes
ADD COLUMN IF NOT EXISTS max_depth INTEGER DEFAULT 2 CHECK (max_depth >= 1 AND max_depth <= 10),
ADD COLUMN IF NOT EXISTS max_pages INTEGER DEFAULT 20 CHECK (max_pages >= 1 AND max_pages <= 200),
ADD COLUMN IF NOT EXISTS extract_pdfs BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS scrape_javascript BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS wait_for_dynamic_content BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS timeout_seconds INTEGER DEFAULT 30 CHECK (timeout_seconds >= 10 AND timeout_seconds <= 120);

-- Add columns for chunking configuration
ALTER TABLE scheduled_scrapes
ADD COLUMN IF NOT EXISTS chunk_size INTEGER DEFAULT 500 CHECK (chunk_size >= 100 AND chunk_size <= 2000),
ADD COLUMN IF NOT EXISTS chunk_overlap INTEGER DEFAULT 50 CHECK (chunk_overlap >= 0 AND chunk_overlap <= 500);

-- Add column for selectors/filters (stored as JSONB for flexibility)
ALTER TABLE scheduled_scrapes
ADD COLUMN IF NOT EXISTS scrape_options JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN scheduled_scrapes.max_depth IS 'Maximum depth for recursive crawling (1-10)';
COMMENT ON COLUMN scheduled_scrapes.max_pages IS 'Maximum number of pages to scrape (1-200)';
COMMENT ON COLUMN scheduled_scrapes.extract_pdfs IS 'Whether to extract and process linked PDF files';
COMMENT ON COLUMN scheduled_scrapes.scrape_javascript IS 'Whether to execute JavaScript on pages (slower but more complete)';
COMMENT ON COLUMN scheduled_scrapes.wait_for_dynamic_content IS 'Whether to wait for dynamic content to load';
COMMENT ON COLUMN scheduled_scrapes.timeout_seconds IS 'Timeout per page in seconds (10-120)';
COMMENT ON COLUMN scheduled_scrapes.chunk_size IS 'Token size for text chunking (100-2000)';
COMMENT ON COLUMN scheduled_scrapes.chunk_overlap IS 'Token overlap between chunks (0-500)';
COMMENT ON COLUMN scheduled_scrapes.scrape_options IS 'Additional scraping options as JSON (e.g., CSS selectors, exclude patterns)';

-- Drop the existing function first (required when changing return type)
DROP FUNCTION IF EXISTS get_urls_for_scraping(INTEGER);

-- Recreate the get_urls_for_scraping function to include new columns
CREATE OR REPLACE FUNCTION get_urls_for_scraping(batch_size INTEGER DEFAULT 5)
RETURNS TABLE (
  id UUID,
  url TEXT,
  title TEXT,
  priority INTEGER,
  error_count INTEGER,
  max_depth INTEGER,
  max_pages INTEGER,
  extract_pdfs BOOLEAN,
  scrape_javascript BOOLEAN,
  wait_for_dynamic_content BOOLEAN,
  timeout_seconds INTEGER,
  chunk_size INTEGER,
  chunk_overlap INTEGER,
  scrape_options JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ss.id,
    ss.url,
    ss.title,
    ss.priority,
    ss.error_count,
    ss.max_depth,
    ss.max_pages,
    ss.extract_pdfs,
    ss.scrape_javascript,
    ss.wait_for_dynamic_content,
    ss.timeout_seconds,
    ss.chunk_size,
    ss.chunk_overlap,
    ss.scrape_options
  FROM scheduled_scrapes ss
  WHERE ss.status = 'active'
    AND ss.next_scrape_at <= NOW()
  ORDER BY ss.priority DESC, ss.next_scrape_at ASC
  LIMIT batch_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
