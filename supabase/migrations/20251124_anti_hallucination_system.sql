-- Flagging System for Incorrect Answers
-- Allows users to report hallucinations and incorrect responses

-- Table: flagged_responses
-- Stores user-reported incorrect answers for review
CREATE TABLE IF NOT EXISTS flagged_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Query & Response Info
  query_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  citations JSONB, -- Array of citation objects

  -- User Context
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT, -- Store email for anonymous users
  is_anonymous BOOLEAN DEFAULT false,

  -- Flag Details
  flag_reason TEXT, -- User's explanation of what's wrong
  flag_type VARCHAR(50), -- 'incorrect_fact', 'missing_info', 'wrong_source', 'other'

  -- Verification Metadata (from anti-hallucination system)
  verification_result JSONB, -- Full verification object
  similarity_scores JSONB, -- Array of retrieval similarity scores

  -- Review Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'false_positive', 'fixed'
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  admin_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_flagged_responses_status ON flagged_responses(status);
CREATE INDEX IF NOT EXISTS idx_flagged_responses_created_at ON flagged_responses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flagged_responses_user_id ON flagged_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_flagged_responses_flag_type ON flagged_responses(flag_type);

-- Table: hallucination_metrics
-- Aggregated metrics for monitoring hallucination rates over time
CREATE TABLE IF NOT EXISTS hallucination_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Time window
  date DATE NOT NULL,
  hour INTEGER, -- 0-23 for hourly metrics (null for daily aggregates)

  -- Query metrics
  total_queries INTEGER DEFAULT 0,
  queries_with_citations INTEGER DEFAULT 0,
  queries_no_results INTEGER DEFAULT 0, -- "I don't know" responses

  -- Confidence metrics
  high_confidence_responses INTEGER DEFAULT 0, -- Avg similarity >= 85%
  medium_confidence_responses INTEGER DEFAULT 0, -- 78-85%
  low_confidence_responses INTEGER DEFAULT 0, -- < 78%
  avg_similarity_score NUMERIC(5,2), -- Average retrieval similarity

  -- Verification metrics
  verified_responses INTEGER DEFAULT 0, -- Passed all verification layers
  blocked_responses INTEGER DEFAULT 0, -- Failed verification, blocked
  cross_model_failures INTEGER DEFAULT 0,
  numerical_verification_failures INTEGER DEFAULT 0,

  -- User feedback
  flagged_responses INTEGER DEFAULT 0,
  confirmed_hallucinations INTEGER DEFAULT 0, -- Flags confirmed by review

  -- Calculated rates
  hallucination_rate NUMERIC(5,2), -- (confirmed_hallucinations / total_queries) * 100
  citation_completeness NUMERIC(5,2), -- (queries_with_citations / total_queries) * 100
  fallback_frequency NUMERIC(5,2), -- (queries_no_results / total_queries) * 100

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure one row per date/hour
  UNIQUE(date, hour)
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_hallucination_metrics_date ON hallucination_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_hallucination_metrics_date_hour ON hallucination_metrics(date DESC, hour DESC);

-- Table: verification_logs
-- Detailed logs of verification checks for debugging
CREATE TABLE IF NOT EXISTS verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Query context
  query_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Verification results
  is_valid BOOLEAN NOT NULL,
  confidence VARCHAR(10), -- 'high', 'medium', 'low'
  issues JSONB, -- Array of issue strings
  warnings JSONB, -- Array of warning strings

  -- Layer-specific results
  citations_present BOOLEAN,
  numbers_verified BOOLEAN,
  no_speculation BOOLEAN,
  facts_grounded BOOLEAN,
  cross_model_verified BOOLEAN,
  cross_model_confidence INTEGER, -- 0-100

  -- Metadata
  retrieval_similarity NUMERIC(5,4), -- Top result similarity
  num_citations INTEGER,
  response_time_ms INTEGER,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verification_logs_created_at ON verification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_logs_is_valid ON verification_logs(is_valid);
CREATE INDEX IF NOT EXISTS idx_verification_logs_confidence ON verification_logs(confidence);

-- Row Level Security (RLS)

-- Flagged responses: Users can view/create their own, admins can see all
ALTER TABLE flagged_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create flags"
  ON flagged_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own flags"
  ON flagged_responses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- TODO: Add admin policy (requires admin role system)
-- CREATE POLICY "Admins can view all flags"
--   ON flagged_responses FOR SELECT
--   TO authenticated
--   USING (is_admin(auth.uid()));

-- Metrics: Read-only for authenticated users (populated by system)
ALTER TABLE hallucination_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view metrics"
  ON hallucination_metrics FOR SELECT
  TO authenticated
  USING (true);

-- Verification logs: System-only (no user access)
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;

-- No policies - only service role can access

-- Function: Update metrics timestamp
CREATE OR REPLACE FUNCTION update_hallucination_metrics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_hallucination_metrics_timestamp
  BEFORE UPDATE ON hallucination_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_hallucination_metrics_timestamp();

-- Function: Record query metrics (called after each query)
CREATE OR REPLACE FUNCTION record_query_metrics(
  p_has_citations BOOLEAN,
  p_has_results BOOLEAN,
  p_avg_similarity NUMERIC,
  p_confidence VARCHAR(10),
  p_is_verified BOOLEAN,
  p_is_blocked BOOLEAN,
  p_verification_issues JSONB
) RETURNS VOID AS $$
DECLARE
  v_date DATE := CURRENT_DATE;
  v_hour INTEGER := EXTRACT(HOUR FROM NOW());
BEGIN
  -- Insert or update metrics for current hour
  INSERT INTO hallucination_metrics (
    date,
    hour,
    total_queries,
    queries_with_citations,
    queries_no_results,
    high_confidence_responses,
    medium_confidence_responses,
    low_confidence_responses,
    avg_similarity_score,
    verified_responses,
    blocked_responses,
    cross_model_failures,
    numerical_verification_failures
  ) VALUES (
    v_date,
    v_hour,
    1,
    CASE WHEN p_has_citations THEN 1 ELSE 0 END,
    CASE WHEN NOT p_has_results THEN 1 ELSE 0 END,
    CASE WHEN p_confidence = 'high' THEN 1 ELSE 0 END,
    CASE WHEN p_confidence = 'medium' THEN 1 ELSE 0 END,
    CASE WHEN p_confidence = 'low' THEN 1 ELSE 0 END,
    p_avg_similarity,
    CASE WHEN p_is_verified THEN 1 ELSE 0 END,
    CASE WHEN p_is_blocked THEN 1 ELSE 0 END,
    CASE WHEN p_verification_issues::jsonb @> '["Cross-model verification failed"]'::jsonb THEN 1 ELSE 0 END,
    CASE WHEN p_verification_issues::text LIKE '%not found in source%' THEN 1 ELSE 0 END
  )
  ON CONFLICT (date, hour) DO UPDATE SET
    total_queries = hallucination_metrics.total_queries + 1,
    queries_with_citations = hallucination_metrics.queries_with_citations + CASE WHEN p_has_citations THEN 1 ELSE 0 END,
    queries_no_results = hallucination_metrics.queries_no_results + CASE WHEN NOT p_has_results THEN 1 ELSE 0 END,
    high_confidence_responses = hallucination_metrics.high_confidence_responses + CASE WHEN p_confidence = 'high' THEN 1 ELSE 0 END,
    medium_confidence_responses = hallucination_metrics.medium_confidence_responses + CASE WHEN p_confidence = 'medium' THEN 1 ELSE 0 END,
    low_confidence_responses = hallucination_metrics.low_confidence_responses + CASE WHEN p_confidence = 'low' THEN 1 ELSE 0 END,
    avg_similarity_score = (hallucination_metrics.avg_similarity_score * hallucination_metrics.total_queries + p_avg_similarity) / (hallucination_metrics.total_queries + 1),
    verified_responses = hallucination_metrics.verified_responses + CASE WHEN p_is_verified THEN 1 ELSE 0 END,
    blocked_responses = hallucination_metrics.blocked_responses + CASE WHEN p_is_blocked THEN 1 ELSE 0 END,
    cross_model_failures = hallucination_metrics.cross_model_failures + CASE WHEN p_verification_issues::jsonb @> '["Cross-model verification failed"]'::jsonb THEN 1 ELSE 0 END,
    numerical_verification_failures = hallucination_metrics.numerical_verification_failures + CASE WHEN p_verification_issues::text LIKE '%not found in source%' THEN 1 ELSE 0 END,
    updated_at = NOW();

  -- Update calculated rates
  UPDATE hallucination_metrics SET
    citation_completeness = (queries_with_citations::numeric / NULLIF(total_queries, 0)) * 100,
    fallback_frequency = (queries_no_results::numeric / NULLIF(total_queries, 0)) * 100
  WHERE date = v_date AND hour = v_hour;
END;
$$ LANGUAGE plpgsql;

-- Function: Increment flagged responses counter
CREATE OR REPLACE FUNCTION record_flagged_response() RETURNS VOID AS $$
DECLARE
  v_date DATE := CURRENT_DATE;
  v_hour INTEGER := EXTRACT(HOUR FROM NOW());
BEGIN
  INSERT INTO hallucination_metrics (date, hour, flagged_responses)
  VALUES (v_date, v_hour, 1)
  ON CONFLICT (date, hour) DO UPDATE SET
    flagged_responses = hallucination_metrics.flagged_responses + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed)
GRANT SELECT ON flagged_responses TO authenticated;
GRANT INSERT ON flagged_responses TO authenticated;
GRANT SELECT ON hallucination_metrics TO authenticated;
