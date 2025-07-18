-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create or replace the function for finding listings within a radius
CREATE OR REPLACE FUNCTION public.listings_within_radius(
  lat double precision,
  lng double precision,
  radius_meters double precision
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  category_id uuid,
  owner_id uuid,
  price_per_day numeric,
  price_per_week numeric,
  price_per_month numeric,
  deposit_amount numeric,
  address text,
  location geography,
  photos jsonb,
  tags text[],
  condition text,
  availability jsonb,
  status text,
  featured boolean,
  created_at timestamptz,
  updated_at timestamptz,
  distance double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.title,
    l.description,
    l.category_id,
    l.owner_id,
    l.price_per_day,
    l.price_per_week,
    l.price_per_month,
    l.deposit_amount,
    l.address,
    l.location,
    l.photos,
    l.tags,
    l.condition,
    l.availability,
    l.status,
    l.featured,
    l.created_at,
    l.updated_at,
    ST_Distance(
      l.location::geography,
      ST_Point(lng, lat)::geography
    ) as distance
  FROM listings l
  WHERE 
    l.status = 'active'
    AND l.location IS NOT NULL
    AND ST_DWithin(
      l.location::geography,
      ST_Point(lng, lat)::geography,
      radius_meters
    )
  ORDER BY distance ASC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.listings_within_radius TO authenticated;

-- Create spatial index on listings location column if not exists
CREATE INDEX IF NOT EXISTS idx_listings_location ON listings USING GIST (location);

-- Update existing listings to have proper geography data if they have lat/lng but no location
UPDATE listings
SET location = ST_Point(
  (address::jsonb->>'lng')::float,
  (address::jsonb->>'lat')::float
)::geography
WHERE location IS NULL
  AND address::jsonb->>'lat' IS NOT NULL
  AND address::jsonb->>'lng' IS NOT NULL;