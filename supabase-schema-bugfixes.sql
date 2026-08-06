-- SafeMark Bug-Fix Migration
-- Covers issues #2, #4, and #8 from the broken-features audit.
-- Run this once in your Supabase SQL Editor. Safe to re-run.

-- ────────────────────────────────────────────────────────────────────────────
-- Fix #2 — notify_partner_sos: queried non-existent table "pairs"
--           (correct table is "pairings"). Also fixed CASE logic so
--           v_partner_id resolves to the OTHER user, not always partner_id.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_partner_sos(
  p_user_id   UUID,
  p_latitude  DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION
)
RETURNS VOID AS $$
DECLARE
  v_partner_id UUID;
BEGIN
  SELECT
    CASE WHEN user_id = p_user_id THEN partner_id ELSE user_id END
  INTO v_partner_id
  FROM public.pairings
  WHERE user_id = p_user_id OR partner_id = p_user_id
  LIMIT 1;

  IF v_partner_id IS NOT NULL THEN
    INSERT INTO public.location_feed (user_id, latitude, longitude, event_type, marker_nickname)
    VALUES (p_user_id, p_latitude, p_longitude, 'sos_activated', 'SOS EMERGENCY');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────────────────────────────────────
-- Fix #4 — Dashboard "trail points" always 0: the breadcrumbs RLS policy
--           only allowed users to read their OWN rows, so the partner
--           breadcrumb query always returned empty.
--           New policy mirrors the location_feed partner-read pattern.
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Partners can view partner breadcrumbs" ON public.breadcrumbs;

CREATE POLICY "Partners can view partner breadcrumbs"
  ON public.breadcrumbs
  FOR SELECT
  USING (
    user_id IN (
      SELECT CASE WHEN user_id = auth.uid() THEN partner_id ELSE user_id END
      FROM public.pairings
      WHERE user_id = auth.uid() OR partner_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- Fix #8 — purge_old_data security vuln: the function had no user scoping,
--           so any authenticated user pressing "Auto-Delete" wiped ALL users'
--           data. Now every DELETE is filtered to auth.uid() only.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.purge_old_data(p_days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid    UUID      := auth.uid();
  v_cutoff TIMESTAMPTZ := NOW() - (p_days || ' days')::INTERVAL;
  v_deleted INTEGER  := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.location_feed   WHERE user_id = v_uid AND created_at < v_cutoff;
  v_deleted := v_deleted + FOUND::INTEGER;
  DELETE FROM public.geofence_events WHERE user_id = v_uid AND created_at < v_cutoff;
  v_deleted := v_deleted + FOUND::INTEGER;
  DELETE FROM public.heartbeats      WHERE user_id = v_uid AND created_at < v_cutoff;
  v_deleted := v_deleted + FOUND::INTEGER;
  DELETE FROM public.speed_alerts    WHERE user_id = v_uid AND created_at < v_cutoff;
  v_deleted := v_deleted + FOUND::INTEGER;
  DELETE FROM public.network_events  WHERE user_id = v_uid AND created_at < v_cutoff;
  v_deleted := v_deleted + FOUND::INTEGER;
  DELETE FROM public.breadcrumbs     WHERE user_id = v_uid AND created_at < v_cutoff;
  v_deleted := v_deleted + FOUND::INTEGER;
  DELETE FROM public.trip_events     WHERE user_id = v_uid AND created_at < v_cutoff;
  v_deleted := v_deleted + FOUND::INTEGER;
  DELETE FROM public.trips
    WHERE user_id = v_uid
      AND created_at < v_cutoff
      AND status IN ('completed', 'cancelled');
  v_deleted := v_deleted + FOUND::INTEGER;

  RETURN v_deleted;
END;
$$;
