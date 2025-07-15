# Test Data Guide

This guide explains how to use the comprehensive test data for your Lendify application.

## Quick Setup

### 1. Add Test Data
```bash
# Using Supabase CLI
supabase db reset  # Optional: Reset to clean state first
supabase db push   # Apply all migrations including test data

# Or apply just the test data migration
psql -h your-db-host -d your-db -f supabase/migrations/999_test_data.sql
```

### 2. Remove Test Data
```bash
# Apply cleanup migration
psql -h your-db-host -d your-db -f supabase/migrations/999_test_data_cleanup.sql
```

## What's Included

### 📱 Test Users (6 profiles)
- **John Doe** (SF) - Tech enthusiast, owns MacBook Pro and Tesla
- **Jane Smith** (LA) - Photographer, owns Sony A7IV camera kit  
- **Mike Johnson** (Seattle) - Contractor, owns DeWalt drill set
- **Sarah Wilson** (Austin) - Outdoor enthusiast, owns Trek mountain bike
- **Alex Brown** (Denver) - Adventurer, owns complete camping gear
- **Lisa Garcia** (Miami) - Event organizer, owns DJ equipment

### 🏠 Test Listings (8 items)
- MacBook Pro 16" M2 Max ($45/day) - Electronics
- Sony A7IV Camera Kit ($75/day) - Photography  
- DeWalt Drill Set ($25/day) - Tools
- Trek Mountain Bike ($35/day) - Sports
- Camping Gear Set ($40/day) - Outdoors
- DJ Equipment ($120/day) - Events
- Tesla Model 3 ($80/day) - Vehicle
- Pressure Washer ($30/day) - Home & Garden

### 📅 Test Bookings (8 bookings)
- **3 Completed** - Ready for reviews
- **2 Confirmed** - Upcoming rentals  
- **2 Pending** - Awaiting approval
- **1 Cancelled** - For testing cancellation flow

### 💬 Test Messages (15+ conversations)
- Booking inquiries and responses
- Pickup/delivery coordination
- General product questions
- Mixed conversation types

### ⭐ Test Reviews (6 reviews)
- 5-star and 4-star ratings
- Detailed comments from both renters and owners
- Only for completed bookings (realistic flow)

### 📊 Test Analytics
- Listing view/click tracking
- Revenue analytics
- Search analytics
- AI usage logs

## Testing Scenarios

### 🔍 Search & Browse
- Search for "MacBook" → Find John's laptop
- Filter by category "Electronics" → See tech items
- Browse by location "San Francisco" → Local listings
- Price range filtering → Various price points

### 💼 Booking Flow
- **Pending Bookings**: Test approval/rejection workflow
- **Confirmed Bookings**: Test pre-rental communication  
- **Completed Bookings**: Test review submission
- **Cancelled Bookings**: Test cancellation handling

### 💬 Messaging System
- **With Bookings**: See contextual conversations
- **General Inquiries**: Product questions without bookings
- **Multi-message Threads**: Full conversation flows

### ⭐ Review System
- View existing reviews on user profiles
- Submit new reviews (only for completed bookings)
- Average rating calculations
- Review display in listings

### 🏠 Dashboard Testing
- **As John**: See multiple listings, bookings as owner
- **As Jane**: Experience as both renter and owner
- **As Sarah**: Pending booking requiring action

## Test User Credentials

Since these are test UUIDs, you'll need to:
1. Either modify your auth system to recognize these test UUIDs
2. Or create real auth users and update the profile IDs

### Quick Auth Testing
```sql
-- Create auth users for testing (adjust as needed for your auth system)
INSERT INTO auth.users (id, email) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'john.doe@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'jane.smith@test.com');
```

## API Testing Examples

### Get Listings
```bash
curl "http://localhost:3000/api/listings"
curl "http://localhost:3000/api/listings?category=electronics"
curl "http://localhost:3000/api/listings?location=San Francisco"
```

### Get User Messages
```bash
curl "http://localhost:3000/api/messages" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Bookings  
```bash
curl "http://localhost:3000/api/bookings" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Reviews
```bash
curl "http://localhost:3000/api/reviews"
```

## Geographic Testing

All listings have realistic coordinates:
- **San Francisco**: -122.4194, 37.7749
- **Los Angeles**: -118.2437, 34.0522  
- **Seattle**: -122.3321, 47.6062
- **Austin**: -97.7431, 30.2672
- **Denver**: -104.9903, 39.7392
- **Miami**: -80.1918, 25.7617

Perfect for testing:
- Location-based search
- Map integrations
- Distance calculations
- Geographic filtering

## Data Relationships

```
Users (6) → Listings (8) → Bookings (8) → Messages (15+) & Reviews (6)
          ↓
      Analytics & AI Logs
```

All data is interconnected to test realistic workflows and edge cases.

## Cleanup Notes

- Test data uses specific ID patterns for easy identification
- Cleanup script removes only test data, preserves real data
- Categories are preserved (they're not test data)
- Always backup before major operations

## Tips

1. **Start Small**: Test one component at a time
2. **Use Different Users**: Switch between test accounts for full experience  
3. **Check Edge Cases**: Pending bookings, no reviews yet, etc.
4. **Geographic Variety**: Test with different locations
5. **Time-based Testing**: Use various booking date ranges

Happy testing! 🚀