-- SafeMark: VoIP Calling Feature
-- Run in Supabase SQL Editor after supabase-schema.sql

-- ─────────────────────────────────────────────────────────────
-- Calls table — one row per call session
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.calls (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  callee_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  call_type     TEXT NOT NULL DEFAULT 'audio'
                  CHECK (call_type IN ('audio', 'video')),
  status        TEXT NOT NULL DEFAULT 'ringing'
                  CHECK (status IN ('ringing', 'active', 'ended', 'missed', 'declined')),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at   TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  duration_seconds INTEGER,
  ended_by      UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS calls_caller_idx ON public.calls(caller_id, started_at DESC);
CREATE INDEX IF NOT EXISTS calls_callee_idx ON public.calls(callee_id, started_at DESC);
CREATE INDEX IF NOT EXISTS calls_status_idx ON public.calls(status) WHERE status IN ('ringing', 'active');

-- ─────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Either party can read the call row
CREATE POLICY "Call participants can view call"
  ON public.calls FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Only the caller can create a call row
CREATE POLICY "Caller can create call"
  ON public.calls FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

-- Either party can update (answer, decline, end)
CREATE POLICY "Participants can update call"
  ON public.calls FOR UPDATE
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- ─────────────────────────────────────────────────────────────
-- Enable Realtime on calls table so callee receives the
-- incoming call event in real-time without polling.
-- (Also enable in Supabase Dashboard > Database > Replication)
-- ─────────────────────────────────────────────────────────────
-- Run this in Supabase dashboard: toggle "calls" ON under Realtime.
-- No SQL needed — it's a UI toggle.
