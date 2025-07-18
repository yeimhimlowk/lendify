-- Enhance rental_agreements table with comprehensive contract fields
ALTER TABLE rental_agreements ADD COLUMN IF NOT EXISTS delivery_method TEXT;
ALTER TABLE rental_agreements ADD COLUMN IF NOT EXISTS item_condition TEXT;
ALTER TABLE rental_agreements ADD COLUMN IF NOT EXISTS item_photos JSONB DEFAULT '[]'::JSONB;
ALTER TABLE rental_agreements ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE rental_agreements ADD COLUMN IF NOT EXISTS late_fee_per_day DECIMAL(10,2) DEFAULT 0;
ALTER TABLE rental_agreements ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;
ALTER TABLE rental_agreements ADD COLUMN IF NOT EXISTS damage_policy TEXT;
ALTER TABLE rental_agreements ADD COLUMN IF NOT EXISTS liability_terms TEXT;
ALTER TABLE rental_agreements ADD COLUMN IF NOT EXISTS platform_terms TEXT;
ALTER TABLE rental_agreements ADD COLUMN IF NOT EXISTS agreed_at TIMESTAMPTZ;
ALTER TABLE rental_agreements ADD COLUMN IF NOT EXISTS agreed_by_renter BOOLEAN DEFAULT FALSE;
ALTER TABLE rental_agreements ADD COLUMN IF NOT EXISTS agreed_by_owner BOOLEAN DEFAULT FALSE;
ALTER TABLE rental_agreements ADD COLUMN IF NOT EXISTS renter_contact_info JSONB;
ALTER TABLE rental_agreements ADD COLUMN IF NOT EXISTS owner_contact_info JSONB;

-- Add default platform policies (can be customized per agreement)
ALTER TABLE rental_agreements ALTER COLUMN cancellation_policy SET DEFAULT 'Full refund if cancelled within 24 hours of booking. 50% refund if cancelled more than 24 hours but less than 48 hours before rental start. No refund for cancellations within 48 hours of rental start.';

ALTER TABLE rental_agreements ALTER COLUMN damage_policy SET DEFAULT 'Renter is responsible for any damage beyond normal wear and tear. Damage assessment will be based on repair/replacement costs. Security deposit will be used first for any damages.';

ALTER TABLE rental_agreements ALTER COLUMN liability_terms SET DEFAULT 'Lendify serves as a platform connecting renters and owners. Lendify is not liable for lost, stolen, or damaged items. All disputes should be resolved through the platform''s dispute resolution process. Users participate at their own risk.';

ALTER TABLE rental_agreements ALTER COLUMN platform_terms SET DEFAULT 'This agreement is facilitated through Lendify. Both parties agree to abide by Lendify''s Terms of Service and Community Guidelines. Disputes will be handled through Lendify''s resolution process.';

-- Create a comprehensive view for rental agreements with all related data
CREATE OR REPLACE VIEW rental_agreements_detailed AS
SELECT 
    ra.*,
    b.start_date,
    b.end_date,
    b.total_price,
    b.status as booking_status,
    l.title as listing_title,
    l.description as listing_description,
    l.price_per_day,
    l.address as listing_address,
    l.photos as listing_photos,
    l.condition as listing_condition,
    l.deposit_amount as listing_deposit,
    c.name as category_name,
    renter.id as renter_id,
    renter.full_name as renter_name,
    renter.email as renter_email,
    renter.phone as renter_phone,
    owner.id as owner_id,
    owner.full_name as owner_name,
    owner.email as owner_email,
    owner.phone as owner_phone
FROM rental_agreements ra
JOIN bookings b ON ra.booking_id = b.id
JOIN listings l ON b.listing_id = l.id
LEFT JOIN categories c ON l.category_id = c.id
JOIN profiles renter ON b.renter_id = renter.id
JOIN profiles owner ON b.owner_id = owner.id;

-- Grant appropriate permissions on the view
GRANT SELECT ON rental_agreements_detailed TO authenticated;

-- Create function to generate comprehensive agreement text
CREATE OR REPLACE FUNCTION generate_comprehensive_agreement_text(
    p_booking_id UUID
) RETURNS TEXT AS $$
DECLARE
    v_agreement_text TEXT;
    v_booking RECORD;
BEGIN
    -- Fetch all necessary data
    SELECT 
        b.*,
        l.title,
        l.description,
        l.price_per_day,
        l.address,
        l.condition,
        l.deposit_amount,
        c.name as category_name,
        renter.full_name as renter_name,
        renter.email as renter_email,
        owner.full_name as owner_name,
        owner.email as owner_email
    INTO v_booking
    FROM bookings b
    JOIN listings l ON b.listing_id = l.id
    LEFT JOIN categories c ON l.category_id = c.id
    JOIN profiles renter ON b.renter_id = renter.id
    JOIN profiles owner ON b.owner_id = owner.id
    WHERE b.id = p_booking_id;
    
    -- Generate comprehensive agreement text
    v_agreement_text := format(E'RENTAL AGREEMENT

This Rental Agreement ("Agreement") is entered into on %s between:

OWNER (Lessor): %s
Email: %s

RENTER (Lessee): %s  
Email: %s

1. RENTAL ITEM DETAILS
Item: %s
Category: %s
Condition: %s
Description: %s
Location: %s

2. RENTAL TERMS
Rental Period: %s to %s
Daily Rate: $%s
Total Rental Price: $%s
Security Deposit: $%s

3. DELIVERY METHOD
The item will be delivered/picked up as agreed between the parties.

4. RENTER RESPONSIBILITIES
- The Renter agrees to use the item only for its intended purpose
- The Renter will return the item in the same condition as received, excluding normal wear and tear
- The Renter is responsible for any damage, loss, or theft during the rental period
- The Renter will notify the Owner immediately of any damage or issues

5. OWNER RESPONSIBILITIES  
- The Owner confirms the item is functional and as described
- The Owner will provide the item in clean, working condition
- The Owner will be available for questions or support during the rental period

6. CANCELLATION POLICY
- Full refund if cancelled within 24 hours of booking
- 50%% refund if cancelled 24-48 hours before rental start
- No refund for cancellations within 48 hours of rental start

7. LATE RETURNS
- Late returns incur a fee of 10%% of the daily rate per day
- After 3 days late, the Renter may be reported to the platform

8. DAMAGES AND LIABILITY
- The Renter is liable for any damage beyond normal wear and tear
- Damage costs will be deducted from the security deposit first
- If damages exceed the deposit, the Renter agrees to pay the difference
- Lendify is not liable for any disputes, damages, or losses

9. DISPUTE RESOLUTION
All disputes will be resolved through Lendify''s dispute resolution process.

10. GOVERNING LAW
This Agreement is governed by local applicable laws.

By agreeing to this rental agreement, both parties acknowledge they have read, understood, and agree to all terms and conditions outlined above.',
        CURRENT_DATE,
        v_booking.owner_name,
        v_booking.owner_email,
        v_booking.renter_name,
        v_booking.renter_email,
        v_booking.title,
        COALESCE(v_booking.category_name, 'General'),
        COALESCE(v_booking.condition, 'Good'),
        COALESCE(v_booking.description, 'No description provided'),
        COALESCE(v_booking.address, 'To be confirmed'),
        v_booking.start_date,
        v_booking.end_date,
        v_booking.price_per_day,
        v_booking.total_price,
        COALESCE(v_booking.deposit_amount, 0)
    );
    
    RETURN v_agreement_text;
END;
$$ LANGUAGE plpgsql;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_rental_agreements_agreed_status 
ON rental_agreements(agreed_by_renter, agreed_by_owner, status);

-- Update RLS policies to include new fields
-- No changes needed to existing policies as they already cover all columns