# Lendify API Documentation

This document provides comprehensive documentation for the Lendify peer-to-peer rental marketplace API endpoints.

## Base URL
```
https://your-domain.com/api
```

## Authentication
Most endpoints require authentication using Supabase Auth. Include the JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Rate Limiting
- **Standard endpoints**: 100 requests per 15 minutes
- **Authenticated endpoints**: 200 requests per 15 minutes  
- **AI endpoints**: 50 requests per hour
- **Public endpoints**: 500 requests per 15 minutes

## Response Format
All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {...},
  "message": "Optional success message",
  "pagination": {  // For paginated responses
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### Error Response
```json
{
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "code": "ERROR_CODE",
  "details": {...} // Optional additional error details
}
```

## Endpoints

### 1. Listings API

#### GET /api/listings
Get listings with search, filtering, and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `category` (string): Category ID or slug
- `location` (string): Location text search
- `latitude` (number): Latitude for geographic search
- `longitude` (number): Longitude for geographic search
- `radius` (number): Search radius in km (default: 10)
- `minPrice` (number): Minimum price per day
- `maxPrice` (number): Maximum price per day
- `condition` (string): Item condition (new, like_new, good, fair, poor)
- `tags` (string): Comma-separated tags
- `status` (string): Listing status (active, inactive, draft, archived)
- `sortBy` (string): Sort field (created_at, price_per_day, title, updated_at)
- `sortOrder` (string): Sort order (asc, desc)
- `featured` (boolean): Filter featured listings

**Example:**
```
GET /api/listings?category=electronics&minPrice=10&maxPrice=50&page=1&limit=20
```

#### POST /api/listings
Create a new listing. **Requires authentication**.

**Request Body:**
```json
{
  "title": "Professional Camera for Rent",
  "description": "High-quality DSLR camera perfect for events and photography",
  "category_id": "uuid",
  "price_per_day": 35.00,
  "price_per_week": 200.00,
  "price_per_month": 750.00,
  "deposit_amount": 100.00,
  "condition": "like_new",
  "address": "123 Main St, San Francisco, CA",
  "location": {
    "lat": 37.7749,
    "lng": -122.4194
  },
  "photos": [
    "https://example.com/photo1.jpg",
    "https://example.com/photo2.jpg"
  ],
  "tags": ["camera", "photography", "professional"],
  "status": "active"
}
```

#### GET /api/listings/[id]
Get single listing details.

#### PUT /api/listings/[id]
Update listing. **Requires authentication and ownership**.

#### DELETE /api/listings/[id]
Delete (archive) listing. **Requires authentication and ownership**.

#### GET /api/listings/featured
Get featured listings based on quality metrics.

**Query Parameters:**
- `limit` (number): Number of listings (default: 12, max: 50)
- `category` (string): Filter by category

#### GET /api/listings/user/[userId]
Get listings by specific user.

**Query Parameters:**
- `status` (string): Filter by status (owners only)
- `category` (string): Filter by category
- `page`, `limit`: Pagination
- `sortBy`, `sortOrder`: Sorting

### 2. Search API

#### GET /api/search
Comprehensive search with advanced filtering and ranking.

**Query Parameters:**
- `query` (string): Search query (required)
- `page`, `limit`: Pagination
- `category`, `location`: Filters
- `latitude`, `longitude`, `radius`: Geographic search
- `minPrice`, `maxPrice`: Price range
- `condition`: Item condition
- `tags`: Tag filtering
- `available_from`, `available_to`: Availability dates
- `sortBy`: Sorting (relevance, price_per_day, created_at, distance)
- `sortOrder`: Sort direction

**Example:**
```
GET /api/search?query=camera&category=electronics&latitude=37.7749&longitude=-122.4194&radius=5
```

#### GET /api/search/suggestions
Get search autocomplete suggestions.

**Query Parameters:**
- `query` (string): Search term (min 2 characters)
- `limit` (number): Max suggestions (default: 10, max: 20)
- `type` (string): Suggestion type (all, categories, locations, items)

### 3. Categories API

#### GET /api/categories
Get all categories with optional hierarchy and statistics.

**Query Parameters:**
- `parent_id` (string): Filter by parent category
- `include_children` (boolean): Include child categories
- `include_counts` (boolean): Include listing counts

#### POST /api/categories
Create new category. **Requires authentication (admin)**.

#### GET /api/categories/[id]
Get single category with details.

#### PUT /api/categories/[id]
Update category. **Requires authentication (admin)**.

#### DELETE /api/categories/[id]
Delete category. **Requires authentication (admin)**.

#### GET /api/categories/[id]/listings
Get all listings in a category.

### 4. Bookings API

#### GET /api/bookings
Get user's bookings. **Requires authentication**.

**Query Parameters:**
- `status` (string): Filter by status
- `start_date`, `end_date`: Date range filters
- `listing_id`: Filter by listing
- `page`, `limit`: Pagination
- `sortBy`, `sortOrder`: Sorting

#### POST /api/bookings
Create new booking. **Requires authentication**.

**Request Body:**
```json
{
  "listing_id": "uuid",
  "start_date": "2024-01-15T00:00:00Z",
  "end_date": "2024-01-20T00:00:00Z",
  "total_price": 175.00
}
```

#### GET /api/bookings/[id]
Get booking details. **Requires authentication and permission**.

#### PUT /api/bookings/[id]
Update booking status. **Requires authentication and permission**.

**Request Body:**
```json
{
  "status": "confirmed"
}
```

#### DELETE /api/bookings/[id]
Cancel booking. **Requires authentication and permission**.

### 5. Users API

#### GET /api/users/profile
Get current user's profile. **Requires authentication**.

**Query Parameters:**
- `include_stats` (boolean): Include user statistics
- `include_reviews` (boolean): Include recent reviews

#### PUT /api/users/profile
Update user profile. **Requires authentication**.

**Request Body:**
```json
{
  "full_name": "John Doe",
  "phone": "+1234567890",
  "address": "123 Main St, City, State",
  "location": {
    "lat": 37.7749,
    "lng": -122.4194
  },
  "avatar_url": "https://example.com/avatar.jpg"
}
```

#### GET /api/users/[id]
Get public user profile.

### 6. AI API

#### POST /api/ai/analyze-photos
Analyze photos for listing optimization. **Requires authentication**.

**Request Body:**
```json
{
  "photos": [
    "https://example.com/photo1.jpg",
    "https://example.com/photo2.jpg"
  ],
  "listing_id": "uuid", // Optional
  "analysis_type": "description" // description, condition, pricing, tags
}
```

#### POST /api/ai/generate-content
Generate AI-powered content for listings. **Requires authentication**.

**Request Body:**
```json
{
  "type": "title", // title, description, tags
  "context": {
    "category": "Electronics",
    "condition": "good",
    "price_range": "$20-40",
    "photos": ["https://example.com/photo.jpg"],
    "existing_content": "Optional existing content"
  },
  "tone": "friendly", // professional, casual, friendly, technical
  "length": "medium" // short, medium, long
}
```

#### POST /api/ai/price-suggestions
Get AI-powered pricing suggestions. **Requires authentication**.

**Request Body:**
```json
{
  "category_id": "uuid",
  "condition": "good",
  "location": {
    "lat": 37.7749,
    "lng": -122.4194
  },
  "photos": ["https://example.com/photo.jpg"], // Optional
  "description": "Optional description", // Optional
  "comparable_listings": ["uuid1", "uuid2"] // Optional
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Request validation failed |
| AUTHENTICATION_ERROR | 401 | Authentication required or failed |
| AUTHORIZATION_ERROR | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource conflict (e.g., booking dates) |
| RATE_LIMIT | 429 | Rate limit exceeded |
| INTERNAL_ERROR | 500 | Internal server error |

## Data Types

### Listing Status
- `active`: Publicly visible and bookable
- `inactive`: Not visible publicly  
- `draft`: Being edited by owner
- `archived`: Deleted/removed

### Booking Status
- `pending`: Awaiting owner confirmation
- `confirmed`: Confirmed by owner
- `active`: Currently ongoing rental
- `completed`: Rental finished
- `cancelled`: Cancelled by either party

### Item Condition
- `new`: Brand new, unused
- `like_new`: Minimal wear, excellent condition
- `good`: Normal wear, good working order
- `fair`: Noticeable wear but functional
- `poor`: Significant wear, may have issues

## Best Practices

1. **Pagination**: Always use pagination for list endpoints
2. **Caching**: Responses include appropriate cache headers
3. **Rate Limiting**: Respect rate limits and implement backoff
4. **Error Handling**: Always check response status and handle errors
5. **Security**: Never expose sensitive data in logs or responses
6. **Performance**: Use appropriate filters to reduce data transfer

## SDK and Examples

### JavaScript/TypeScript Example
```javascript
// Get listings with authentication
const response = await fetch('/api/listings', {
  headers: {
    'Authorization': `Bearer ${jwt_token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();

if (data.success) {
  console.log('Listings:', data.data);
  console.log('Pagination:', data.pagination);
} else {
  console.error('Error:', data.message);
}
```

### Creating a Listing
```javascript
const newListing = {
  title: "Professional Camera",
  description: "High-quality DSLR camera",
  category_id: "electronics-uuid",
  price_per_day: 35.00,
  condition: "like_new",
  address: "San Francisco, CA",
  location: { lat: 37.7749, lng: -122.4194 },
  photos: ["https://example.com/photo.jpg"],
  tags: ["camera", "photography"]
};

const response = await fetch('/api/listings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(newListing)
});
```

### Search with Filters
```javascript
const searchParams = new URLSearchParams({
  query: 'camera',
  category: 'electronics',
  minPrice: '20',
  maxPrice: '100',
  latitude: '37.7749',
  longitude: '-122.4194',
  radius: '10'
});

const response = await fetch(`/api/search?${searchParams}`);
```

## Changelog

### Version 1.0.0 (Current)
- Initial API implementation
- Full CRUD operations for listings, bookings, users
- Advanced search and filtering
- AI-powered features
- Comprehensive security and rate limiting