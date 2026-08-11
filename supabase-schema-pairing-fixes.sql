-- Migration: Fix Pairing and Invite Code RLS policies
-- Run this in your Supabase SQL Editor to resolve pairing errors.

-- 1. Ensure pairings insert allows bidirectional rows (where current user is either user_id or partner_id)
DROP POLICY IF EXISTS "Users can create pairings" ON public.pairings;
CREATE POLICY "Users can create pairings" ON public.pairings
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() = partner_id
  );

-- 2. Fix invite_codes UPDATE policy so the redeemer (who is not the creator) can mark the code as used
DROP POLICY IF EXISTS "Users can update own invite codes" ON public.invite_codes;
DROP POLICY IF EXISTS "Anyone can update invite codes to used" ON public.invite_codes;

CREATE POLICY "Anyone can update invite codes to used" ON public.invite_codes
  FOR UPDATE
  USING (true)
  WITH CHECK (used = true);

-- 3. Ensure invite codes are readable by any authenticated user for verification
DROP POLICY IF EXISTS "Anyone can read invite codes" ON public.invite_codes;
DROP POLICY IF EXISTS "Valid invite codes are readable" ON public.invite_codes;

CREATE POLICY "Anyone can read invite codes" ON public.invite_codes
  FOR SELECT
  USING (true);

-- 4. Create RPC to lookup user UUID by email (for target email direct linking fallback)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT id FROM auth.users WHERE LOWER(email) = LOWER(p_email) LIMIT 1);
END;
$$;

