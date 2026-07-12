-- SOS feature tables
-- Run after the base supabase-schema.sql

-- Track SOS activations
CREATE TABLE IF NOT EXISTS sos_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deactivated_at TIMESTAMPTZ,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  audio_recordings_count INT DEFAULT 0,
  sms_sent_to JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_sos_events_user ON sos_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_events_active ON sos_events(status) WHERE status = 'active';

ALTER TABLE sos_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own SOS events"
  ON sos_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own SOS events"
  ON sos_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own SOS events"
  ON sos_events FOR UPDATE
  USING (auth.uid() = user_id);

-- Notify partner when SOS is activated via edge function
CREATE OR REPLACE FUNCTION notify_partner_sos(p_user_id UUID, p_latitude DOUBLE PRECISION, p_longitude DOUBLE PRECISION)
RETURNS VOID AS $$
DECLARE
  partner_id UUID;
BEGIN
  SELECT p.partner_id INTO partner_id
  FROM pairs WHERE user_id = p_user_id OR partner_id = p_user_id
  LIMIT 1;

  IF partner_id IS NOT NULL THEN
    INSERT INTO location_feed (user_id, latitude, longitude, event_type, marker_nickname)
    VALUES (p_user_id, p_latitude, p_longitude, 'sos_activated', 'SOS EMERGENCY');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
