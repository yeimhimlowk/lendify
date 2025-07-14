-- Add function to extract coordinates from PostGIS GEOGRAPHY(POINT) data
-- This function is used by the frontend to get latitude/longitude for map display

CREATE OR REPLACE FUNCTION extract_coordinates(location_point GEOGRAPHY)
RETURNS TABLE(lat DOUBLE PRECISION, lng DOUBLE PRECISION)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        ST_Y(location_point::geometry) as lat,
        ST_X(location_point::geometry) as lng;
$$;

-- Also create a more comprehensive function for getting listing with coordinates
-- This can be used for more efficient single queries
CREATE OR REPLACE FUNCTION get_listing_with_coordinates(listing_id UUID)
RETURNS TABLE(
    id UUID,
    owner_id UUID,
    title TEXT,
    description TEXT,
    category_id UUID,
    price_per_day DECIMAL(10, 2),
    price_per_week DECIMAL(10, 2),
    price_per_month DECIMAL(10, 2),
    deposit_amount DECIMAL(10, 2),
    condition TEXT,
    address TEXT,
    photos TEXT[],
    tags TEXT[],
    availability JSONB,
    status TEXT,
    ai_generated_title TEXT,
    ai_generated_description TEXT,
    ai_price_suggestion DECIMAL(10, 2),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    category JSONB,
    owner JSONB
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        l.id,
        l.owner_id,
        l.title,
        l.description,
        l.category_id,
        l.price_per_day,
        l.price_per_week,
        l.price_per_month,
        l.deposit_amount,
        l.condition,
        l.address,
        l.photos,
        l.tags,
        l.availability,
        l.status,
        l.ai_generated_title,
        l.ai_generated_description,
        l.ai_price_suggestion,
        l.created_at,
        l.updated_at,
        ST_Y(l.location::geometry) as latitude,
        ST_X(l.location::geometry) as longitude,
        row_to_json(c.*) as category,
        row_to_json((
            SELECT row_to_json(owner_data)
            FROM (
                SELECT p.id, p.full_name, p.avatar_url, p.rating, p.verified
                FROM profiles p
                WHERE p.id = l.owner_id
            ) owner_data
        )) as owner
    FROM listings l
    LEFT JOIN categories c ON l.category_id = c.id
    WHERE l.id = listing_id
    AND l.status = 'active';
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION extract_coordinates(GEOGRAPHY) TO authenticated;
GRANT EXECUTE ON FUNCTION get_listing_with_coordinates(UUID) TO authenticated;