-- Drop and recreate workspace_contacts view to include name, slug, and logo_url for public portal
DROP VIEW IF EXISTS public.workspace_contacts;

CREATE VIEW public.workspace_contacts AS
SELECT id, name, slug, logo_url, whatsapp_number
FROM public.workspaces;

-- Grant access to anon and authenticated roles
GRANT SELECT ON public.workspace_contacts TO anon;
GRANT SELECT ON public.workspace_contacts TO authenticated;