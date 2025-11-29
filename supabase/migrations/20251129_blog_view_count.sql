-- Add view_count column to blog_posts table
-- This tracks how many times each blog post has been viewed

ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Create an index for efficient sorting by view count
CREATE INDEX IF NOT EXISTS idx_blog_posts_view_count
ON blog_posts (view_count DESC)
WHERE status = 'published';

-- Create a function to atomically increment view count
CREATE OR REPLACE FUNCTION increment_blog_view_count(p_blog_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE blog_posts
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_blog_id;
END;
$$;

-- Grant execute permission to authenticated users and anon
GRANT EXECUTE ON FUNCTION increment_blog_view_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_blog_view_count(UUID) TO anon;

COMMENT ON COLUMN blog_posts.view_count IS 'Number of times this blog post has been viewed';
