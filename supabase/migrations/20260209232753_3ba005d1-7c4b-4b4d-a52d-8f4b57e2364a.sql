
-- Fix: Allow staff and admins to see leads with NULL workspace_id (portal enquiries)
-- Drop existing policies that filter by workspace
DROP POLICY IF EXISTS "Admins can view workspace leads" ON public.leads;
DROP POLICY IF EXISTS "Staff can view workspace leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can update workspace leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can delete workspace leads" ON public.leads;
DROP POLICY IF EXISTS "Staff can manage workspace leads" ON public.leads;

-- Recreate policies: include leads where workspace_id matches OR workspace_id IS NULL
CREATE POLICY "Admins can view workspace leads"
ON public.leads FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND (
    (workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid()))
    OR workspace_id IS NULL
  )
);

CREATE POLICY "Admins can update workspace leads"
ON public.leads FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND (
    (workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid()))
    OR workspace_id IS NULL
  )
);

CREATE POLICY "Admins can delete workspace leads"
ON public.leads FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND (
    (workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid()))
    OR workspace_id IS NULL
  )
);

CREATE POLICY "Staff can view workspace leads"
ON public.leads FOR SELECT
USING (
  is_user_approved(auth.uid())
  AND branch_id = get_user_branch_id(auth.uid())
  AND (
    (workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid()))
    OR workspace_id IS NULL
  )
);

CREATE POLICY "Staff can manage workspace leads"
ON public.leads FOR ALL
USING (
  is_user_approved(auth.uid())
  AND branch_id = get_user_branch_id(auth.uid())
  AND (
    (workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid()))
    OR workspace_id IS NULL
  )
);
