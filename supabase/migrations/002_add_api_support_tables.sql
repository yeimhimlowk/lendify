-- Add support tables for API functionality

-- AI usage logging table
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    content_type TEXT,
    metadata JSONB,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Search analytics table
CREATE TABLE IF NOT EXISTS search_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    query TEXT NOT NULL,
    results_count INTEGER DEFAULT 0,
    filters JSONB,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_action ON ai_usage_logs(action);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics USING gin(to_tsvector('english', query));
CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON search_analytics(created_at);

-- Add PostGIS functions for geographic search
CREATE OR REPLACE FUNCTION listings_within_radius(
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION
)
RETURNS TABLE(
    id UUID,
    title TEXT,
    description TEXT,
    price_per_day DECIMAL,
    price_per_week DECIMAL,
    price_per_month DECIMAL,
    deposit_amount DECIMAL,
    condition TEXT,
    address TEXT,
    photos TEXT[],
    tags TEXT[],
    availability JSONB,
    status TEXT,
    category_id UUID,
    owner_id UUID,
    ai_generated_title TEXT,
    ai_generated_description TEXT,
    ai_price_suggestion DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    location GEOMETRY
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        l.id,
        l.title,
        l.description,
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
        l.category_id,
        l.owner_id,
        l.ai_generated_title,
        l.ai_generated_description,
        l.ai_price_suggestion,
        l.created_at,
        l.updated_at,
        l.location
    FROM listings l
    WHERE l.location IS NOT NULL
    AND ST_DWithin(
        l.location::geography,
        ST_Point(lng, lat)::geography,
        radius_meters
    )
    ORDER BY ST_Distance(
        l.location::geography,
        ST_Point(lng, lat)::geography
    );
$$;

-- Function to increment listing views (for analytics)
CREATE OR REPLACE FUNCTION increment_listing_views(listing_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO listing_analytics (listing_id, date, views)
    VALUES (listing_id, CURRENT_DATE, 1)
    ON CONFLICT (listing_id, date)
    DO UPDATE SET views = listing_analytics.views + 1;
END;
$$;

-- Add RLS policies for new tables
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

-- AI usage logs: users can only see their own logs
CREATE POLICY "Users can view their own AI usage logs" ON ai_usage_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI usage logs" ON ai_usage_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Search analytics: public read for aggregated data, insert for tracking
CREATE POLICY "Public read access to search analytics" ON search_analytics
    FOR SELECT USING (true);

CREATE POLICY "Insert search analytics" ON search_analytics
    FOR INSERT WITH CHECK (true);

-- Update existing tables with missing indexes for better API performance
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_category_id ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_owner_id ON listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_listings_price_per_day ON listings(price_per_day);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at);
CREATE INDEX IF NOT EXISTS idx_listings_updated_at ON listings(updated_at);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_listings_status_category ON listings(status, category_id);
CREATE INDEX IF NOT EXISTS idx_listings_status_price ON listings(status, price_per_day);

-- Text search index for listings
CREATE INDEX IF NOT EXISTS idx_listings_search ON listings USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_listing_id ON bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_bookings_renter_id ON bookings(renter_id);
CREATE INDEX IF NOT EXISTS idx_bookings_owner_id ON bookings(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_date, end_date);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_booking_id ON messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON profiles(rating);
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON profiles(verified);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- Add some useful views for API responses
CREATE OR REPLACE VIEW listing_stats AS
SELECT 
    l.id as listing_id,
    COUNT(DISTINCT b.id) as total_bookings,
    COUNT(DISTINCT CASE WHEN b.status IN ('confirmed', 'active', 'completed') THEN b.id END) as successful_bookings,
    AVG(CASE WHEN r.rating IS NOT NULL THEN r.rating END) as avg_rating,
    COUNT(DISTINCT r.id) as review_count,
    SUM(CASE WHEN la.date >= CURRENT_DATE - INTERVAL '30 days' THEN COALESCE(la.views, 0) ELSE 0 END) as views_last_30_days,
    SUM(CASE WHEN la.date >= CURRENT_DATE - INTERVAL '30 days' THEN COALESCE(la.clicks, 0) ELSE 0 END) as clicks_last_30_days
FROM listings l
LEFT JOIN bookings b ON l.id = b.listing_id
LEFT JOIN reviews r ON b.id = r.booking_id AND r.reviewee_id = l.owner_id
LEFT JOIN listing_analytics la ON l.id = la.listing_id
GROUP BY l.id;

-- Grant necessary permissions
GRANT SELECT ON listing_stats TO authenticated;
GRANT SELECT ON listing_stats TO anon;