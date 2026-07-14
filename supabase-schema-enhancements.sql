-- SafeMark Enhancement Tables v2
-- Heartbeats, speed alerts, network events, breadcrumbs, trip history

-- Heartbeat pings (still-alive signal every 5 min)
CREATE TABLE IF NOT EXISTS public.heartbeats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  battery_level INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS heartbeats_user_idx ON public.heartbeats(user_id, created_at DESC);

-- Speed alerts
CREATE TABLE IF NOT EXISTS public.speed_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  speed_kmh DOUBLE PRECISION NOT NULL,
  threshold_kmh DOUBLE PRECISION NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS speed_alerts_user_idx ON public.speed_alerts(user_id, created_at DESC);

-- Network change events
CREATE TABLE IF NOT EXISTS public.network_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('wifi_change', 'cellular_change', 'offline', 'online')),
  ssid TEXT,
  previous_ssid TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS network_events_user_idx ON public.network_events(user_id, created_at DESC);

-- Tamper detection events
CREATE TABLE IF NOT EXISTS public.tamper_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('force_stopped', 'service_killed', 'permission_revoked')),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tamper_events_user_idx ON public.tamper_events(user_id, created_at DESC);

-- Breadcrumb trail (recent location path)
CREATE TABLE IF NOT EXISTS public.breadcrumbs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS breadcrumbs_user_idx ON public.breadcrumbs(user_id, created_at DESC);

-- Auto-delete old data RPC
CREATE OR REPLACE FUNCTION public.purge_old_data(p_days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ := NOW() - (p_days || ' days')::INTERVAL;
  v_deleted INTEGER := 0;
BEGIN
  DELETE FROM public.location_feed WHERE created_at < v_cutoff;
  v_deleted := v_deleted + FOUND::INTEGER;
  DELETE FROM public.geofence_events WHERE created_at < v_cutoff;
  v_deleted := v_deleted + FOUND::INTEGER;
  DELETE FROM public.heartbeats WHERE created_at < v_cutoff;
  v_deleted := v_deleted + FOUND::INTEGER;
  DELETE FROM public.speed_alerts WHERE created_at < v_cutoff;
  v_deleted := v_deleted + FOUND::INTEGER;
  DELETE FROM public.network_events WHERE created_at < v_cutoff;
  v_deleted := v_deleted + FOUND::INTEGER;
  DELETE FROM public.breadcrumbs WHERE created_at < v_cutoff;
  v_deleted := v_deleted + FOUND::INTEGER;
  DELETE FROM public.trip_events WHERE created_at < v_cutoff;
  v_deleted := v_deleted + FOUND::INTEGER;
  -- Also delete completed/cancelled trips older than cutoff
  DELETE FROM public.trips WHERE created_at < v_cutoff AND status IN ('completed', 'cancelled');
  v_deleted := v_deleted + FOUND::INTEGER;
  RETURN v_deleted;
END;
$$;

-- RLS
ALTER TABLE public.heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speed_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tamper_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breadcrumbs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own heartbeats" ON public.heartbeats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own heartbeats" ON public.heartbeats FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own speed alerts" ON public.speed_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own speed alerts" ON public.speed_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own network events" ON public.network_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own network events" ON public.network_events FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own tamper events" ON public.tamper_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tamper events" ON public.tamper_events FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own breadcrumbs" ON public.breadcrumbs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own breadcrumbs" ON public.breadcrumbs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own breadcrumbs" ON public.breadcrumbs FOR DELETE USING (auth.uid() = user_id);
