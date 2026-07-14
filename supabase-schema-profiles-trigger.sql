-- Migration: Automatically create public.profiles when user signs up in auth.users
-- Run this script in your Supabase SQL Editor to apply changes.

-- 1. Create a function to handle copying the user metadata to public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name', 
      split_part(NEW.email, '@', 1),
      'User'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill profiles for any existing users who lack a profile row
INSERT INTO public.profiles (id, display_name)
SELECT 
  id, 
  COALESCE(
    raw_user_meta_data->>'display_name', 
    split_part(email, '@', 1),
    'User'
  )
FROM auth.users
ON CONFLICT (id) DO NOTHING;
