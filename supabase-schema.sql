-- SafeMark Database Schema v2
-- Run this in your Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  push_token TEXT,
  push_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pairings
CREATE TABLE IF NOT EXISTS public.pairings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, partner_id)
);

-- Invite codes
CREATE TABLE IF NOT EXISTS public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geofence markers
CREATE TABLE IF NOT EXISTS public.markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  location extensions.geography(POINT, 4326) NOT NULL,
  radius_meters INTEGER DEFAULT 100,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS markers_geo_idx ON public.markers USING GIST(location);

-- Geofence crossing events
CREATE TABLE IF NOT EXISTS public.geofence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  marker_id UUID REFERENCES public.markers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('entered', 'exited')),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Location feed — shared location updates between partners
CREATE TABLE IF NOT EXISTS public.location_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  event_type TEXT NOT NULL, -- 'location_update', 'geofence_crossing', 'journey_start', 'journey_end'
  marker_nickname TEXT,     -- set when event_type is 'geofence_crossing'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS location_feed_user_idx ON public.location_feed(user_id, created_at DESC);

-- RPC: get marker location as lat/lng
CREATE OR REPLACE FUNCTION get_marker_location(marker_id UUID)
RETURNS TABLE(latitude DOUBLE PRECISION, longitude DOUBLE PRECISION)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT ST_Y(location::geometry) AS latitude, ST_X(location::geometry) AS longitude
  FROM public.markers WHERE id = marker_id;
$$;

-- RPC: find markers within distance
CREATE OR REPLACE FUNCTION find_nearby_markers(
  p_user UUID, lat DOUBLE PRECISION, lng DOUBLE PRECISION, max_dist INTEGER DEFAULT 500
)
RETURNS TABLE(marker_id UUID, nickname TEXT, distance_meters DOUBLE PRECISION)
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT m.id, m.nickname,
    ST_DDistance(m.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography)
  FROM public.markers m
  WHERE m.user_id = p_user AND m.active = TRUE
    AND ST_DWithin(m.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, max_dist)
  ORDER BY 3;
$$;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own pairings" ON public.pairings FOR SELECT USING (auth.uid() = user_id OR auth.uid() = partner_id);
CREATE POLICY "Users can create pairings" ON public.pairings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read invite codes" ON public.invite_codes FOR SELECT USING (TRUE);
CREATE POLICY "Users can create invite codes" ON public.invite_codes FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own invite codes" ON public.invite_codes FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can view own markers" ON public.markers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own markers" ON public.markers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own markers" ON public.markers FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own events" ON public.geofence_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own events" ON public.geofence_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Location feed: user sees their own + partner's
CREATE POLICY "Users can view feed" ON public.location_feed
  FOR SELECT USING (
    auth.uid() = user_id
    OR user_id IN (
      SELECT CASE WHEN user_id = auth.uid() THEN partner_id ELSE user_id END
      FROM public.pairings
      WHERE user_id = auth.uid() OR partner_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own feed" ON public.location_feed
  FOR INSERT WITH CHECK (auth.uid() = user_id);
