-- Migration: Add latitude and longitude columns to public.markers table
-- Run this script in your Supabase SQL Editor to apply the changes.

-- 1. Add columns to the table
ALTER TABLE public.markers
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 2. Backfill existing records with coordinates extracted from the PostGIS geography location
UPDATE public.markers
SET 
  latitude = ST_Y(location::geometry),
  longitude = ST_X(location::geometry)
WHERE latitude IS NULL OR longitude IS NULL;

-- 3. Create or replace a function to keep geography location in sync with latitude/longitude
CREATE OR REPLACE FUNCTION public.sync_marker_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to run before insert/update
DROP TRIGGER IF EXISTS trg_sync_marker_location ON public.markers;
CREATE TRIGGER trg_sync_marker_location
BEFORE INSERT OR UPDATE ON public.markers
FOR EACH ROW
EXECUTE FUNCTION public.sync_marker_location();
