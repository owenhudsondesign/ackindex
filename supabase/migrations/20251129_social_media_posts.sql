-- Add social media posts columns to blog_posts table
-- Stores generated social media content for Facebook and Instagram

ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS social_posts JSONB DEFAULT NULL;

-- The social_posts column stores:
-- {
--   "facebook": {
--     "text": "Post text",
--     "hashtags": ["tag1", "tag2"]
--   },
--   "instagram": {
--     "caption": "Caption text",
--     "hashtags": ["tag1", "tag2"]
--   },
--   "generated_at": "2024-01-01T00:00:00Z"
-- }

COMMENT ON COLUMN blog_posts.social_posts IS 'Generated social media posts for Facebook and Instagram';

-- Create index for querying posts with/without social content
CREATE INDEX IF NOT EXISTS idx_blog_posts_has_social
ON blog_posts ((social_posts IS NOT NULL))
WHERE status = 'published';
