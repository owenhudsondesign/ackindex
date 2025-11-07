-- Fix the get_urls_for_scraping function to include missing fields
-- This fixes the 500 error when triggering scrapes

DROP FUNCTION IF EXISTS get_urls_for_scraping(INTEGER);

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
