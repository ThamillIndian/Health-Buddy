-- ============================================
-- SUPABASE AUTHENTICATION SETUP
-- Run this script in Supabase SQL Editor
-- ============================================

-- Step 1: Add auth_id column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;

-- Step 2: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Step 3: Create function to auto-create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (auth_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE adherence_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE condition_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE derived_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can view own medications" ON medications;
DROP POLICY IF EXISTS "Users can insert own medications" ON medications;
DROP POLICY IF EXISTS "Users can update own medications" ON medications;
DROP POLICY IF EXISTS "Users can delete own medications" ON medications;
DROP POLICY IF EXISTS "Users can manage own events" ON events;
DROP POLICY IF EXISTS "Users can manage own adherence" ON adherence_log;
DROP POLICY IF EXISTS "Users can manage own alerts" ON alerts;
DROP POLICY IF EXISTS "Users can manage own conditions" ON condition_profiles;
DROP POLICY IF EXISTS "Users can view own daily data" ON derived_daily;
DROP POLICY IF EXISTS "Users can manage own reports" ON reports;

-- Step 7: Create RLS policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = auth_id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- Step 8: Create RLS policies for medications
CREATE POLICY "Users can view own medications" ON medications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = medications.user_id 
      AND users.auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own medications" ON medications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = medications.user_id 
      AND users.auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own medications" ON medications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = medications.user_id 
      AND users.auth_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own medications" ON medications
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = medications.user_id 
      AND users.auth_id = auth.uid()
    )
  );

-- Step 9: Create RLS policies for events
CREATE POLICY "Users can manage own events" ON events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = events.user_id 
      AND users.auth_id = auth.uid()
    )
  );

-- Step 10: Create RLS policies for adherence_log
CREATE POLICY "Users can manage own adherence" ON adherence_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = adherence_log.user_id 
      AND users.auth_id = auth.uid()
    )
  );

-- Step 11: Create RLS policies for alerts
CREATE POLICY "Users can manage own alerts" ON alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = alerts.user_id 
      AND users.auth_id = auth.uid()
    )
  );

-- Step 12: Create RLS policies for condition_profiles
CREATE POLICY "Users can manage own conditions" ON condition_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = condition_profiles.user_id 
      AND users.auth_id = auth.uid()
    )
  );

-- Step 13: Create RLS policies for derived_daily
CREATE POLICY "Users can view own daily data" ON derived_daily
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = derived_daily.user_id 
      AND users.auth_id = auth.uid()
    )
  );

-- Step 14: Create RLS policies for reports
CREATE POLICY "Users can manage own reports" ON reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = reports.user_id 
      AND users.auth_id = auth.uid()
    )
  );

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify setup:

-- Check if auth_id column exists
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' AND column_name = 'auth_id';

-- Check RLS status
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public';

-- Check policies
-- SELECT schemaname, tablename, policyname 
-- FROM pg_policies 
-- WHERE schemaname = 'public';

-- ============================================
-- SETUP COMPLETE!
-- ============================================
