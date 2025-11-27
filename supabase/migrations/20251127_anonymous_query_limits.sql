-- Migration: Change anonymous user limits from token-based to query-based (5 free questions)
-- This allows unauthenticated users to ask 5 questions before requiring signup

-- First, ensure the anonymous_sessions table exists
CREATE TABLE IF NOT EXISTS anonymous_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_fingerprint TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  queries_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  CONSTRAINT unique_fingerprint UNIQUE (session_fingerprint)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_fingerprint
  ON anonymous_sessions(session_fingerprint);

CREATE INDEX IF NOT EXISTS idx_anonymous_sessions_expires_at
  ON anonymous_sessions(expires_at);

-- Grant permissions on table
GRANT SELECT, INSERT, UPDATE, DELETE ON anonymous_sessions TO service_role;

-- New function to get or create anonymous session with query-based limits
CREATE OR REPLACE FUNCTION get_or_create_anonymous_session_v2(
  p_fingerprint TEXT,
  p_query_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  session_id UUID,
  queries_used INTEGER,
  queries_remaining INTEGER,
  tokens_used INTEGER,
  can_query BOOLEAN
) AS $$
DECLARE
  v_session anonymous_sessions%ROWTYPE;
  v_queries_remaining INTEGER;
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

  -- Calculate remaining queries
  v_queries_remaining := p_query_limit - v_session.queries_count;
  v_can_query := v_queries_remaining > 0;

  -- Return session info
  RETURN QUERY SELECT
    v_session.id,
    v_session.queries_count,
    v_queries_remaining,
    v_session.tokens_used,
    v_can_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- New function to record anonymous usage (increments query count)
CREATE OR REPLACE FUNCTION record_anonymous_usage_v2(
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_or_create_anonymous_session_v2(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION record_anonymous_usage_v2(TEXT, INTEGER) TO service_role;

-- Also create/update the legacy functions for backwards compatibility
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
  SELECT * INTO v_session
  FROM anonymous_sessions
  WHERE session_fingerprint = p_fingerprint
    AND expires_at > NOW();

  IF NOT FOUND THEN
    INSERT INTO anonymous_sessions (session_fingerprint, tokens_used, queries_count)
    VALUES (p_fingerprint, 0, 0)
    RETURNING * INTO v_session;
  END IF;

  v_tokens_remaining := p_token_limit - v_session.tokens_used;
  v_can_query := v_tokens_remaining > 0;

  RETURN QUERY SELECT
    v_session.id,
    v_session.tokens_used,
    v_tokens_remaining,
    v_can_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

CREATE OR REPLACE FUNCTION cleanup_expired_anonymous_sessions()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM anonymous_sessions
  WHERE expires_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions on all functions
GRANT EXECUTE ON FUNCTION get_or_create_anonymous_session(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION record_anonymous_usage(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_anonymous_sessions() TO service_role;

-- Comment on functions
COMMENT ON FUNCTION get_or_create_anonymous_session_v2 IS 'Get or create anonymous session with query-based limits (5 free questions)';
COMMENT ON FUNCTION record_anonymous_usage_v2 IS 'Record anonymous usage - increments query count and adds tokens';
COMMENT ON TABLE anonymous_sessions IS 'Tracks usage for anonymous users. 5 free questions before signup required.';
