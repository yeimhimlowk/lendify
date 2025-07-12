# Lendify - AI-Powered P2P Rental Marketplace

## Project Overview
Lendify is a peer-to-peer rental marketplace that promotes circular economy by enabling people to rent out their underutilized items to others in their community. The platform features AI-powered listing creation, intelligent search, dynamic pricing, and comprehensive analytics.

## Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL), Edge Functions
- **Authentication**: Supabase Auth
- **Maps**: Mapbox GL JS, React Map GL
- **AI Models**: 
  - Claude 3.7 Sonnet (Text Intelligence)
  - Gemma 3 27B (Vision Intelligence)
- **State Management**: Zustand
- **Forms**: React Hook Form, Zod validation
- **Animations**: Framer Motion

## Architecture

### Frontend Structure
```
/app              # Next.js app directory
  /(auth)         # Authentication pages
  /(main)         # Main application pages
  /api            # API routes
/components       # Reusable React components
  /ui             # Base UI components
  /maps           # Map-related components
  /listings       # Listing components
  /chat           # Chat/AI components
  /charts         # Analytics charts
/lib              # Utility libraries
  /supabase       # Supabase client & types
  /ai             # AI service integrations
  /utils          # Helper functions
```

### Database Schema
- **profiles**: User profiles with ratings and verification
- **categories**: Item categories with icons
- **listings**: Rental listings with AI-generated content
- **bookings**: Rental bookings with status tracking
- **messages**: User messages with AI responses
- **reviews**: User reviews and ratings
- **listing_analytics**: Performance metrics
- **chat_sessions**: AI chat context
- **ai_analysis_cache**: Cached AI analysis results

## Current Progress

### ✅ Completed
1. **Project Setup**
   - Next.js 15 with TypeScript and Tailwind CSS
   - Supabase client configuration
   - Database schema and migrations
   - TypeScript types generation

2. **Homepage**
   - Airbnb-style header with search
   - Hero section with search bar
   - Category grid with icons
   - Featured listings section
   - Listing cards with hover effects

3. **Database**
   - All tables created with proper relationships
   - Row Level Security policies
   - Default categories populated
   - Indexes for performance

### 🚧 In Progress
- Search functionality with filters
- Map view with Mapbox integration

### 📋 TODO

#### High Priority
1. **Search & Discovery**
   - Search results page with filters
   - Map view with listing markers
   - Location-based search
   - Category filtering
   
2. **User Authentication**
   - Sign up/Login pages
   - User profile management
   - Email verification

3. **Listing Management**
   - Create listing wizard
   - AI photo analysis integration
   - Listing detail page
   - Edit/Delete listings

#### Medium Priority
4. **AI Integration**
   - Gemma photo analysis for listings
   - Claude chatbot for support
   - AI-powered pricing suggestions
   - Content generation

5. **Booking System**
   - Booking flow
   - Calendar availability
   - Payment integration (mock)
   - Booking management

6. **Analytics Dashboard**
   - Revenue charts
   - Performance metrics
   - AI insights panel
   - Demand heatmaps

#### Low Priority
7. **Messaging**
   - User-to-user messaging
   - AI chat assistant
   - Notification system

8. **Reviews & Ratings**
   - Post-booking reviews
   - Rating system
   - Trust badges

9. **Mobile & PWA**
   - Responsive design optimization
   - PWA manifest
   - Offline support

## API Endpoints

### Authentication
- Handled by Supabase Auth

### Listings
- `GET /api/listings` - Search listings
- `GET /api/listings/[id]` - Get listing details
- `POST /api/listings` - Create listing
- `PUT /api/listings/[id]` - Update listing
- `DELETE /api/listings/[id]` - Delete listing

### AI Services
- `POST /api/ai/analyze-photos` - Gemma photo analysis
- `POST /api/ai/generate-content` - Claude content generation
- `POST /api/ai/chat` - Claude chatbot
- `POST /api/ai/price-suggestion` - AI pricing

### Analytics
- `GET /api/analytics/dashboard` - Dashboard metrics
- `GET /api/analytics/insights` - AI insights

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY       # Supabase service role key
NEXT_PUBLIC_MAPBOX_TOKEN        # Mapbox access token
OPENROUTER_API_KEY              # OpenRouter API key for AI
```

## Development Commands
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run lint       # Run ESLint
npm test          # Run tests
```

## Deployment
- Frontend: Vercel
- Database: Supabase Cloud
- Edge Functions: Supabase

## Security Considerations
- Row Level Security on all tables
- Input validation with Zod
- Image upload validation
- Rate limiting on AI endpoints
- Secure authentication flow

## Performance Optimizations
- Server-side rendering
- Image optimization with Next.js
- Database indexing
- AI response caching
- Lazy loading for maps