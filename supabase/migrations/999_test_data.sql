-- ========================================
-- TEST DATA INSERTION SCRIPT
-- ========================================
-- This file contains test data for development/testing purposes
-- Run this after your main schema to populate with sample data
-- To remove all test data, run the cleanup script: 999_test_data_cleanup.sql

-- Mark beginning of test data section
-- TEST_DATA_START

-- 1. Insert test user profiles
-- Note: These are test UUIDs - in real app, these would come from auth.users
INSERT INTO profiles (id, email, full_name, avatar_url, phone, address, rating, verified, created_at) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'john.doe@test.com', 'John Doe', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', '+1-555-0001', '123 Main St, San Francisco, CA', 4.8, true, NOW() - INTERVAL '6 months'),
  ('22222222-2222-2222-2222-222222222222', 'jane.smith@test.com', 'Jane Smith', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', '+1-555-0002', '456 Oak Ave, Los Angeles, CA', 4.9, true, NOW() - INTERVAL '5 months'),
  ('33333333-3333-3333-3333-333333333333', 'mike.johnson@test.com', 'Mike Johnson', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', '+1-555-0003', '789 Pine Rd, Seattle, WA', 4.2, true, NOW() - INTERVAL '4 months'),
  ('44444444-4444-4444-4444-444444444444', 'sarah.wilson@test.com', 'Sarah Wilson', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', '+1-555-0004', '321 Elm St, Austin, TX', 4.7, false, NOW() - INTERVAL '3 months'),
  ('55555555-5555-5555-5555-555555555555', 'alex.brown@test.com', 'Alex Brown', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', '+1-555-0005', '654 Maple Dr, Denver, CO', 4.5, true, NOW() - INTERVAL '2 months'),
  ('66666666-6666-6666-6666-666666666666', 'lisa.garcia@test.com', 'Lisa Garcia', 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150', '+1-555-0006', '987 Cedar Ln, Miami, FL', 4.6, true, NOW() - INTERVAL '1 month');

-- 2. Update profiles with realistic geographic coordinates
UPDATE profiles SET location = ST_Point(-122.4194, 37.7749) WHERE id = '11111111-1111-1111-1111-111111111111'; -- San Francisco
UPDATE profiles SET location = ST_Point(-118.2437, 34.0522) WHERE id = '22222222-2222-2222-2222-222222222222'; -- Los Angeles  
UPDATE profiles SET location = ST_Point(-122.3321, 47.6062) WHERE id = '33333333-3333-3333-3333-333333333333'; -- Seattle
UPDATE profiles SET location = ST_Point(-97.7431, 30.2672) WHERE id = '44444444-4444-4444-4444-444444444444'; -- Austin
UPDATE profiles SET location = ST_Point(-104.9903, 39.7392) WHERE id = '55555555-5555-5555-5555-555555555555'; -- Denver
UPDATE profiles SET location = ST_Point(-80.1918, 25.7617) WHERE id = '66666666-6666-6666-6666-666666666666'; -- Miami

-- 3. Insert test listings
INSERT INTO listings (id, owner_id, title, description, category_id, price_per_day, price_per_week, price_per_month, address, photos, condition, deposit_amount, tags, status, created_at) VALUES 
  -- Electronics
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'MacBook Pro 16" M2 Max', 'Latest MacBook Pro with M2 Max chip, perfect for video editing and development work. Includes charger and protective case.', (SELECT id FROM categories WHERE slug = 'electronics'), 45.00, 270.00, 900.00, '123 Main St, San Francisco, CA', ARRAY['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800', 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800'], 'like_new', 200.00, ARRAY['laptop', 'apple', 'work', 'development'], 'active', NOW() - INTERVAL '20 days'),
  
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Sony A7IV Camera Kit', 'Professional mirrorless camera with 24-70mm lens, perfect for photography and videography. Includes extra batteries and memory cards.', (SELECT id FROM categories WHERE slug = 'cameras-photography'), 75.00, 450.00, 1800.00, '456 Oak Ave, Los Angeles, CA', ARRAY['https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800', 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800'], 'good', 500.00, ARRAY['camera', 'sony', 'photography', 'professional'], 'active', NOW() - INTERVAL '15 days'),
  
  -- Tools & Equipment  
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'DeWalt Drill Set Complete', 'Professional cordless drill set with multiple bits, two batteries, and carrying case. Perfect for home improvement projects.', (SELECT id FROM categories WHERE slug = 'tools-equipment'), 25.00, 150.00, 500.00, '789 Pine Rd, Seattle, WA', ARRAY['https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800', 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800'], 'good', 100.00, ARRAY['drill', 'tools', 'dewalt', 'construction'], 'active', NOW() - INTERVAL '10 days'),
  
  -- Sports & Outdoors
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444', 'Trek Mountain Bike', 'High-performance mountain bike perfect for trails and city riding. Recently serviced with new tires and brakes.', (SELECT id FROM categories WHERE slug = 'sports-outdoors'), 35.00, 210.00, 700.00, '321 Elm St, Austin, TX', ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800'], 'good', 150.00, ARRAY['bike', 'mountain', 'trek', 'outdoor'], 'active', NOW() - INTERVAL '5 days'),
  
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '55555555-5555-5555-5555-555555555555', 'Camping Gear Complete Set', 'Everything you need for camping: 4-person tent, sleeping bags, camping stove, chairs, and cooler.', (SELECT id FROM categories WHERE slug = 'sports-outdoors'), 40.00, 240.00, 800.00, '654 Maple Dr, Denver, CO', ARRAY['https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800', 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=800'], 'good', 200.00, ARRAY['camping', 'tent', 'outdoor', 'adventure'], 'active', NOW() - INTERVAL '8 days'),
  
  -- Party & Events
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '66666666-6666-6666-6666-666666666666', 'Professional DJ Equipment', 'Complete DJ setup with turntables, mixer, speakers, and lighting. Perfect for parties and events.', (SELECT id FROM categories WHERE slug = 'party-events'), 120.00, 720.00, 2400.00, '987 Cedar Ln, Miami, FL', ARRAY['https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800', 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=800'], 'good', 800.00, ARRAY['dj', 'music', 'party', 'event'], 'active', NOW() - INTERVAL '12 days'),
  
  -- Vehicles
  ('gggggggg-gggg-gggg-gggg-gggggggggggg', '11111111-1111-1111-1111-111111111111', '2023 Tesla Model 3', 'Clean electric vehicle perfect for city trips and long drives. Autopilot enabled, supercharger access included.', (SELECT id FROM categories WHERE slug = 'vehicles'), 80.00, 480.00, 1600.00, '123 Main St, San Francisco, CA', ARRAY['https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800', 'https://images.unsplash.com/photo-1571607388263-1044f9ea01dd?w=800'], 'like_new', 1000.00, ARRAY['tesla', 'electric', 'car', 'autopilot'], 'active', NOW() - INTERVAL '3 days'),
  
  -- Home & Garden
  ('hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', '22222222-2222-2222-2222-222222222222', 'Pressure Washer Heavy Duty', 'High-pressure washer perfect for cleaning driveways, decks, and exterior surfaces. Includes multiple nozzles.', (SELECT id FROM categories WHERE slug = 'home-garden'), 30.00, 180.00, 600.00, '456 Oak Ave, Los Angeles, CA', ARRAY['https://images.unsplash.com/photo-1558452091-d1158dae0e81?w=800'], 'good', 100.00, ARRAY['pressure-washer', 'cleaning', 'home', 'garden'], 'active', NOW() - INTERVAL '6 days');

-- Update listings with realistic geographic coordinates
UPDATE listings SET location = ST_Point(-122.4194, 37.7749) WHERE owner_id = '11111111-1111-1111-1111-111111111111'; -- San Francisco
UPDATE listings SET location = ST_Point(-118.2437, 34.0522) WHERE owner_id = '22222222-2222-2222-2222-222222222222'; -- Los Angeles  
UPDATE listings SET location = ST_Point(-122.3321, 47.6062) WHERE owner_id = '33333333-3333-3333-3333-333333333333'; -- Seattle
UPDATE listings SET location = ST_Point(-97.7431, 30.2672) WHERE owner_id = '44444444-4444-4444-4444-444444444444'; -- Austin
UPDATE listings SET location = ST_Point(-104.9903, 39.7392) WHERE owner_id = '55555555-5555-5555-5555-555555555555'; -- Denver
UPDATE listings SET location = ST_Point(-80.1918, 25.7617) WHERE owner_id = '66666666-6666-6666-6666-666666666666'; -- Miami

-- 4. Insert test bookings with various statuses
INSERT INTO bookings (id, listing_id, renter_id, owner_id, start_date, end_date, total_price, status, created_at, updated_at) VALUES 
  -- Completed bookings (for testing reviews)
  ('book1111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '2024-01-15', '2024-01-22', 315.00, 'completed', NOW() - INTERVAL '30 days', NOW() - INTERVAL '23 days'),
  ('book2222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '2024-02-01', '2024-02-05', 300.00, 'completed', NOW() - INTERVAL '25 days', NOW() - INTERVAL '20 days'),
  ('book3333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', '2024-02-10', '2024-02-12', 50.00, 'completed', NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days'),
  
  -- Confirmed bookings (upcoming)
  ('book4444-4444-4444-4444-444444444444', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '8 days', 105.00, 'confirmed', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  ('book5555-5555-5555-5555-555555555555', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555', CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '15 days', 200.00, 'confirmed', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  
  -- Pending bookings (awaiting approval)
  ('book6666-6666-6666-6666-666666666666', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', CURRENT_DATE + INTERVAL '20 days', CURRENT_DATE + INTERVAL '22 days', 240.00, 'pending', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
  ('book7777-7777-7777-7777-777777777777', 'gggggggg-gggg-gggg-gggg-gggggggggggg', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', CURRENT_DATE + INTERVAL '25 days', CURRENT_DATE + INTERVAL '30 days', 400.00, 'pending', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'),
  
  -- Cancelled booking
  ('book8888-8888-8888-8888-888888888888', 'hhhhhhhh-hhhh-hhhh-hhhh-hhhhhhhhhhhh', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '2024-02-20', '2024-02-25', 150.00, 'cancelled', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days');

-- 5. Insert test messages
INSERT INTO messages (id, sender_id, recipient_id, booking_id, content, created_at) VALUES 
  -- Messages about MacBook rental
  ('msg11111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'book1111-1111-1111-1111-111111111111', 'Hi! I''m interested in renting your MacBook Pro. Is it still available for the dates I selected?', NOW() - INTERVAL '32 days'),
  ('msg11112-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'book1111-1111-1111-1111-111111111111', 'Yes, it''s available! The MacBook is in excellent condition. It comes with the original charger and a protective case.', NOW() - INTERVAL '32 days'),
  ('msg11113-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'book1111-1111-1111-1111-111111111111', 'Perfect! What''s the pickup/dropoff process?', NOW() - INTERVAL '31 days'),
  ('msg11114-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'book1111-1111-1111-1111-111111111111', 'I can meet you at a convenient location in SF, or you can pick it up from my place. Just let me know what works better for you!', NOW() - INTERVAL '31 days'),
  
  -- Messages about camera rental  
  ('msg22221-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'book2222-2222-2222-2222-222222222222', 'Hello! I need a camera for a weekend photography workshop. Does your kit include a tripod?', NOW() - INTERVAL '26 days'),
  ('msg22222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'book2222-2222-2222-2222-222222222222', 'Hi! The kit includes camera, lens, extra batteries, and memory cards. I don''t have a tripod but can recommend where to rent one.', NOW() - INTERVAL '26 days'),
  ('msg22223-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'book2222-2222-2222-2222-222222222222', 'That''s perfect, I already have a tripod. Looking forward to the rental!', NOW() - INTERVAL '25 days'),
  
  -- Messages about drill rental
  ('msg33331-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'book3333-3333-3333-3333-333333333333', 'I need this drill set for a quick home project. Are all the bits included?', NOW() - INTERVAL '21 days'),
  ('msg33332-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'book3333-3333-3333-3333-333333333333', 'Yes! Complete set with all standard bits, plus some specialty ones. Two batteries included so you won''t run out of power.', NOW() - INTERVAL '21 days'),
  
  -- Messages about upcoming bike rental
  ('msg44441-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', 'book4444-4444-4444-4444-444444444444', 'Hi Sarah! Excited about the bike rental next week. What helmet size do you have available?', NOW() - INTERVAL '4 days'),
  ('msg44442-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', 'book4444-4444-4444-4444-444444444444', 'I have Medium and Large helmets. What''s your size? Also, any specific trails you''re planning to hit?', NOW() - INTERVAL '4 days'),
  ('msg44443-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444', 'book4444-4444-4444-4444-444444444444', 'Medium works perfect! Planning to do some trails around Austin. Any recommendations?', NOW() - INTERVAL '3 days'),
  
  -- Messages about pending DJ equipment
  ('msg66661-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666666', 'book6666-6666-6666-6666-666666666666', 'Hey Lisa! I''m organizing a birthday party and your DJ setup looks perfect. Is delivery available?', NOW() - INTERVAL '1 day'),
  ('msg66662-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'book6666-6666-6666-6666-666666666666', 'Hi John! Yes, I can deliver within Miami area for an extra $50. Setup assistance is also available. What type of party?', NOW() - INTERVAL '1 day'),
  
  -- General inquiry messages (not related to specific bookings)
  ('msg99991-9999-9999-9999-999999999999', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', NULL, 'Hi! I noticed you have several tech items. Do you ever rent out tablets or iPads?', NOW() - INTERVAL '5 days'),
  ('msg99992-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', NULL, 'Hi Sarah! I don''t have any tablets listed right now, but I''m considering adding an iPad Pro soon. I''ll let you know when it''s available!', NOW() - INTERVAL '4 days');

-- 6. Insert test reviews (only for completed bookings)
INSERT INTO reviews (id, booking_id, reviewer_id, reviewee_id, rating, comment, created_at) VALUES 
  -- Review for MacBook rental (renter reviewing owner)
  ('rev11111-1111-1111-1111-111111111111', 'book1111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 5, 'Excellent rental experience! John was very responsive and the MacBook was exactly as described. Perfect condition and great for my video editing work. Highly recommend!', NOW() - INTERVAL '23 days'),
  
  -- Review for MacBook rental (owner reviewing renter)  
  ('rev11112-1111-1111-1111-111111111111', 'book1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 5, 'Jane was a fantastic renter! Very careful with the equipment, returned it in perfect condition, and great communication throughout. Would definitely rent to her again.', NOW() - INTERVAL '23 days'),
  
  -- Review for camera rental (renter reviewing owner)
  ('rev22221-2222-2222-2222-222222222222', 'book2222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 5, 'Amazing camera kit! Jane provided everything I needed for my photography workshop. The A7IV takes incredible photos and the extra batteries were a lifesaver. Professional service!', NOW() - INTERVAL '20 days'),
  
  -- Review for camera rental (owner reviewing renter)
  ('rev22222-2222-2222-2222-222222222222', 'book2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 4, 'Mike was responsible and careful with my camera equipment. Good communication and returned everything on time. Minor delay in pickup but overall great experience.', NOW() - INTERVAL '20 days'),
  
  -- Review for drill rental (renter reviewing owner)
  ('rev33331-3333-3333-3333-333333333333', 'book3333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 4, 'Good drill set that got the job done. Mike was helpful and the tools were in working condition. Would rent again for future projects.', NOW() - INTERVAL '18 days'),
  
  -- Review for drill rental (owner reviewing renter)
  ('rev33332-3333-3333-3333-333333333333', 'book3333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 5, 'Sarah was excellent! Picked up and returned on time, tools came back clean and in perfect condition. Highly recommended renter.', NOW() - INTERVAL '18 days');

-- 7. Insert some analytics data
INSERT INTO listing_analytics (listing_id, date, views, clicks, bookings, revenue) VALUES 
  -- MacBook Pro analytics
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', CURRENT_DATE - INTERVAL '7 days', 25, 8, 1, 315.00),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', CURRENT_DATE - INTERVAL '6 days', 18, 5, 0, 0.00),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', CURRENT_DATE - INTERVAL '5 days', 31, 12, 0, 0.00),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', CURRENT_DATE - INTERVAL '4 days', 22, 6, 0, 0.00),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', CURRENT_DATE - INTERVAL '3 days', 19, 4, 0, 0.00),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', CURRENT_DATE - INTERVAL '2 days', 27, 9, 0, 0.00),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', CURRENT_DATE - INTERVAL '1 day', 33, 11, 0, 0.00),
  
  -- Camera analytics
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', CURRENT_DATE - INTERVAL '5 days', 15, 7, 0, 0.00),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', CURRENT_DATE - INTERVAL '4 days', 21, 4, 0, 0.00),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', CURRENT_DATE - INTERVAL '3 days', 28, 10, 0, 0.00),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', CURRENT_DATE - INTERVAL '2 days', 12, 3, 0, 0.00),
  
  -- Tesla analytics
  ('gggggggg-gggg-gggg-gggg-gggggggggggg', CURRENT_DATE - INTERVAL '2 days', 45, 18, 0, 0.00),
  ('gggggggg-gggg-gggg-gggg-gggggggggggg', CURRENT_DATE - INTERVAL '1 day', 52, 21, 1, 400.00);

-- 8. Insert some AI usage logs for testing
INSERT INTO ai_usage_logs (user_id, action, content_type, metadata, success, created_at) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'generate_content', 'listing_description', '{"listing_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "prompt_type": "description"}', true, NOW() - INTERVAL '20 days'),
  ('22222222-2222-2222-2222-222222222222', 'analyze_photos', 'listing_photos', '{"listing_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "photo_count": 2}', true, NOW() - INTERVAL '15 days'),
  ('33333333-3333-3333-3333-333333333333', 'price_suggestion', 'listing_pricing', '{"listing_id": "cccccccc-cccc-cccc-cccc-cccccccccccc", "category": "tools-equipment"}', true, NOW() - INTERVAL '10 days'),
  ('11111111-1111-1111-1111-111111111111', 'generate_content', 'listing_title', '{"listing_id": "gggggggg-gggg-gggg-gggg-gggggggggggg", "prompt_type": "title"}', true, NOW() - INTERVAL '3 days');

-- 9. Insert some search analytics
INSERT INTO search_analytics (query, results_count, filters, user_id, created_at) VALUES 
  ('MacBook Pro', 1, '{"category": "electronics", "location": "San Francisco"}', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '2 days'),
  ('camera rental', 1, '{"category": "cameras-photography", "price_max": 100}', '33333333-3333-3333-3333-333333333333', NOW() - INTERVAL '1 day'),
  ('Tesla Model 3', 1, '{"category": "vehicles", "location": "San Francisco"}', '44444444-4444-4444-4444-444444444444', NOW() - INTERVAL '6 hours'),
  ('drill tools', 1, '{"category": "tools-equipment", "price_max": 50}', '55555555-5555-5555-5555-555555555555', NOW() - INTERVAL '3 hours'),
  ('camping gear', 1, '{"category": "sports-outdoors", "location": "Denver"}', '66666666-6666-6666-6666-666666666666', NOW() - INTERVAL '1 hour');

-- Mark end of test data section  
-- TEST_DATA_END

-- Display summary of inserted test data
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST DATA INSERTION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Inserted:';
  RAISE NOTICE '- % test user profiles', (SELECT COUNT(*) FROM profiles WHERE id LIKE '%-%-%-%-%');
  RAISE NOTICE '- % test listings across all categories', (SELECT COUNT(*) FROM listings WHERE id LIKE '%-%-%-%-%');
  RAISE NOTICE '- % test bookings (various statuses)', (SELECT COUNT(*) FROM bookings WHERE id LIKE 'book%');
  RAISE NOTICE '- % test messages', (SELECT COUNT(*) FROM messages WHERE id LIKE 'msg%');
  RAISE NOTICE '- % test reviews', (SELECT COUNT(*) FROM reviews WHERE id LIKE 'rev%');
  RAISE NOTICE '- % analytics entries', (SELECT COUNT(*) FROM listing_analytics WHERE listing_id LIKE '%-%-%-%-%');
  RAISE NOTICE '========================================';
  RAISE NOTICE 'You can now test all components:';
  RAISE NOTICE '✓ User profiles and authentication';
  RAISE NOTICE '✓ Listing creation and browsing';
  RAISE NOTICE '✓ Search and filtering';
  RAISE NOTICE '✓ Booking system (pending, confirmed, completed)';
  RAISE NOTICE '✓ Messaging between users';
  RAISE NOTICE '✓ Review system after completed bookings';
  RAISE NOTICE '✓ Analytics and tracking';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'To remove all test data, run: 999_test_data_cleanup.sql';
  RAISE NOTICE '========================================';
END $$;