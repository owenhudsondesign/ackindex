-- =====================================================
-- Add Thumbnail Support
-- Store YouTube video thumbnails for blog posts and social media
-- =====================================================

-- Add thumbnail_url to documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add thumbnail_url and social media image to blog_posts table
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS og_image_url TEXT; -- For OpenGraph / social sharing

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_documents_thumbnail ON documents(thumbnail_url) WHERE thumbnail_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blog_posts_thumbnail ON blog_posts(thumbnail_url) WHERE thumbnail_url IS NOT NULL;

-- Add comments
COMMENT ON COLUMN documents.thumbnail_url IS 'YouTube video thumbnail URL (maxresdefault, hqdefault, etc.)';
COMMENT ON COLUMN blog_posts.thumbnail_url IS 'Blog post featured image (usually from YouTube video thumbnail)';
COMMENT ON COLUMN blog_posts.og_image_url IS 'OpenGraph image for social media sharing';
