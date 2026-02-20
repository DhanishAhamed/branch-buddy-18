
-- Add youtube_url column to properties table
ALTER TABLE public.properties ADD COLUMN youtube_url text;

-- Add staff_type column to profiles table
ALTER TABLE public.profiles ADD COLUMN staff_type text DEFAULT 'sales';
