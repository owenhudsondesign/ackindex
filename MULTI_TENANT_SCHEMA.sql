-- =====================================================
-- Multi-Tenant Architecture for Multiple Towns
-- =====================================================

-- ============================================
-- 1. ORGANIZATIONS TABLE (Towns)
-- ============================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Town identification
  name TEXT NOT NULL UNIQUE, -- "Town of Acton", "City of Nantucket"
  slug TEXT NOT NULL UNIQUE, -- "acton", "nantucket" (for URLs)

  -- Location
  state_code TEXT NOT NULL, -- "MA", "CT"
  county TEXT,
  timezone TEXT DEFAULT 'America/New_York',

  -- Contact
  website_url TEXT,
  contact_email TEXT,

  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',

  -- Subscription/Billing
  subscription_tier TEXT DEFAULT 'free', -- 'free', 'basic', 'pro', 'enterprise'
  subscription_status TEXT DEFAULT 'active', -- 'active', 'suspended', 'cancelled'
  subscription_started_at TIMESTAMP,
  subscription_expires_at TIMESTAMP,

  -- Usage limits (based on tier)
  max_storage_gb INTEGER DEFAULT 10,
  max_videos INTEGER DEFAULT 100,
  max_hours INTEGER DEFAULT 100,
  max_staff_users INTEGER DEFAULT 5,

  -- Usage tracking
  current_storage_gb DECIMAL(10,2) DEFAULT 0,
  current_videos INTEGER DEFAULT 0,
  current_hours DECIMAL(10,2) DEFAULT 0,

  -- Settings
  settings JSONB DEFAULT '{}',

  -- Flags
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true, -- Allow public search

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_state ON organizations(state_code);
CREATE INDEX idx_organizations_subscription_tier ON organizations(subscription_tier);

-- ============================================
-- 2. UPDATE EXISTING TABLES - ADD ORGANIZATION_ID
-- ============================================

-- Add organization_id to documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_documents_organization ON documents(organization_id);

-- Add organization_id to meeting_videos
ALTER TABLE meeting_videos ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_meeting_videos_organization ON meeting_videos(organization_id);

-- Add organization_id to user_profiles (staff members belong to organizations)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization ON user_profiles(organization_id);

-- Add organization_id to conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS idx_conversations_organization ON conversations(organization_id);

-- Add organization_id to query_logs
ALTER TABLE query_logs ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
CREATE INDEX IF NOT EXISTS idx_query_logs_organization ON query_logs(organization_id);

-- ============================================
-- 3. ORGANIZATION MEMBERSHIPS
-- ============================================

CREATE TABLE IF NOT EXISTS organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  role TEXT NOT NULL DEFAULT 'viewer', -- 'admin', 'staff', 'viewer'
  permissions JSONB DEFAULT '[]', -- ['upload_videos', 'approve_videos', 'manage_users']

  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'suspended', 'invited'
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP,
  joined_at TIMESTAMP DEFAULT NOW(),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_memberships_org ON organization_memberships(organization_id);
CREATE INDEX idx_org_memberships_user ON organization_memberships(user_id);
CREATE INDEX idx_org_memberships_role ON organization_memberships(role);

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS) UPDATES
-- ============================================

-- Drop existing policies that need updating
DROP POLICY IF EXISTS "Authenticated users can read documents" ON documents;
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON documents;

-- NEW: Users can only see documents from their organization OR public organizations
CREATE POLICY "Users see org documents or public"
  ON documents
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = auth.uid()
    )
    OR
    organization_id IN (
      SELECT id
      FROM organizations
      WHERE is_public = true AND is_active = true
    )
  );

-- Staff can insert documents for their organization
CREATE POLICY "Staff can insert org documents"
  ON documents
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'staff')
    )
  );

-- Similar policies for meeting_videos
DROP POLICY IF EXISTS "Users can view meeting videos" ON meeting_videos;

CREATE POLICY "Users see org videos or public"
  ON meeting_videos
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_memberships
      WHERE user_id = auth.uid()
    )
    OR
    (is_public = true AND organization_id IN (
      SELECT id FROM organizations WHERE is_active = true
    ))
  );

-- ============================================
-- 5. USAGE TRACKING FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_organization_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update video count and storage
    UPDATE organizations
    SET
      current_videos = current_videos + 1,
      current_storage_gb = current_storage_gb + (NEW.file_size_bytes::DECIMAL / 1073741824),
      current_hours = current_hours + (COALESCE(NEW.duration_seconds, 0)::DECIMAL / 3600)
    WHERE id = NEW.organization_id;

  ELSIF TG_OP = 'DELETE' THEN
    -- Decrease counts
    UPDATE organizations
    SET
      current_videos = GREATEST(current_videos - 1, 0),
      current_storage_gb = GREATEST(current_storage_gb - (OLD.file_size_bytes::DECIMAL / 1073741824), 0),
      current_hours = GREATEST(current_hours - (COALESCE(OLD.duration_seconds, 0)::DECIMAL / 3600), 0)
    WHERE id = OLD.organization_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Add trigger to meeting_videos
DROP TRIGGER IF EXISTS track_organization_usage ON meeting_videos;
CREATE TRIGGER track_organization_usage
  AFTER INSERT OR DELETE ON meeting_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_usage();

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Check if user can access organization
CREATE OR REPLACE FUNCTION user_can_access_org(user_id UUID, org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM organization_memberships
    WHERE organization_id = org_id
    AND user_id = user_id
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if organization has reached limits
CREATE OR REPLACE FUNCTION org_within_limits(org_id UUID)
RETURNS TABLE(
  can_upload BOOLEAN,
  storage_used_pct DECIMAL,
  videos_used_pct DECIMAL,
  hours_used_pct DECIMAL,
  limit_reached TEXT[]
) AS $$
DECLARE
  org RECORD;
  limits TEXT[] := '{}';
BEGIN
  SELECT * INTO org FROM organizations WHERE id = org_id;

  -- Check each limit
  IF org.current_storage_gb >= org.max_storage_gb THEN
    limits := array_append(limits, 'storage');
  END IF;

  IF org.current_videos >= org.max_videos THEN
    limits := array_append(limits, 'videos');
  END IF;

  IF org.current_hours >= org.max_hours THEN
    limits := array_append(limits, 'hours');
  END IF;

  RETURN QUERY SELECT
    (array_length(limits, 1) IS NULL) as can_upload,
    ROUND((org.current_storage_gb / NULLIF(org.max_storage_gb, 0)) * 100, 2) as storage_used_pct,
    ROUND((org.current_videos::DECIMAL / NULLIF(org.max_videos, 0)) * 100, 2) as videos_used_pct,
    ROUND((org.current_hours / NULLIF(org.max_hours, 0)) * 100, 2) as hours_used_pct,
    limits as limit_reached;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. SEED DATA - EXAMPLE ORGANIZATIONS
-- ============================================

-- Example: Create initial town
-- INSERT INTO organizations (name, slug, state_code, subscription_tier, max_storage_gb, max_videos, max_hours)
-- VALUES
--   ('Town of Acton', 'acton', 'MA', 'pro', 50, 1000, 1000),
--   ('City of Nantucket', 'nantucket', 'MA', 'basic', 20, 500, 500);

-- =====================================================
-- MIGRATION NOTES
-- =====================================================

/*
IMPORTANT: Before applying this migration:

1. Backup your database
2. Create a default organization for existing data:

   INSERT INTO organizations (name, slug, state_code, is_public)
   VALUES ('Default Organization', 'default', 'MA', true)
   RETURNING id;

3. Update all existing records with the default organization_id:

   UPDATE documents SET organization_id = '<default-org-id>';
   UPDATE meeting_videos SET organization_id = '<default-org-id>';
   UPDATE user_profiles SET organization_id = '<default-org-id>' WHERE staff_approved = true;

4. Make organization_id NOT NULL after backfilling:

   ALTER TABLE documents ALTER COLUMN organization_id SET NOT NULL;
   ALTER TABLE meeting_videos ALTER COLUMN organization_id SET NOT NULL;

5. Test RLS policies with multiple test organizations before going live
*/
