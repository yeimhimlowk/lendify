# Deployment Guide

## Vercel Deployment

### Required Environment Variables

Before deploying to Vercel, you must set the following environment variables:

#### Supabase Configuration (Required)
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for server-side operations)

#### Mapbox Configuration (Required for map features)
- `NEXT_PUBLIC_MAPBOX_TOKEN` - Your Mapbox public access token
- `NEXT_PUBLIC_MAPBOX_STYLE` - Your custom Mapbox style URL (optional, defaults to streets-v12)

#### OpenRouter API (Required for AI features)
- `OPENROUTER_API_KEY` - Your OpenRouter API key

#### Application URL
- `NEXT_PUBLIC_APP_URL` - Your production URL (e.g., https://yourdomain.com)

### Setting Environment Variables on Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable listed above
4. Make sure to set them for the appropriate environments (Production, Preview, Development)

### Error Handling

The application now includes proper validation for environment variables:

- **Supabase Client**: Will throw a clear error message if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing
- **Mapbox Components**: Will show a graceful fallback UI if Mapbox tokens are missing
- **Middleware**: Will bypass authentication checks if Supabase is not configured

### Local Development

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your actual credentials.

### Troubleshooting

If you encounter "Failed to execute 'fetch' on 'Window': Invalid value" error:
1. Check that all required environment variables are set in Vercel
2. Verify the values don't contain any special characters that need escaping
3. Ensure the Supabase URL starts with `https://`
4. Make sure the anonymous key is the correct format (JWT token)