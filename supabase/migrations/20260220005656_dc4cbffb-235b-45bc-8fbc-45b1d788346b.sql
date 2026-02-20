
-- Update properties_public to include workspace_id
CREATE OR REPLACE VIEW public.properties_public AS
SELECT id, title, description, address, price, bedrooms, bathrooms, area_sqft, images, location, status, portal_type, property_type_id, branch_id, created_at, updated_at, youtube_url, workspace_id
FROM properties;

-- Create a public view for workspace contact info
CREATE OR REPLACE VIEW public.workspace_contacts AS
SELECT id, whatsapp_number
FROM workspaces;
