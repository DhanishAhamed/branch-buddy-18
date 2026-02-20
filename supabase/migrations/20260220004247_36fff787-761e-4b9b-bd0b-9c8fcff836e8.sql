CREATE OR REPLACE VIEW public.properties_public AS
SELECT id, title, description, address, price, bedrooms, bathrooms, area_sqft, images, location, status, portal_type, property_type_id, branch_id, created_at, updated_at, youtube_url
FROM properties;