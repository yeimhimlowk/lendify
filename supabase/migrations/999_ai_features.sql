-- Create AI usage logs table
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    assistant_type TEXT,
    content_type TEXT,
    message_length INTEGER,
    response_length INTEGER,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_action ON ai_usage_logs(action);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_success ON ai_usage_logs(success);

-- Create AI analysis cache table
CREATE TABLE IF NOT EXISTS ai_analysis_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    claude_content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique cache per listing
    UNIQUE(listing_id)
);

-- Create indexes for the cache table
CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_listing_id ON ai_analysis_cache(listing_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_cache_created_at ON ai_analysis_cache(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_cache ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_usage_logs
CREATE POLICY "Users can view their own AI usage logs"
    ON ai_usage_logs FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI usage logs"
    ON ai_usage_logs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for ai_analysis_cache
CREATE POLICY "Users can view cache for their listings"
    ON ai_analysis_cache FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM listings 
            WHERE listings.id = ai_analysis_cache.listing_id 
            AND listings.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert cache for their listings"
    ON ai_analysis_cache FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM listings 
            WHERE listings.id = ai_analysis_cache.listing_id 
            AND listings.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update cache for their listings"
    ON ai_analysis_cache FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM listings 
            WHERE listings.id = ai_analysis_cache.listing_id 
            AND listings.user_id = auth.uid()
        )
    );

-- Add comments for documentation
COMMENT ON TABLE ai_usage_logs IS 'Tracks AI assistant usage for analytics and monitoring';
COMMENT ON COLUMN ai_usage_logs.action IS 'Type of AI action performed (ai_assistant, generate_content, analyze_photos)';
COMMENT ON COLUMN ai_usage_logs.assistant_type IS 'Type of assistant used (general, listing, support)';
COMMENT ON COLUMN ai_usage_logs.content_type IS 'Type of content generated (title, description, tags)';
COMMENT ON COLUMN ai_usage_logs.message_length IS 'Length of user message in characters';
COMMENT ON COLUMN ai_usage_logs.response_length IS 'Length of AI response in characters';

COMMENT ON TABLE ai_analysis_cache IS 'Cache for AI photo analysis results to avoid redundant API calls';
COMMENT ON COLUMN ai_analysis_cache.claude_content IS 'JSON blob containing AI analysis results';