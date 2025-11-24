-- Staff Accounts & Video Upload System Migration
-- Implements staff role for town employees to upload meeting videos

-- ============================================
-- 1. USER ROLES & PERMISSIONS
-- ============================================

-- Add staff_metadata to user_profiles table
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS staff_role TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS staff_department TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS staff_approved BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS staff_approved_by UUID REFERENCES auth.users(id);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS staff_approved_at TIMESTAMP;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS staff_requested_at TIMESTAMP;

-- Create staff_applications table for signup requests
CREATE TABLE IF NOT EXISTS staff_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  department TEXT NOT NULL,
  role_title TEXT NOT NULL,
  reason TEXT, -- Why they need upload access

  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP,
  admin_notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_applications_status ON staff_applications(status);
CREATE INDEX IF NOT EXISTS idx_staff_applications_user_id ON staff_applications(user_id);

-- ============================================
-- 2. MEETING VIDEOS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS meeting_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Upload metadata
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  original_filename TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,

  -- Meeting association
  meeting_date DATE,
  meeting_type TEXT, -- 'Select Board', 'Town Meeting', 'Planning Board', etc.
  meeting_title TEXT,
  meeting_description TEXT,

  -- Storage information
  storage_provider TEXT NOT NULL DEFAULT 'supabase', -- 'supabase', 'cloudflare_r2', 's3'
  storage_path TEXT NOT NULL,
  storage_url TEXT,
  public_url TEXT,

  -- Link to documents table for transcription/embeddings
  document_id UUID REFERENCES documents(id),

  -- Video metadata (extracted after upload)
  duration_seconds INTEGER,
  video_codec TEXT,
  resolution TEXT,
  fps DECIMAL(5,2),
  bitrate INTEGER,

  -- Processing status
  processing_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  transcription_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  transcription_job_id TEXT, -- AssemblyAI transcript ID
  transcription_error TEXT,
  processed_at TIMESTAMP,

  -- Flags
  is_public BOOLEAN DEFAULT false, -- Admin must approve before public
  is_archived BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meeting_videos_uploaded_by ON meeting_videos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_meeting_videos_meeting_date ON meeting_videos(meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_videos_processing_status ON meeting_videos(processing_status);
CREATE INDEX IF NOT EXISTS idx_meeting_videos_is_public ON meeting_videos(is_public);

-- ============================================
-- 3. VIDEO CHAPTERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS video_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES meeting_videos(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  timestamp_seconds INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_chapters_video_id ON video_chapters(video_id);
CREATE INDEX IF NOT EXISTS idx_video_chapters_timestamp ON video_chapters(timestamp_seconds);

-- ============================================
-- 4. UPLOAD SESSIONS TABLE (for chunked uploads)
-- ============================================

CREATE TABLE IF NOT EXISTS video_upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File information
  filename TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,

  -- Upload progress
  chunk_size INTEGER DEFAULT 10485760, -- 10MB default
  total_chunks INTEGER NOT NULL,
  chunks_received INTEGER DEFAULT 0,
  bytes_uploaded BIGINT DEFAULT 0,

  -- Meeting metadata
  meeting_date DATE,
  meeting_type TEXT,
  meeting_title TEXT,
  meeting_description TEXT,

  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'assembling', 'completed', 'failed', 'cancelled'
  video_id UUID REFERENCES meeting_videos(id),
  error TEXT,

  -- Expiration
  expires_at TIMESTAMP NOT NULL,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_user_id ON video_upload_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON video_upload_sessions(status);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_expires ON video_upload_sessions(expires_at);

-- ============================================
-- 5. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Staff Applications
ALTER TABLE staff_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own staff application"
  ON staff_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own staff application"
  ON staff_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all staff applications"
  ON staff_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update staff applications"
  ON staff_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Meeting Videos
ALTER TABLE meeting_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved videos"
  ON meeting_videos FOR SELECT
  USING (is_public = true AND processing_status = 'completed');

CREATE POLICY "Staff can insert videos"
  ON meeting_videos FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by
    AND (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND (user_profiles.role = 'admin' OR user_profiles.staff_approved = true)
      )
    )
  );

CREATE POLICY "Staff can view their own uploads"
  ON meeting_videos FOR SELECT
  TO authenticated
  USING (auth.uid() = uploaded_by);

CREATE POLICY "Admins can view all videos"
  ON meeting_videos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update videos"
  ON meeting_videos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete videos"
  ON meeting_videos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Video Chapters
ALTER TABLE video_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view chapters for public videos"
  ON video_chapters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meeting_videos
      WHERE meeting_videos.id = video_chapters.video_id
      AND meeting_videos.is_public = true
    )
  );

CREATE POLICY "Staff can manage chapters for their videos"
  ON video_chapters FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meeting_videos
      WHERE meeting_videos.id = video_chapters.video_id
      AND meeting_videos.uploaded_by = auth.uid()
    )
  );

-- Upload Sessions
ALTER TABLE video_upload_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own upload sessions"
  ON video_upload_sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- 6. FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_video_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_meeting_videos_updated_at
  BEFORE UPDATE ON meeting_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_video_updated_at();

CREATE TRIGGER update_upload_sessions_updated_at
  BEFORE UPDATE ON video_upload_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_video_updated_at();

CREATE TRIGGER update_staff_applications_updated_at
  BEFORE UPDATE ON staff_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_video_updated_at();

-- Function to approve staff application
CREATE OR REPLACE FUNCTION approve_staff_application(
  application_id UUID,
  admin_user_id UUID,
  notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user_id from application
  SELECT user_id INTO v_user_id
  FROM staff_applications
  WHERE id = application_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Update application status
  UPDATE staff_applications
  SET
    status = 'approved',
    reviewed_by = admin_user_id,
    reviewed_at = NOW(),
    admin_notes = notes
  WHERE id = application_id;

  -- Update user profile
  UPDATE user_profiles
  SET
    staff_approved = true,
    staff_approved_by = admin_user_id,
    staff_approved_at = NOW()
  WHERE id = v_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject staff application
CREATE OR REPLACE FUNCTION reject_staff_application(
  application_id UUID,
  admin_user_id UUID,
  notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE staff_applications
  SET
    status = 'rejected',
    reviewed_by = admin_user_id,
    reviewed_at = NOW(),
    admin_notes = notes
  WHERE id = application_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired upload sessions
CREATE OR REPLACE FUNCTION cleanup_expired_upload_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM video_upload_sessions
    WHERE expires_at < NOW()
    AND status IN ('active', 'failed', 'cancelled')
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. STORAGE BUCKET (if using Supabase Storage)
-- ============================================

-- Create storage bucket for videos (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-videos', 'meeting-videos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$
BEGIN
  -- Public can view approved videos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Public can view approved videos'
  ) THEN
    CREATE POLICY "Public can view approved videos"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'meeting-videos'
        AND EXISTS (
          SELECT 1 FROM meeting_videos
          WHERE meeting_videos.storage_path = storage.objects.name
          AND meeting_videos.is_public = true
        )
      );
  END IF;

  -- Staff can upload videos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Staff can upload videos'
  ) THEN
    CREATE POLICY "Staff can upload videos"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'meeting-videos'
        AND (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = auth.uid()
            AND (user_profiles.role = 'admin' OR user_profiles.staff_approved = true)
          )
        )
      );
  END IF;

  -- Staff can update their own uploads
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Staff can update own uploads'
  ) THEN
    CREATE POLICY "Staff can update own uploads"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'meeting-videos'
        AND owner = auth.uid()
      );
  END IF;

  -- Admins can delete videos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Admins can delete videos'
  ) THEN
    CREATE POLICY "Admins can delete videos"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'meeting-videos'
        AND EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- ============================================
-- 8. GRANTS
-- ============================================

GRANT SELECT, INSERT ON staff_applications TO authenticated;
GRANT UPDATE ON staff_applications TO authenticated;

GRANT SELECT, INSERT, UPDATE ON meeting_videos TO authenticated;
GRANT DELETE ON meeting_videos TO authenticated;

GRANT ALL ON video_chapters TO authenticated;
GRANT ALL ON video_upload_sessions TO authenticated;

-- ============================================
-- 9. COMMENTS
-- ============================================

COMMENT ON TABLE staff_applications IS 'Town staff signup requests requiring admin approval';
COMMENT ON TABLE meeting_videos IS 'Uploaded meeting video files with metadata and processing status';
COMMENT ON TABLE video_chapters IS 'Chapter markers/timestamps for meeting videos';
COMMENT ON TABLE video_upload_sessions IS 'Chunked upload session tracking for large video files';

COMMENT ON COLUMN user_profiles.staff_approved IS 'Whether user is approved as town staff for video uploads';
COMMENT ON COLUMN meeting_videos.is_public IS 'Whether video is approved for public viewing (requires admin approval)';
COMMENT ON COLUMN video_upload_sessions.expires_at IS 'Upload session expires after 4 hours for security';
