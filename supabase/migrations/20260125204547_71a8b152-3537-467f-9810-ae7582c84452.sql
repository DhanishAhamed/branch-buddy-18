-- Update admin policies to also respect workspace filtering
-- Admins should still only see data from their active workspace

-- LEADS
DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can update leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can delete leads" ON public.leads;

CREATE POLICY "Admins can view workspace leads"
ON public.leads
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND (
    (workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid()))
    OR (workspace_id IS NULL AND get_active_workspace_id(auth.uid()) IS NULL)
  )
);

CREATE POLICY "Admins can update workspace leads"
ON public.leads
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND (
    (workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid()))
    OR (workspace_id IS NULL AND get_active_workspace_id(auth.uid()) IS NULL)
  )
);

CREATE POLICY "Admins can delete workspace leads"
ON public.leads
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND (
    (workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid()))
    OR (workspace_id IS NULL AND get_active_workspace_id(auth.uid()) IS NULL)
  )
);

-- PROPERTIES
DROP POLICY IF EXISTS "Admins can view all properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can update properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can delete properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can insert properties" ON public.properties;

CREATE POLICY "Admins can view workspace properties"
ON public.properties
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND (
    (workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid()))
    OR (workspace_id IS NULL AND get_active_workspace_id(auth.uid()) IS NULL)
  )
);

CREATE POLICY "Admins can insert workspace properties"
ON public.properties
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update workspace properties"
ON public.properties
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND (
    (workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid()))
    OR (workspace_id IS NULL AND get_active_workspace_id(auth.uid()) IS NULL)
  )
);

CREATE POLICY "Admins can delete workspace properties"
ON public.properties
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND (
    (workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid()))
    OR (workspace_id IS NULL AND get_active_workspace_id(auth.uid()) IS NULL)
  )
);

-- TASKS
DROP POLICY IF EXISTS "Admins can view all tasks" ON public.tasks;

CREATE POLICY "Admins can view workspace tasks"
ON public.tasks
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND (
    (workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid()))
    OR (workspace_id IS NULL AND get_active_workspace_id(auth.uid()) IS NULL)
  )
);