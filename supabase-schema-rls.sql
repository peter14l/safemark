-- SafeMark Missing RLS Policies
-- Run this AFTER supabase-schema.sql and supabase-schema-enhancements.sql
-- This adds RLS policies for tables that were missing them

-- Trips table RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trips" ON public.trips
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own trips" ON public.trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips" ON public.trips
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips" ON public.trips
  FOR DELETE USING (auth.uid() = user_id);

-- Trip events table RLS
ALTER TABLE public.trip_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trip events" ON public.trip_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own trip events" ON public.trip_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- SOS events table RLS
ALTER TABLE public.sos_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sos events" ON public.sos_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sos events" ON public.sos_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sos events" ON public.sos_events
  FOR UPDATE USING (auth.uid() = user_id);

-- Invite codes: restrict SELECT to only valid (unused, unexpired) codes for redemption
DROP POLICY IF EXISTS "Anyone can read invite codes" ON public.invite_codes;

CREATE POLICY "Valid invite codes are readable" ON public.invite_codes
  FOR SELECT USING (used = false AND expires_at > NOW());

-- Location feed: ensure users can only see their own + partner's feed
-- (Already exists in supabase-schema.sql but adding index for performance)
CREATE INDEX IF NOT EXISTS location_feed_partner_idx ON public.location_feed(user_id, created_at DESC);

-- Add updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();