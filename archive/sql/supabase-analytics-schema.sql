-- =====================================================
-- Analytics Schema for AckIndex
-- Tracks user queries for insights and analytics
-- =====================================================

-- =====================================================
-- QUERY_LOGS TABLE
-- Tracks every chat query for analytics
-- =====================================================
CREATE TABLE IF NOT EXISTS query_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- User information
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Query details
  query_text TEXT NOT NULL,
  response_text TEXT,

  -- Metadata
  tokens_used INTEGER DEFAULT 0,
  response_time_ms INTEGER, -- How long the query took
  has_results BOOLEAN DEFAULT true, -- Did we find relevant info?
  num_citations INTEGER DEFAULT 0, -- How many sources cited

  -- Quality metrics
  user_feedback VARCHAR(10) CHECK (user_feedback IN ('helpful', 'not_helpful', null)),

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_query_logs_user_id ON query_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_created_at ON query_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_logs_has_results ON query_logs(has_results);
CREATE INDEX IF NOT EXISTS idx_query_logs_user_feedback ON query_logs(user_feedback);

-- Full-text search index for query analysis
CREATE INDEX IF NOT EXISTS idx_query_logs_text_search
  ON query_logs USING gin(to_tsvector('english', query_text));

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE query_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own query logs
CREATE POLICY "Users can read own query_logs"
  ON query_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can insert query logs
CREATE POLICY "Service can insert query_logs"
  ON query_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own feedback
CREATE POLICY "Users can update own feedback"
  ON query_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- ANALYTICS FUNCTIONS
-- =====================================================

-- Get most popular search queries (last 30 days)
CREATE OR REPLACE FUNCTION get_popular_queries(
  limit_count INTEGER DEFAULT 20,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  query_text TEXT,
  query_count BIGINT,
  avg_citations NUMERIC,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ql.query_text,
    COUNT(*)::BIGINT as query_count,
    ROUND(AVG(ql.num_citations), 2) as avg_citations,
    ROUND(AVG(CASE WHEN ql.has_results THEN 1 ELSE 0 END) * 100, 2) as success_rate
  FROM query_logs ql
  WHERE ql.created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY ql.query_text
  HAVING COUNT(*) > 1 -- Only show queries that have been asked multiple times
  ORDER BY query_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Get trending topics (queries with increasing frequency)
CREATE OR REPLACE FUNCTION get_trending_topics(
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  topic TEXT,
  this_week_count BIGINT,
  last_week_count BIGINT,
  growth_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH this_week AS (
    SELECT
      query_text,
      COUNT(*) as count
    FROM query_logs
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY query_text
  ),
  last_week AS (
    SELECT
      query_text,
      COUNT(*) as count
    FROM query_logs
    WHERE created_at >= NOW() - INTERVAL '14 days'
      AND created_at < NOW() - INTERVAL '7 days'
    GROUP BY query_text
  )
  SELECT
    tw.query_text as topic,
    tw.count as this_week_count,
    COALESCE(lw.count, 0) as last_week_count,
    CASE
      WHEN COALESCE(lw.count, 0) = 0 THEN 100.0
      ELSE ROUND(((tw.count - COALESCE(lw.count, 0))::NUMERIC / COALESCE(lw.count, 1)) * 100, 2)
    END as growth_rate
  FROM this_week tw
  LEFT JOIN last_week lw ON tw.query_text = lw.query_text
  WHERE tw.count > 1 -- Minimum threshold
  ORDER BY growth_rate DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Get admin analytics overview
CREATE OR REPLACE FUNCTION get_admin_analytics_overview()
RETURNS TABLE (
  total_queries BIGINT,
  total_users BIGINT,
  queries_today BIGINT,
  queries_this_week BIGINT,
  queries_this_month BIGINT,
  avg_response_time_ms NUMERIC,
  success_rate NUMERIC,
  helpful_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_queries,
    COUNT(DISTINCT user_id)::BIGINT as total_users,
    COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END)::BIGINT as queries_today,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END)::BIGINT as queries_this_week,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END)::BIGINT as queries_this_month,
    ROUND(AVG(response_time_ms), 2) as avg_response_time_ms,
    ROUND(AVG(CASE WHEN has_results THEN 1 ELSE 0 END) * 100, 2) as success_rate,
    ROUND(
      AVG(CASE WHEN user_feedback = 'helpful' THEN 1
               WHEN user_feedback = 'not_helpful' THEN 0
               ELSE NULL END) * 100,
      2
    ) as helpful_rate
  FROM query_logs;
END;
$$ LANGUAGE plpgsql;

-- Get user analytics (for admin dashboard)
CREATE OR REPLACE FUNCTION get_user_analytics(
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  user_id UUID,
  user_email TEXT,
  subscription_tier VARCHAR,
  query_count BIGINT,
  last_query TIMESTAMP WITH TIME ZONE,
  avg_citations NUMERIC,
  total_tokens INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.id as user_id,
    u.email as user_email,
    up.subscription_tier,
    COUNT(ql.id)::BIGINT as query_count,
    MAX(ql.created_at) as last_query,
    ROUND(AVG(ql.num_citations), 2) as avg_citations,
    COALESCE(SUM(ql.tokens_used), 0)::INTEGER as total_tokens
  FROM user_profiles up
  INNER JOIN auth.users u ON up.id = u.id
  LEFT JOIN query_logs ql ON up.id = ql.user_id
  GROUP BY up.id, u.email, up.subscription_tier
  ORDER BY query_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Get query volume over time (for charts)
CREATE OR REPLACE FUNCTION get_query_volume_by_day(
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  query_count BIGINT,
  unique_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) as date,
    COUNT(*)::BIGINT as query_count,
    COUNT(DISTINCT user_id)::BIGINT as unique_users
  FROM query_logs
  WHERE created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY DATE(created_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- NOTES
-- =====================================================
/*
This schema provides:

1. Query Tracking
   - Every chat query is logged with metadata
   - Response time and quality metrics
   - User feedback for improvement

2. Popular Searches
   - Most frequently asked questions
   - Success rate per query type
   - Average number of citations

3. Trending Topics
   - Queries with increasing frequency
   - Week-over-week growth rates
   - Early trend detection

4. User Analytics
   - Per-user query patterns
   - Token usage tracking
   - Engagement metrics

5. Admin Dashboard
   - Overall system health
   - Performance metrics
   - User feedback trends

To apply this schema:
1. Run in Supabase SQL Editor
2. Ensure uuid-ossp extension is enabled
3. Check RLS policies are appropriate for your use case
*/
