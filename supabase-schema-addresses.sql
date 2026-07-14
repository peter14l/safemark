-- Migration: Add address columns to location_feed and breadcrumbs
-- Run this in your Supabase SQL Editor

-- Add address column to location_feed (human-readable reverse-geocoded address)
ALTER TABLE public.location_feed
  ADD COLUMN IF NOT EXISTS address TEXT;

-- Add address column to breadcrumbs
ALTER TABLE public.breadcrumbs
  ADD COLUMN IF NOT EXISTS address TEXT;
