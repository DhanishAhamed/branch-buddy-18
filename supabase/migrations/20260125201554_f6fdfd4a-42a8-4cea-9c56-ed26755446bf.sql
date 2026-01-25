-- Add branding columns to workspaces
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#8B5CF6',
ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#A78BFA',
ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#C4B5FD';

-- Update workspace logos
UPDATE public.workspaces SET logo_url = '/placeholder.svg' WHERE logo_url IS NULL;

-- Add workspace_id to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id);

-- Add workspace_id to properties table  
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id);

-- Add workspace_id to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id);

-- Add workspace_id to call_notes table
ALTER TABLE public.call_notes ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id);

-- Create index for faster workspace filtering
CREATE INDEX IF NOT EXISTS idx_leads_workspace ON public.leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_properties_workspace ON public.properties(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON public.tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_call_notes_workspace ON public.call_notes(workspace_id);

-- Update RLS policies for leads to include workspace filtering
DROP POLICY IF EXISTS "Staff can view branch leads" ON public.leads;
CREATE POLICY "Staff can view workspace leads" ON public.leads
FOR SELECT USING (
  is_user_approved(auth.uid()) 
  AND branch_id = get_user_branch_id(auth.uid())
  AND (workspace_id IS NULL OR workspace_id = get_active_workspace_id(auth.uid()))
);

DROP POLICY IF EXISTS "Staff can manage branch leads" ON public.leads;
CREATE POLICY "Staff can manage workspace leads" ON public.leads
FOR ALL USING (
  is_user_approved(auth.uid()) 
  AND branch_id = get_user_branch_id(auth.uid())
  AND (workspace_id IS NULL OR workspace_id = get_active_workspace_id(auth.uid()))
);

-- Update RLS policies for properties
DROP POLICY IF EXISTS "Staff can view branch properties" ON public.properties;
CREATE POLICY "Staff can view workspace properties" ON public.properties
FOR SELECT USING (
  is_user_approved(auth.uid()) 
  AND branch_id = get_user_branch_id(auth.uid())
  AND (workspace_id IS NULL OR workspace_id = get_active_workspace_id(auth.uid()))
);

DROP POLICY IF EXISTS "Staff can manage branch properties" ON public.properties;
CREATE POLICY "Staff can manage workspace properties" ON public.properties
FOR ALL USING (
  is_user_approved(auth.uid()) 
  AND branch_id = get_user_branch_id(auth.uid())
  AND (workspace_id IS NULL OR workspace_id = get_active_workspace_id(auth.uid()))
);

-- Update RLS policies for tasks
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
CREATE POLICY "Users can view workspace tasks" ON public.tasks
FOR SELECT USING (
  user_id = auth.uid()
  AND (workspace_id IS NULL OR workspace_id = get_active_workspace_id(auth.uid()))
);

DROP POLICY IF EXISTS "Users can manage own tasks" ON public.tasks;
CREATE POLICY "Users can manage workspace tasks" ON public.tasks
FOR ALL USING (
  user_id = auth.uid()
  AND (workspace_id IS NULL OR workspace_id = get_active_workspace_id(auth.uid()))
);

-- Allow admins to view all user_workspaces for assignment
DROP POLICY IF EXISTS "Admins can view all user workspaces" ON public.user_workspaces;
CREATE POLICY "Admins can view all user workspaces" ON public.user_workspaces
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));