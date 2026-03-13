-- Grant dhanish.c123@gmail.com access to both workspaces
-- Looks up the user's ID dynamically from auth.users by email

DO $$
DECLARE
  _user_id uuid;
BEGIN
  -- Get user ID from auth.users
  SELECT id INTO _user_id
  FROM auth.users
  WHERE email = 'dhanish.c123@gmail.com'
  LIMIT 1;

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User dhanish.c123@gmail.com not found in auth.users';
  END IF;

  -- Insert into room4calicut workspace (2e5fd4d3-d9c9-4fe6-a4cc-2fb363af0f0e)
  INSERT INTO public.user_workspaces (user_id, workspace_id, role, is_active)
  VALUES (_user_id, '2e5fd4d3-d9c9-4fe6-a4cc-2fb363af0f0e', 'admin', true)
  ON CONFLICT (user_id, workspace_id) DO UPDATE
    SET role = 'admin', is_active = true;

  -- Insert into spacecraft workspace (e584747d-6ba8-490a-807b-552b2850ef9d)
  INSERT INTO public.user_workspaces (user_id, workspace_id, role, is_active)
  VALUES (_user_id, 'e584747d-6ba8-490a-807b-552b2850ef9d', 'admin', false)
  ON CONFLICT (user_id, workspace_id) DO UPDATE
    SET role = 'admin';

  -- Ensure admin role in user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Successfully granted workspace access to user %', _user_id;
END $$;
