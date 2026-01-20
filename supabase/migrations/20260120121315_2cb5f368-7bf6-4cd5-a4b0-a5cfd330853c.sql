-- Create a public-safe view for properties that excludes owner_details
CREATE VIEW public.properties_public
WITH (security_invoker=on) AS
  SELECT 
    id,
    title,
    description,
    address,
    price,
    bedrooms,
    bathrooms,
    area_sqft,
    images,
    location,
    status,
    portal_type,
    property_type_id,
    branch_id,
    created_at,
    updated_at
    -- Excludes: owner_details, created_by
  FROM public.properties
  WHERE status = 'available'::property_status;

-- Drop the existing public policy that exposes owner_details
DROP POLICY IF EXISTS "Public can view available properties" ON public.properties;

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.properties_public TO anon, authenticated;