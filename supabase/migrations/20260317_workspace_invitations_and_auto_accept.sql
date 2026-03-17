-- ============================================================
-- Migration: Workspace Invitations & Auto-Accept on Google Sign-In
-- Purpose: Grant access to new users via invitation whitelist
-- ============================================================

-- 1. Create workspace_invitations table
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email         text NOT NULL,
  role          text NOT NULL DEFAULT 'member',
  app_role      text,  -- optional: set global user_roles entry (e.g. 'admin')
  invited_by    uuid REFERENCES auth.users(id),
  accepted_at   timestamptz,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(workspace_id, email)
);

-- 2. Enable RLS
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own invitation
CREATE POLICY "read_own_invitation"
  ON public.workspace_invitations FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Allow admins to insert invitations
CREATE POLICY "admin_insert_invitation"
  ON public.workspace_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_workspaces
      WHERE user_id = auth.uid()
        AND workspace_id = workspace_invitations.workspace_id
        AND role IN ('owner', 'admin')
    )
  );

-- Allow admins to update invitations (e.g. change role)
CREATE POLICY "admin_update_invitation"
  ON public.workspace_invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_workspaces
      WHERE user_id = auth.uid()
        AND workspace_id = workspace_invitations.workspace_id
        AND role IN ('owner', 'admin')
    )
  );

-- 3. Update handle_new_user() to auto-accept invitations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv RECORD;
BEGIN
  -- Insert/update profile for new user
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at = now();

  -- Auto-assign admin role for primary admin email
  IF NEW.email = 'fahimcholakkal.official@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
  END IF;

  -- Auto-accept pending workspace invitations
  FOR _inv IN
    SELECT workspace_id, role, app_role
    FROM public.workspace_invitations
    WHERE email = NEW.email
      AND accepted_at IS NULL
  LOOP
    -- Add to workspace
    INSERT INTO public.user_workspaces (user_id, workspace_id, role, is_active)
    VALUES (NEW.id, _inv.workspace_id, _inv.role, true)
    ON CONFLICT (user_id, workspace_id) DO UPDATE
      SET role = EXCLUDED.role, is_active = true;

    -- Set global app role if specified (e.g. 'admin')
    IF _inv.app_role IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, _inv.app_role::app_role)
      ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;
    END IF;

    -- Mark invitation as accepted
    UPDATE public.workspace_invitations
    SET accepted_at = now()
    WHERE workspace_id = _inv.workspace_id
      AND email = NEW.email;
  END LOOP;

  RETURN NEW;
END;
$$;

-- 4. Re-create the trigger (ensure it uses the updated function)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Insert invitations for the two users
-- Room4Calicut workspace ID: 2e5fd4d3-d9c9-4fe6-a4cc-2fb363af0f0e

INSERT INTO public.workspace_invitations (workspace_id, email, role, app_role)
VALUES
  ('2e5fd4d3-d9c9-4fe6-a4cc-2fb363af0f0e', 'grandtrillionrealty@gmail.com', 'admin', 'admin'),
  ('2e5fd4d3-d9c9-4fe6-a4cc-2fb363af0f0e', 'jaleelsjallu@gmail.com', 'member', NULL)
ON CONFLICT (workspace_id, email) DO UPDATE SET
  role = EXCLUDED.role,
  app_role = EXCLUDED.app_role;
