-- Increase token limits for better user experience
-- Free tier: 15,000 → 50,000 tokens per month (~35-50 questions)
-- Premium tier: 999,999,999 (unlimited) stays the same

-- Update default token limit for free tier users
UPDATE user_profiles
SET monthly_token_limit = 50000
WHERE subscription_tier = 'free'
  AND monthly_token_limit = 15000;

-- Update the default for new users in the trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile with safe defaults
  INSERT INTO public.user_profiles (
    id,
    full_name,
    email_updates_enabled,
    email_updates_frequency,
    subscription_tier,
    subscription_status,
    monthly_token_limit,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'email_updates')::boolean, false),
    'weekly',
    'free',
    'active',
    50000, -- Updated from 15000 to 50000
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate key errors

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN user_profiles.monthly_token_limit IS
  'Monthly token limit: Free tier = 50,000 (~35-50 questions), Premium = 999,999,999 (unlimited)';
