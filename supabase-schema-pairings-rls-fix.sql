-- Migration: Fix pairings table RLS policy to allow bidirectional pairing creation
-- Run this script in your Supabase SQL Editor to apply changes.

-- Drop the old overly restrictive policy
DROP POLICY IF EXISTS "Users can create pairings" ON public.pairings;

-- Create the updated policy that allows inserting pairing rows where the user is either the initiator (user_id) or the receiver (partner_id)
CREATE POLICY "Users can create pairings" ON public.pairings 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id 
    OR auth.uid() = partner_id
  );
