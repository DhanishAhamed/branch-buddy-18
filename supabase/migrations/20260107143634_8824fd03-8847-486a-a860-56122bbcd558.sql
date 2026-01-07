-- Create storage bucket for property media
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-media', 'property-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload property media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-media');

-- Allow public read access
CREATE POLICY "Anyone can view property media"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-media');

-- Allow users to update their own uploads
CREATE POLICY "Users can update own property media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'property-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own property media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add can_edit_properties column to profiles for property edit access control
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_edit_properties boolean DEFAULT false;

-- Add whatsapp_config to store WhatsApp settings (admin only)
CREATE TABLE IF NOT EXISTS public.whatsapp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  api_key text,
  phone_number text,
  business_name text,
  is_enabled boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(branch_id)
);

-- Enable RLS on whatsapp_config
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

-- Only admins can manage WhatsApp config
CREATE POLICY "Admins can manage whatsapp config"
ON public.whatsapp_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));