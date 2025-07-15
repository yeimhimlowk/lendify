-- ========================================
-- TEST DATA CLEANUP SCRIPT
-- ========================================
-- This script removes all test data inserted by 999_test_data.sql
-- Run this to clean up your database after testing

-- Mark beginning of cleanup
-- TEST_DATA_CLEANUP_START

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STARTING TEST DATA CLEANUP';
  RAISE NOTICE '========================================';
END $$;

-- Count data before cleanup for confirmation
DO $$
DECLARE
  profile_count INTEGER;
  listing_count INTEGER;
  booking_count INTEGER;
  message_count INTEGER;
  review_count INTEGER;
  analytics_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM profiles WHERE id LIKE '%-%-%-%-%';
  SELECT COUNT(*) INTO listing_count FROM listings WHERE id LIKE '%-%-%-%-%';
  SELECT COUNT(*) INTO booking_count FROM bookings WHERE id LIKE 'book%';
  SELECT COUNT(*) INTO message_count FROM messages WHERE id LIKE 'msg%';
  SELECT COUNT(*) INTO review_count FROM reviews WHERE id LIKE 'rev%';
  SELECT COUNT(*) INTO analytics_count FROM listing_analytics WHERE listing_id LIKE '%-%-%-%-%';
  
  RAISE NOTICE 'Found test data to remove:';
  RAISE NOTICE '- % test profiles', profile_count;
  RAISE NOTICE '- % test listings', listing_count;
  RAISE NOTICE '- % test bookings', booking_count;
  RAISE NOTICE '- % test messages', message_count;
  RAISE NOTICE '- % test reviews', review_count;
  RAISE NOTICE '- % analytics entries', analytics_count;
  RAISE NOTICE '========================================';
END $$;

-- 1. Remove analytics data first (no foreign key dependencies)
DELETE FROM search_analytics WHERE user_id IN (
  SELECT id FROM profiles WHERE id LIKE '%-%-%-%-%'
);

DELETE FROM ai_usage_logs WHERE user_id IN (
  SELECT id FROM profiles WHERE id LIKE '%-%-%-%-%'
);

DELETE FROM listing_analytics WHERE listing_id IN (
  SELECT id FROM listings WHERE id LIKE '%-%-%-%-%'
);

-- 2. Remove AI analysis cache
DELETE FROM ai_analysis_cache WHERE listing_id IN (
  SELECT id FROM listings WHERE id LIKE '%-%-%-%-%'
);

-- 3. Remove chat sessions
DELETE FROM chat_sessions WHERE user_id IN (
  SELECT id FROM profiles WHERE id LIKE '%-%-%-%-%'
);

-- 4. Remove reviews (depends on bookings)
DELETE FROM reviews WHERE id LIKE 'rev%';

-- 5. Remove messages (depends on profiles and bookings)
DELETE FROM messages WHERE id LIKE 'msg%';

-- 6. Remove bookings (depends on listings and profiles)
DELETE FROM bookings WHERE id LIKE 'book%';

-- 7. Remove listings (depends on profiles and categories)
DELETE FROM listings WHERE id LIKE '%-%-%-%-%';

-- 8. Remove test profiles (this will cascade to anything we missed)
DELETE FROM profiles WHERE id LIKE '%-%-%-%-%';

-- Verify cleanup
DO $$
DECLARE
  profile_count INTEGER;
  listing_count INTEGER;
  booking_count INTEGER;
  message_count INTEGER;
  review_count INTEGER;
  analytics_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM profiles WHERE id LIKE '%-%-%-%-%';
  SELECT COUNT(*) INTO listing_count FROM listings WHERE id LIKE '%-%-%-%-%';
  SELECT COUNT(*) INTO booking_count FROM bookings WHERE id LIKE 'book%';
  SELECT COUNT(*) INTO message_count FROM messages WHERE id LIKE 'msg%';
  SELECT COUNT(*) INTO review_count FROM reviews WHERE id LIKE 'rev%';
  SELECT COUNT(*) INTO analytics_count FROM listing_analytics WHERE listing_id LIKE '%-%-%-%-%';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CLEANUP VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Remaining test data (should all be 0):';
  RAISE NOTICE '- % test profiles', profile_count;
  RAISE NOTICE '- % test listings', listing_count;
  RAISE NOTICE '- % test bookings', booking_count;
  RAISE NOTICE '- % test messages', message_count;
  RAISE NOTICE '- % test reviews', review_count;
  RAISE NOTICE '- % analytics entries', analytics_count;
  
  IF profile_count = 0 AND listing_count = 0 AND booking_count = 0 AND message_count = 0 AND review_count = 0 AND analytics_count = 0 THEN
    RAISE NOTICE '✓ ALL TEST DATA SUCCESSFULLY REMOVED';
  ELSE
    RAISE NOTICE '⚠ Some test data may remain - check manually';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Categories remain intact (they are not test data)';
  RAISE NOTICE 'Your database is now clean and ready for production';
  RAISE NOTICE '========================================';
END $$;

-- Mark end of cleanup
-- TEST_DATA_CLEANUP_END