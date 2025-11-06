-- Fix admin account to have premium access
-- Run this in Supabase SQL Editor

-- Update the admin account to premium
UPDATE user_profiles
SET
  subscription_tier = 'premium',
  subscription_status = 'active',
  monthly_token_limit = 50000,
  role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'owenhudsondesign@gmail.com'
);

-- Verify the update
SELECT
  up.id,
  u.email,
  up.subscription_tier,
  up.subscription_status,
  up.monthly_token_limit,
  up.role
FROM user_profiles up
JOIN auth.users u ON up.id = u.id
WHERE u.email = 'owenhudsondesign@gmail.com';
