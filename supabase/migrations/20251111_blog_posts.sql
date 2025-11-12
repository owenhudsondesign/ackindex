-- =====================================================
-- Blog Posts Migration
-- Auto-generated SEO blog posts from town meetings
-- =====================================================

-- Create blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Reference to source document (town meeting)
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  -- SEO-optimized content
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL, -- Meta description / preview (160 chars)
  content TEXT NOT NULL, -- Full markdown blog post

  -- Meeting metadata for filtering/display
  meeting_type TEXT, -- "Select Board", "Planning Board", "Town Council", etc.
  meeting_date DATE,

  -- SEO metadata
  keywords TEXT[], -- Array of keywords for this meeting

  -- Publishing status
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance and SEO
CREATE INDEX IF NOT EXISTS idx_blog_posts_document_id ON blog_posts(document_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_meeting_type ON blog_posts(meeting_type);
CREATE INDEX IF NOT EXISTS idx_blog_posts_meeting_date ON blog_posts(meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);

-- Full-text search on title and content
CREATE INDEX IF NOT EXISTS idx_blog_posts_content_search
  ON blog_posts USING gin(to_tsvector('english', title || ' ' || content));

-- Auto-update timestamp trigger
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read published blog posts (public SEO content)
CREATE POLICY "Anyone can read published blog posts"
  ON blog_posts
  FOR SELECT
  USING (status = 'published');

-- Policy: Authenticated users can read all blog posts (including drafts)
CREATE POLICY "Authenticated users can read all blog posts"
  ON blog_posts
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert blog posts
CREATE POLICY "Authenticated users can insert blog posts"
  ON blog_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update blog posts
CREATE POLICY "Authenticated users can update blog posts"
  ON blog_posts
  FOR UPDATE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE blog_posts IS 'Auto-generated SEO blog posts summarizing Nantucket town meetings';
