-- ============================================================
-- Fix: Grant workspace access to users who already exist in auth.users
-- The handle_new_user trigger only fires on first-ever sign-in.
-- This script handles users who already had an auth.users row.
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Ensure profiles exist for these users
INSERT INTO public.profiles (user_id, email, full_name, avatar_url)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email),
  COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
FROM auth.users u
WHERE u.email IN ('grandtrillionrealty@gmail.com', 'jaleelsjallu@gmail.com')
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
  avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
  updated_at = now();

-- 2. Grant workspace access from pending invitations
INSERT INTO public.user_workspaces (user_id, workspace_id, role, is_active)
SELECT u.id, wi.workspace_id, wi.role, true
FROM auth.users u
JOIN public.workspace_invitations wi ON wi.email = u.email
WHERE u.email IN ('grandtrillionrealty@gmail.com', 'jaleelsjallu@gmail.com')
  AND wi.accepted_at IS NULL
ON CONFLICT (user_id, workspace_id) DO UPDATE
  SET role = EXCLUDED.role, is_active = true;

-- 3. Set global admin role where specified
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, wi.app_role::app_role
FROM auth.users u
JOIN public.workspace_invitations wi ON wi.email = u.email
WHERE u.email IN ('grandtrillionrealty@gmail.com', 'jaleelsjallu@gmail.com')
  AND wi.accepted_at IS NULL
  AND wi.app_role IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

-- 4. Mark invitations as accepted
UPDATE public.workspace_invitations
SET accepted_at = now()
WHERE email IN ('grandtrillionrealty@gmail.com', 'jaleelsjallu@gmail.com')
  AND accepted_at IS NULL
  AND EXISTS (SELECT 1 FROM auth.users WHERE email = workspace_invitations.email);

-- 5. Verify results
SELECT p.email, p.full_name, uw.role, uw.is_active, 'workspace_access' AS check_type
FROM public.user_workspaces uw
JOIN public.profiles p ON p.user_id = uw.user_id
WHERE p.email IN ('grandtrillionrealty@gmail.com', 'jaleelsjallu@gmail.com')
UNION ALL
SELECT wi.email, NULL, wi.role, NULL, 'invitation_status: ' || COALESCE(wi.accepted_at::text, 'PENDING')
FROM public.workspace_invitations wi
WHERE wi.email IN ('grandtrillionrealty@gmail.com', 'jaleelsjallu@gmail.com');
