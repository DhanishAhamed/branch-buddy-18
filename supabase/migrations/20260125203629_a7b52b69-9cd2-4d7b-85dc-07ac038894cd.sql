-- Drop existing policies that allow NULL workspace_id to show everywhere
DROP POLICY IF EXISTS "Staff can view workspace leads" ON public.leads;
DROP POLICY IF EXISTS "Staff can manage workspace leads" ON public.leads;

-- Create stricter policies: only show leads matching active workspace
-- Leads with NULL workspace_id will only be visible if user has no active workspace
CREATE POLICY "Staff can view workspace leads"
ON public.leads
FOR SELECT
USING (
  is_user_approved(auth.uid()) 
  AND branch_id = get_user_branch_id(auth.uid())
  AND (
    -- If lead has workspace_id, it must match active workspace
    (workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid()))
    OR
    -- If lead has no workspace_id AND user has no active workspace, show it
    (workspace_id IS NULL AND get_active_workspace_id(auth.uid()) IS NULL)
  )
);

CREATE POLICY "Staff can manage workspace leads"
ON public.leads
FOR ALL
USING (
  is_user_approved(auth.uid()) 
  AND branch_id = get_user_branch_id(auth.uid())
  AND (
    (workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid()))
    OR
    (workspace_id IS NULL AND get_active_workspace_id(auth.uid()) IS NULL)
  )
);

-- Same fix for properties
DROP POLICY IF EXISTS "Staff can view workspace properties" ON public.properties;
DROP POLICY IF EXISTS "Staff can manage workspace properties" ON public.properties;

CREATE POLICY "Staff can view workspace properties"
ON public.properties
FOR SELECT
USING (
  is_user_approved(auth.uid()) 
  AND branch_id = get_user_branch_id(auth.uid())
  AND (
    (workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid()))
    OR
    (workspace_id IS NULL AND get_active_workspace_id(auth.uid()) IS NULL)
  )
);

CREATE POLICY "Staff can manage workspace properties"
ON public.properties
FOR ALL
USING (
  is_user_approved(auth.uid()) 
  AND branch_id = get_user_branch_id(auth.uid())
  AND (
    (workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid()))
    OR
    (workspace_id IS NULL AND get_active_workspace_id(auth.uid()) IS NULL)
  )
);

-- Same fix for tasks
DROP POLICY IF EXISTS "Users can view workspace tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can manage workspace tasks" ON public.tasks;

CREATE POLICY "Users can view workspace tasks"
ON public.tasks
FOR SELECT
USING (
  user_id = auth.uid()
  AND (
    (workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid()))
    OR
    (workspace_id IS NULL AND get_active_workspace_id(auth.uid()) IS NULL)
  )
);

CREATE POLICY "Users can manage workspace tasks"
ON public.tasks
FOR ALL
USING (
  user_id = auth.uid()
  AND (
    (workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid()))
    OR
    (workspace_id IS NULL AND get_active_workspace_id(auth.uid()) IS NULL)
  )
);