-- =====================================================
-- Enhanced Analytics for AckIndex Admin Dashboard
-- Adds peak usage times and most viewed meetings/documents
-- =====================================================

-- =====================================================
-- Get peak usage times by hour of day
-- =====================================================
CREATE OR REPLACE FUNCTION get_peak_usage_times(
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  hour_of_day INTEGER,
  query_count BIGINT,
  unique_users BIGINT,
  avg_response_time_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(HOUR FROM created_at)::INTEGER as hour_of_day,
    COUNT(*)::BIGINT as query_count,
    COUNT(DISTINCT user_id)::BIGINT as unique_users,
    ROUND(AVG(response_time_ms), 2) as avg_response_time_ms
  FROM query_logs
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY EXTRACT(HOUR FROM created_at)
  ORDER BY hour_of_day;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Get most viewed/referenced documents/meetings
-- Based on how many times they appear in query citations
-- =====================================================
CREATE OR REPLACE FUNCTION get_most_viewed_documents(
  limit_count INTEGER DEFAULT 20,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  document_id UUID,
  document_title TEXT,
  source_url TEXT,
  source_type VARCHAR,
  view_count BIGINT,
  unique_users BIGINT,
  last_viewed TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.document_id,
    sc.title as document_title,
    sc.url as source_url,
    sc.content_type as source_type,
    COUNT(ql.id)::BIGINT as view_count,
    COUNT(DISTINCT ql.user_id)::BIGINT as unique_users,
    MAX(ql.created_at) as last_viewed
  FROM query_logs ql
  INNER JOIN scraped_content sc ON sc.document_id IS NOT NULL
  WHERE ql.created_at >= NOW() - (days_back || ' days')::INTERVAL
    AND ql.has_results = true
    AND ql.num_citations > 0
  GROUP BY sc.document_id, sc.title, sc.url, sc.content_type
  ORDER BY view_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Get usage patterns by day of week
-- =====================================================
CREATE OR REPLACE FUNCTION get_usage_by_day_of_week(
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  day_of_week INTEGER,
  day_name TEXT,
  query_count BIGINT,
  avg_queries_per_day NUMERIC,
  unique_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(DOW FROM created_at)::INTEGER as day_of_week,
    TO_CHAR(created_at, 'Day') as day_name,
    COUNT(*)::BIGINT as query_count,
    ROUND(COUNT(*)::NUMERIC / GREATEST(COUNT(DISTINCT DATE(created_at)), 1), 2) as avg_queries_per_day,
    COUNT(DISTINCT user_id)::BIGINT as unique_users
  FROM query_logs
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY EXTRACT(DOW FROM created_at), TO_CHAR(created_at, 'Day')
  ORDER BY day_of_week;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Get search effectiveness metrics
-- Shows which types of queries get the best results
-- =====================================================
CREATE OR REPLACE FUNCTION get_search_effectiveness_metrics()
RETURNS TABLE (
  has_multiple_citations BOOLEAN,
  query_count BIGINT,
  avg_response_time_ms NUMERIC,
  helpful_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (num_citations > 1) as has_multiple_citations,
    COUNT(*)::BIGINT as query_count,
    ROUND(AVG(response_time_ms), 2) as avg_response_time_ms,
    ROUND(
      AVG(CASE WHEN user_feedback = 'helpful' THEN 1
               WHEN user_feedback = 'not_helpful' THEN 0
               ELSE NULL END) * 100,
      2
    ) as helpful_rate
  FROM query_logs
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY (num_citations > 1)
  ORDER BY has_multiple_citations DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- NOTES
-- =====================================================
/*
This migration adds enhanced analytics functions:

1. Peak Usage Times
   - Query volume by hour of day
   - Helps identify when users are most active
   - Useful for scheduling maintenance windows

2. Most Viewed Documents/Meetings
   - Tracks which content is most frequently referenced
   - Shows engagement with specific meetings
   - Identifies popular topics

3. Usage by Day of Week
   - Query patterns across the week
   - Average queries per weekday
   - Helps understand user behavior patterns

4. Search Effectiveness
   - Correlation between citations and helpfulness
   - Response time analysis
   - Quality metrics

To apply:
1. Run in Supabase SQL Editor or via migration
2. Functions are accessible to authenticated users
3. Results cached at application level if needed
*/
