-- Create storage bucket for listing photos
INSERT INTO storage.buckets (id, name, public, avif_autodetection, allowed_mime_types, file_size_limit)
VALUES (
  'listing-photos',
  'listing-photos', 
  true, -- Public bucket so images can be viewed without authentication
  false,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  5242880 -- 5MB limit
);

-- Set up RLS policies for the bucket
CREATE POLICY "Anyone can view listing photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'listing-photos');

CREATE POLICY "Authenticated users can upload listing photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'listing-photos' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their own listing photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'listing-photos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'listings'
);

CREATE POLICY "Users can delete their own listing photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'listing-photos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'listings'
);