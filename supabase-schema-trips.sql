-- SafeMark Trips Schema
-- Run this in your Supabase SQL Editor

-- Trips table
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_lat DOUBLE PRECISION NOT NULL,
  start_lng DOUBLE PRECISION NOT NULL,
  start_name TEXT NOT NULL DEFAULT 'Start',
  end_lat DOUBLE PRECISION NOT NULL,
  end_lng DOUBLE PRECISION NOT NULL,
  end_name TEXT NOT NULL DEFAULT 'Destination',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  arrival_radius_m INTEGER DEFAULT 50,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trip events log
CREATE TABLE IF NOT EXISTS public.trip_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('started', 'arrived_end', 'cancelled')),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trips_user_idx ON public.trips(user_id, status);
CREATE INDEX IF NOT EXISTS trip_events_trip_idx ON public.trip_events(trip_id);

-- RPC: notify partner of trip arrival
CREATE OR REPLACE FUNCTION public.notify_partner_trip_arrival(
  p_trip_id UUID,
  p_arrival_lat DOUBLE PRECISION,
  p_arrival_lng DOUBLE PRECISION,
  p_point_name TEXT
)
RETURNS TABLE(partner_push_token TEXT, partner_name TEXT)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT t.user_id INTO v_user_id FROM public.trips t WHERE t.id = p_trip_id;

  -- Insert into feed
  INSERT INTO public.location_feed (user_id, latitude, longitude, event_type, marker_nickname)
  VALUES (v_user_id, p_arrival_lat, p_arrival_lng, 'trip_arrival', p_point_name);

  -- Get partner
  RETURN QUERY
  SELECT p.push_token, pr.display_name
  FROM public.pairings p
  JOIN public.profiles pr ON pr.id = (
    CASE WHEN p.user_id = v_user_id THEN p.partner_id ELSE p.user_id END
  )
  WHERE (p.user_id = v_user_id OR p.partner_id = v_user_id)
    AND pr.push_enabled = TRUE;
END;
$$;

-- RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trips" ON public.trips
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own trips" ON public.trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trips" ON public.trips
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own trip events" ON public.trip_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own trip events" ON public.trip_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
