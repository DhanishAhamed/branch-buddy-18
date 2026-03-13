
-- ============================================================
-- STEP 1: Drop ALL RLS policies that reference branch_id
-- ============================================================

-- leads
DROP POLICY IF EXISTS "Public can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Staff can manage workspace leads" ON public.leads;
DROP POLICY IF EXISTS "Staff can view workspace leads" ON public.leads;

-- call_notes
DROP POLICY IF EXISTS "Staff can view branch call notes" ON public.call_notes;

-- lead_status_log
DROP POLICY IF EXISTS "Staff can view branch status logs" ON public.lead_status_log;

-- customer_properties
DROP POLICY IF EXISTS "Staff can insert customer properties" ON public.customer_properties;
DROP POLICY IF EXISTS "Staff can view customer properties" ON public.customer_properties;

-- lead_properties
DROP POLICY IF EXISTS "Staff can manage lead properties" ON public.lead_properties;
DROP POLICY IF EXISTS "Staff can view branch lead properties" ON public.lead_properties;

-- lead_settings
DROP POLICY IF EXISTS "Staff can view lead settings" ON public.lead_settings;

-- customers
DROP POLICY IF EXISTS "Staff can insert workspace customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can view workspace customers" ON public.customers;

-- whatsapp_templates
DROP POLICY IF EXISTS "Staff can view branch templates" ON public.whatsapp_templates;

-- whatsapp_config
DROP POLICY IF EXISTS "Admins can manage whatsapp config" ON public.whatsapp_config;

-- properties
DROP POLICY IF EXISTS "Staff can manage workspace properties" ON public.properties;
DROP POLICY IF EXISTS "Staff can view workspace properties" ON public.properties;

-- profiles  
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Drop the view that depends on properties columns
DROP VIEW IF EXISTS public.properties_public;
DROP VIEW IF EXISTS public.workspace_contacts;

-- ============================================================
-- STEP 2: Drop branch_id columns from all tables
-- ============================================================

-- leads
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_branch_id_fkey;
ALTER TABLE public.leads DROP COLUMN IF EXISTS branch_id;

-- properties
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_branch_id_fkey;
ALTER TABLE public.properties DROP COLUMN IF EXISTS branch_id;

-- customers
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_branch_id_fkey;
ALTER TABLE public.customers DROP COLUMN IF EXISTS branch_id;

-- contact_entries
ALTER TABLE public.contact_entries DROP CONSTRAINT IF EXISTS contact_entries_branch_id_fkey;
ALTER TABLE public.contact_entries DROP COLUMN IF EXISTS branch_id;

-- contact_folders
ALTER TABLE public.contact_folders DROP CONSTRAINT IF EXISTS contact_folders_branch_id_fkey;
ALTER TABLE public.contact_folders DROP COLUMN IF EXISTS branch_id;

-- profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_branch_id_fkey;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS branch_id;

-- pipeline_stages: add workspace_id, copy data, drop branch_id
ALTER TABLE public.pipeline_stages ADD COLUMN IF NOT EXISTS workspace_id uuid;
UPDATE public.pipeline_stages SET workspace_id = branch_id WHERE workspace_id IS NULL AND branch_id IS NOT NULL;
ALTER TABLE public.pipeline_stages DROP CONSTRAINT IF EXISTS pipeline_stages_branch_id_fkey;
ALTER TABLE public.pipeline_stages DROP COLUMN IF EXISTS branch_id;

-- lead_settings: add workspace_id, copy data, drop branch_id
ALTER TABLE public.lead_settings ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE public.lead_settings DROP CONSTRAINT IF EXISTS lead_settings_branch_id_fkey;
UPDATE public.lead_settings SET workspace_id = branch_id WHERE workspace_id IS NULL AND branch_id IS NOT NULL;
ALTER TABLE public.lead_settings DROP COLUMN IF EXISTS branch_id;

-- whatsapp_config: add workspace_id, copy data, drop branch_id
ALTER TABLE public.whatsapp_config ADD COLUMN IF NOT EXISTS workspace_id uuid;
UPDATE public.whatsapp_config SET workspace_id = branch_id WHERE workspace_id IS NULL AND branch_id IS NOT NULL;
ALTER TABLE public.whatsapp_config DROP CONSTRAINT IF EXISTS whatsapp_config_branch_id_fkey;
ALTER TABLE public.whatsapp_config DROP COLUMN IF EXISTS branch_id;

-- whatsapp_templates: add workspace_id, copy data, drop branch_id
ALTER TABLE public.whatsapp_templates ADD COLUMN IF NOT EXISTS workspace_id uuid;
UPDATE public.whatsapp_templates SET workspace_id = branch_id WHERE workspace_id IS NULL AND branch_id IS NOT NULL;
ALTER TABLE public.whatsapp_templates DROP CONSTRAINT IF EXISTS whatsapp_templates_branch_id_fkey;
ALTER TABLE public.whatsapp_templates DROP COLUMN IF EXISTS branch_id;

-- ============================================================
-- STEP 3: Drop branches table
-- ============================================================
DROP TABLE IF EXISTS public.branches CASCADE;

-- Drop the get_user_branch_id function
DROP FUNCTION IF EXISTS public.get_user_branch_id(uuid);

-- ============================================================
-- STEP 4: Recreate views
-- ============================================================
CREATE VIEW public.properties_public
WITH (security_invoker=on) AS
  SELECT 
    id, title, description, address, price, area_sqft, 
    bedrooms, bathrooms, images, location, portal_type, 
    status, property_type_id, workspace_id, youtube_url,
    created_at, updated_at
  FROM public.properties
  WHERE status = 'available';

CREATE VIEW public.workspace_contacts
WITH (security_invoker=on) AS
  SELECT id, name, logo_url, slug, whatsapp_number
  FROM public.workspaces;

-- ============================================================
-- STEP 5: Recreate RLS policies (workspace-scoped, no branch)
-- ============================================================

-- profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

-- leads: public insert (no branch_id needed now)
CREATE POLICY "Public can insert leads" ON public.leads
  FOR INSERT WITH CHECK (name IS NOT NULL);

-- leads: staff workspace access
CREATE POLICY "Staff can manage workspace leads" ON public.leads
  FOR ALL USING (
    is_user_approved(auth.uid()) AND
    ((workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid())) OR workspace_id IS NULL)
  );

CREATE POLICY "Staff can view workspace leads" ON public.leads
  FOR SELECT USING (
    is_user_approved(auth.uid()) AND
    ((workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid())) OR workspace_id IS NULL)
  );

-- call_notes: staff workspace access
CREATE POLICY "Staff can view workspace call notes" ON public.call_notes
  FOR SELECT USING (
    is_user_approved(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = call_notes.lead_id 
      AND ((l.workspace_id IS NOT NULL AND l.workspace_id = get_active_workspace_id(auth.uid())) OR l.workspace_id IS NULL)
    )
  );

-- lead_status_log: staff workspace access
CREATE POLICY "Staff can view workspace status logs" ON public.lead_status_log
  FOR SELECT USING (
    is_user_approved(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = lead_status_log.lead_id 
      AND ((l.workspace_id IS NOT NULL AND l.workspace_id = get_active_workspace_id(auth.uid())) OR l.workspace_id IS NULL)
    )
  );

-- customer_properties: workspace access
CREATE POLICY "Staff can view workspace customer properties" ON public.customer_properties
  FOR SELECT USING (
    is_user_approved(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.customers c 
      WHERE c.id = customer_properties.customer_id 
      AND ((c.workspace_id IS NOT NULL AND c.workspace_id = get_active_workspace_id(auth.uid())) OR c.workspace_id IS NULL)
    )
  );

CREATE POLICY "Staff can insert workspace customer properties" ON public.customer_properties
  FOR INSERT WITH CHECK (
    is_user_approved(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.customers c 
      WHERE c.id = customer_properties.customer_id 
      AND ((c.workspace_id IS NOT NULL AND c.workspace_id = get_active_workspace_id(auth.uid())) OR c.workspace_id IS NULL)
    )
  );

-- lead_properties: workspace access
CREATE POLICY "Staff can manage workspace lead properties" ON public.lead_properties
  FOR ALL USING (
    is_user_approved(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = lead_properties.lead_id 
      AND ((l.workspace_id IS NOT NULL AND l.workspace_id = get_active_workspace_id(auth.uid())) OR l.workspace_id IS NULL)
    )
  );

CREATE POLICY "Staff can view workspace lead properties" ON public.lead_properties
  FOR SELECT USING (
    is_user_approved(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.leads l 
      WHERE l.id = lead_properties.lead_id 
      AND ((l.workspace_id IS NOT NULL AND l.workspace_id = get_active_workspace_id(auth.uid())) OR l.workspace_id IS NULL)
    )
  );

-- lead_settings
CREATE POLICY "Staff can view workspace lead settings" ON public.lead_settings
  FOR SELECT USING (
    (workspace_id IS NULL) OR (workspace_id = get_active_workspace_id(auth.uid()))
  );

-- customers: workspace staff access
CREATE POLICY "Staff can insert workspace customers" ON public.customers
  FOR INSERT WITH CHECK (
    is_user_approved(auth.uid()) AND
    ((workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid())) OR workspace_id IS NULL)
  );

CREATE POLICY "Staff can view workspace customers" ON public.customers
  FOR SELECT USING (
    is_user_approved(auth.uid()) AND
    ((workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid())) OR workspace_id IS NULL)
  );

-- whatsapp_templates
CREATE POLICY "Staff can view workspace templates" ON public.whatsapp_templates
  FOR SELECT USING (
    (workspace_id IS NULL) OR (workspace_id = get_active_workspace_id(auth.uid()))
  );

-- whatsapp_config
CREATE POLICY "Admins can manage whatsapp config" ON public.whatsapp_config
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- properties: staff workspace access
CREATE POLICY "Staff can manage workspace properties" ON public.properties
  FOR ALL USING (
    is_user_approved(auth.uid()) AND
    ((workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid())) OR (workspace_id IS NULL AND get_active_workspace_id(auth.uid()) IS NULL))
  );

CREATE POLICY "Staff can view workspace properties" ON public.properties
  FOR SELECT USING (
    is_user_approved(auth.uid()) AND
    ((workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid())) OR (workspace_id IS NULL AND get_active_workspace_id(auth.uid()) IS NULL))
  );
