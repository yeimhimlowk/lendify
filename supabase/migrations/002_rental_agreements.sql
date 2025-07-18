-- Create rental_agreements table
CREATE TABLE IF NOT EXISTS rental_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  agreement_text TEXT NOT NULL,
  custom_terms TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'expired', 'cancelled')),
  created_by UUID NOT NULL REFERENCES profiles(id),
  signed_by_renter BOOLEAN DEFAULT FALSE,
  signed_by_owner BOOLEAN DEFAULT FALSE,
  renter_signature_data JSONB,
  owner_signature_data JSONB,
  renter_signed_at TIMESTAMPTZ,
  owner_signed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_rental_agreements_booking_id ON rental_agreements(booking_id);
CREATE INDEX idx_rental_agreements_status ON rental_agreements(status);
CREATE INDEX idx_rental_agreements_created_by ON rental_agreements(created_by);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rental_agreements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER rental_agreements_updated_at
    BEFORE UPDATE ON rental_agreements
    FOR EACH ROW
    EXECUTE FUNCTION update_rental_agreements_updated_at();

-- RLS Policies
ALTER TABLE rental_agreements ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view agreements for their bookings (as owner or renter)
CREATE POLICY "Users can view their rental agreements" ON rental_agreements
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM bookings
            WHERE bookings.id = rental_agreements.booking_id
            AND (bookings.owner_id = auth.uid() OR bookings.renter_id = auth.uid())
        )
    );

-- Policy: Users can create agreements for bookings they own
CREATE POLICY "Owners can create rental agreements" ON rental_agreements
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM bookings
            WHERE bookings.id = rental_agreements.booking_id
            AND bookings.owner_id = auth.uid()
        )
        AND created_by = auth.uid()
    );

-- Policy: Users can update agreements for their bookings
CREATE POLICY "Users can update their rental agreements" ON rental_agreements
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM bookings
            WHERE bookings.id = rental_agreements.booking_id
            AND (bookings.owner_id = auth.uid() OR bookings.renter_id = auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM bookings
            WHERE bookings.id = rental_agreements.booking_id
            AND (bookings.owner_id = auth.uid() OR bookings.renter_id = auth.uid())
        )
    );

-- Policy: Owners can delete draft agreements
CREATE POLICY "Owners can delete draft rental agreements" ON rental_agreements
    FOR DELETE
    USING (
        status = 'draft'
        AND EXISTS (
            SELECT 1 FROM bookings
            WHERE bookings.id = rental_agreements.booking_id
            AND bookings.owner_id = auth.uid()
        )
    );