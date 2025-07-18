-- Update existing sample listings with Singapore locations
UPDATE listings
SET 
  address = CASE id
    WHEN 'f47ac10b-58cc-4372-a567-0e02b2c3d479' THEN 'Orchard Road, Singapore'
    WHEN '550e8400-e29b-41d4-a716-446655440001' THEN 'Marina Bay, Singapore'
    WHEN '550e8400-e29b-41d4-a716-446655440002' THEN 'Sentosa Island, Singapore'
    WHEN '550e8400-e29b-41d4-a716-446655440003' THEN 'Jurong East, Singapore'
    WHEN '550e8400-e29b-41d4-a716-446655440004' THEN 'Punggol, Singapore'
    WHEN '550e8400-e29b-41d4-a716-446655440005' THEN 'Bukit Timah, Singapore'
    WHEN '550e8400-e29b-41d4-a716-446655440006' THEN 'Pasir Ris, Singapore'
    WHEN '550e8400-e29b-41d4-a716-446655440007' THEN 'Clementi, Singapore'
    WHEN '550e8400-e29b-41d4-a716-446655440008' THEN 'Bishan, Singapore'
    WHEN '550e8400-e29b-41d4-a716-446655440009' THEN 'Tampines, Singapore'
    ELSE address
  END,
  location = CASE id
    WHEN 'f47ac10b-58cc-4372-a567-0e02b2c3d479' THEN ST_Point(103.8311, 1.3048)::geography  -- Orchard
    WHEN '550e8400-e29b-41d4-a716-446655440001' THEN ST_Point(103.8521, 1.2789)::geography  -- Marina Bay
    WHEN '550e8400-e29b-41d4-a716-446655440002' THEN ST_Point(103.8307, 1.2494)::geography  -- Sentosa
    WHEN '550e8400-e29b-41d4-a716-446655440003' THEN ST_Point(103.7424, 1.3329)::geography  -- Jurong East
    WHEN '550e8400-e29b-41d4-a716-446655440004' THEN ST_Point(103.9098, 1.4043)::geography  -- Punggol
    WHEN '550e8400-e29b-41d4-a716-446655440005' THEN ST_Point(103.7836, 1.3294)::geography  -- Bukit Timah
    WHEN '550e8400-e29b-41d4-a716-446655440006' THEN ST_Point(103.9530, 1.3721)::geography  -- Pasir Ris
    WHEN '550e8400-e29b-41d4-a716-446655440007' THEN ST_Point(103.7649, 1.3162)::geography  -- Clementi
    WHEN '550e8400-e29b-41d4-a716-446655440008' THEN ST_Point(103.8484, 1.3520)::geography  -- Bishan
    WHEN '550e8400-e29b-41d4-a716-446655440009' THEN ST_Point(103.9568, 1.3496)::geography  -- Tampines
    ELSE location
  END
WHERE id IN (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005',
  '550e8400-e29b-41d4-a716-446655440006',
  '550e8400-e29b-41d4-a716-446655440007',
  '550e8400-e29b-41d4-a716-446655440008',
  '550e8400-e29b-41d4-a716-446655440009'
);

-- Add more Singapore sample listings if needed
INSERT INTO listings (
  id,
  title,
  description,
  category_id,
  owner_id,
  price_per_day,
  price_per_week,
  price_per_month,
  deposit_amount,
  condition,
  address,
  location,
  photos,
  tags,
  status,
  featured,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  'DJI Mavic 3 Pro Drone',
  'Professional drone with Hasselblad camera, perfect for aerial photography and videography. Includes extra batteries and carrying case.',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  (SELECT id FROM profiles LIMIT 1),
  120.00,
  700.00,
  2500.00,
  800.00,
  'like_new',
  'Bugis, Singapore',
  ST_Point(103.8554, 1.3010)::geography,
  '["https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=800", "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=800"]'::jsonb,
  ARRAY['drone', 'dji', 'aerial', 'photography', 'videography'],
  'active',
  true,
  NOW() - INTERVAL '3 days',
  NOW()
),
(
  gen_random_uuid(),
  'Nikon Z9 Professional Camera Kit',
  'Full frame mirrorless camera with 45.7MP sensor. Includes 24-70mm f/2.8 lens, extra batteries, and memory cards.',
  'b2c3d4e5-f678-90ab-cdef-123456789012',
  (SELECT id FROM profiles LIMIT 1),
  150.00,
  900.00,
  3200.00,
  1000.00,
  'excellent',
  'Holland Village, Singapore',
  ST_Point(103.7963, 1.3108)::geography,
  '["https://images.unsplash.com/photo-1606986628025-35d57e735ae0?w=800", "https://images.unsplash.com/photo-1617638924601-92d272023e21?w=800"]'::jsonb,
  ARRAY['camera', 'nikon', 'professional', 'photography', 'mirrorless'],
  'active',
  false,
  NOW() - INTERVAL '7 days',
  NOW()
),
(
  gen_random_uuid(),
  'Camping Tent - 6 Person Family Size',
  'Spacious family tent with two rooms, waterproof and easy to set up. Perfect for weekend camping trips.',
  'c3d4e5f6-7890-abcd-ef12-345678901234',
  (SELECT id FROM profiles LIMIT 1),
  45.00,
  250.00,
  800.00,
  100.00,
  'good',
  'East Coast Park, Singapore',
  ST_Point(103.9127, 1.3008)::geography,
  '["https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800", "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=800"]'::jsonb,
  ARRAY['camping', 'tent', 'outdoor', 'family', 'adventure'],
  'active',
  false,
  NOW() - INTERVAL '10 days',
  NOW()
);

-- Update any remaining listings without Singapore locations
UPDATE listings
SET 
  address = 'Singapore',
  location = ST_Point(103.8198, 1.3521)::geography
WHERE location IS NULL OR address IS NULL OR address NOT LIKE '%Singapore%';