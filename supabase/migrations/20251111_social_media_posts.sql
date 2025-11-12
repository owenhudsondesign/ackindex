-- =====================================================
-- Social Media Posts Table
-- Store Instagram/Facebook posts with approval workflow
-- =====================================================

-- Create enum for post status
DO $$ BEGIN
  CREATE TYPE post_status AS ENUM ('draft', 'pending_review', 'approved', 'scheduled', 'published', 'failed', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for platform
DO $$ BEGIN
  CREATE TYPE social_platform AS ENUM ('instagram', 'facebook', 'twitter', 'linkedin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create social_media_posts table
CREATE TABLE IF NOT EXISTS social_media_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Reference to source document (town meeting)
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  blog_post_id UUID REFERENCES blog_posts(id) ON DELETE SET NULL,

  -- Platform and content
  platform social_platform NOT NULL,
  content TEXT NOT NULL,
  hashtags TEXT[], -- Array of hashtags without # symbol

  -- Media
  image_url TEXT, -- Thumbnail or custom image
  video_url TEXT, -- For video posts

  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,

  -- Status and workflow
  status post_status NOT NULL DEFAULT 'draft',

  -- Approval tracking
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,

  -- Publishing details
  platform_post_id TEXT, -- ID from Instagram/Facebook after publishing
  platform_permalink TEXT, -- URL to published post

  -- Analytics (can be populated later via API)
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2),

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}', -- Additional platform-specific data

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_social_posts_document_id ON social_media_posts(document_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_blog_post_id ON social_media_posts(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_media_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_media_posts(platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled_at ON social_media_posts(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_posts_published_at ON social_media_posts(published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON social_media_posts(created_at DESC);

-- Composite index for admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_social_posts_status_platform
  ON social_media_posts(status, platform, created_at DESC);

-- Auto-update timestamp trigger
DROP TRIGGER IF EXISTS update_social_media_posts_updated_at ON social_media_posts;
CREATE TRIGGER update_social_media_posts_updated_at
  BEFORE UPDATE ON social_media_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all social media posts
CREATE POLICY "Authenticated users can read all social media posts"
  ON social_media_posts
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert social media posts
CREATE POLICY "Authenticated users can insert social media posts"
  ON social_media_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update social media posts
CREATE POLICY "Authenticated users can update social media posts"
  ON social_media_posts
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can delete social media posts
CREATE POLICY "Authenticated users can delete social media posts"
  ON social_media_posts
  FOR DELETE
  TO authenticated
  USING (true);

-- Add helpful comments
COMMENT ON TABLE social_media_posts IS 'Social media posts with approval workflow for Instagram, Facebook, etc.';
COMMENT ON COLUMN social_media_posts.status IS 'draft: Not ready | pending_review: Needs approval | approved: Ready to publish | scheduled: Queued for future | published: Live | failed: Publish error | rejected: Not approved';
COMMENT ON COLUMN social_media_posts.platform_post_id IS 'ID returned by Instagram/Facebook API after publishing';
COMMENT ON COLUMN social_media_posts.hashtags IS 'Array of hashtag text without # symbol (e.g., ["Nantucket", "TownMeeting"])';
