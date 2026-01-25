-- Assign both users to both workspaces
INSERT INTO public.user_workspaces (user_id, workspace_id, role, is_active)
VALUES 
  -- Dhanish - Room4Calicut (active)
  ('fecb32c2-305b-4e93-9457-05cf0d84b7f6', '2e5fd4d3-d9c9-4fe6-a4cc-2fb363af0f0e', 'admin', true),
  -- Dhanish - Spacecraft
  ('fecb32c2-305b-4e93-9457-05cf0d84b7f6', 'e584747d-6ba8-490a-807b-552b2850ef9d', 'admin', false),
  -- Fahim - Room4Calicut (active)
  ('cfc874f6-c9e3-4d50-8599-7bc0ab193211', '2e5fd4d3-d9c9-4fe6-a4cc-2fb363af0f0e', 'admin', true),
  -- Fahim - Spacecraft
  ('cfc874f6-c9e3-4d50-8599-7bc0ab193211', 'e584747d-6ba8-490a-807b-552b2850ef9d', 'admin', false)
ON CONFLICT (user_id, workspace_id) DO UPDATE SET role = 'admin';

-- Ensure both users have admin role in user_roles table
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('fecb32c2-305b-4e93-9457-05cf0d84b7f6', 'admin'),
  ('cfc874f6-c9e3-4d50-8599-7bc0ab193211', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Add unique constraint if not exists for user_workspaces
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_workspaces_user_workspace_unique'
  ) THEN
    ALTER TABLE public.user_workspaces ADD CONSTRAINT user_workspaces_user_workspace_unique UNIQUE (user_id, workspace_id);
  END IF;
END $$;