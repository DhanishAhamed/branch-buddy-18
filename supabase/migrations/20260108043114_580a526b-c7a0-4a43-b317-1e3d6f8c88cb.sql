-- Create function to get properties with coordinates
CREATE OR REPLACE FUNCTION get_properties_with_coords()
RETURNS TABLE (
  id uuid,
  title text,
  address text,
  price numeric,
  property_type_id uuid,
  bedrooms integer,
  bathrooms integer,
  area_sqft numeric,
  images text[],
  lat double precision,
  lng double precision
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.title,
    p.address,
    p.price,
    p.property_type_id,
    p.bedrooms,
    p.bathrooms,
    p.area_sqft,
    p.images,
    ST_Y(p.location::geometry) as lat,
    ST_X(p.location::geometry) as lng
  FROM properties p
  WHERE p.status = 'available'
    AND p.location IS NOT NULL;
$$;