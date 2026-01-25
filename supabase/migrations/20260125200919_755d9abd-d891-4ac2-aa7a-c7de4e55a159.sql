-- Create workspaces table (replaces single branch_id concept with multi-workspace support)
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user_workspaces junction table for multi-workspace membership
CREATE TABLE public.user_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT false,
  role text NOT NULL DEFAULT 'member',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, workspace_id)
);

-- Enable RLS on new tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workspaces ENABLE ROW LEVEL SECURITY;

-- Workspaces policies
CREATE POLICY "Users can view their workspaces"
  ON public.workspaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_workspaces uw
      WHERE uw.workspace_id = workspaces.id AND uw.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all workspaces"
  ON public.workspaces FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- User workspaces policies
CREATE POLICY "Users can view their workspace memberships"
  ON public.user_workspaces FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their active workspace"
  ON public.user_workspaces FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all workspace memberships"
  ON public.user_workspaces FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Insert the two initial workspaces
INSERT INTO public.workspaces (name, slug) VALUES 
  ('Room4Calicut', 'room4calicut'),
  ('Spacecraft', 'spacecraft');

-- Create function to get user's active workspace
CREATE OR REPLACE FUNCTION public.get_active_workspace_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM public.user_workspaces
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1
$$;

-- Create function to set active workspace
CREATE OR REPLACE FUNCTION public.set_active_workspace(_user_id uuid, _workspace_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First, deactivate all workspaces for this user
  UPDATE public.user_workspaces 
  SET is_active = false 
  WHERE user_id = _user_id;
  
  -- Then activate the selected workspace
  UPDATE public.user_workspaces 
  SET is_active = true 
  WHERE user_id = _user_id AND workspace_id = _workspace_id;
END;
$$;