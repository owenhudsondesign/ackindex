-- Anonymous Session Tracking
-- Tracks usage for anonymous (unauthenticated) users to enforce rate limits

CREATE TABLE IF NOT EXISTS anonymous_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_fingerprint TEXT NOT NULL, -- Browser fingerprint (IP + User-Agent hash)
  tokens_used INTEGER DEFAULT 0,
  queries_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),

  -- Indexes for fast lookups
  CONSTRAINT unique_fingerprint UNIQUE (session_fingerprint)
);

-- Index for fast lookups by fingerprint
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_fingerprint
  ON anonymous_sessions(session_fingerprint);

-- Index for cleanup queries (delete expired sessions)
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_expires_at
  ON anonymous_sessions(expires_at);

-- Function to get or create anonymous session
CREATE OR REPLACE FUNCTION get_or_create_anonymous_session(
  p_fingerprint TEXT,
  p_token_limit INTEGER DEFAULT 3500
)
RETURNS TABLE (
  session_id UUID,
  tokens_used INTEGER,
  tokens_remaining INTEGER,
  can_query BOOLEAN
) AS $$
DECLARE
  v_session anonymous_sessions%ROWTYPE;
  v_tokens_remaining INTEGER;
  v_can_query BOOLEAN;
BEGIN
  -- Try to find existing non-expired session
  SELECT * INTO v_session
  FROM anonymous_sessions
  WHERE session_fingerprint = p_fingerprint
    AND expires_at > NOW();

  -- If no session found, create new one
  IF NOT FOUND THEN
    INSERT INTO anonymous_sessions (session_fingerprint, tokens_used, queries_count)
    VALUES (p_fingerprint, 0, 0)
    RETURNING * INTO v_session;
  END IF;

  -- Calculate remaining tokens
  v_tokens_remaining := p_token_limit - v_session.tokens_used;
  v_can_query := v_tokens_remaining > 0;

  -- Return session info
  RETURN QUERY SELECT
    v_session.id,
    v_session.tokens_used,
    v_tokens_remaining,
    v_can_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record anonymous usage
CREATE OR REPLACE FUNCTION record_anonymous_usage(
  p_fingerprint TEXT,
  p_tokens_used INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE anonymous_sessions
  SET
    tokens_used = tokens_used + p_tokens_used,
    queries_count = queries_count + 1,
    updated_at = NOW()
  WHERE session_fingerprint = p_fingerprint
    AND expires_at > NOW();

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup function for expired sessions (run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_anonymous_sessions()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM anonymous_sessions
  WHERE expires_at < NOW() - INTERVAL '7 days'; -- Keep for 7 days for analytics

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions (assuming you have a service role)
GRANT SELECT, INSERT, UPDATE, DELETE ON anonymous_sessions TO service_role;
GRANT EXECUTE ON FUNCTION get_or_create_anonymous_session(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION record_anonymous_usage(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_anonymous_sessions() TO service_role;

-- Comment on table
COMMENT ON TABLE anonymous_sessions IS 'Tracks usage for anonymous users to enforce rate limiting. Sessions expire after 24 hours.';
