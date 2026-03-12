
-- 1. Seed default workspace
INSERT INTO workspaces (id, name, slug)
SELECT 'a0eeeeee-0000-0000-0000-000000000001'::uuid, 'Room4Calicut', 'room4calicut'
WHERE NOT EXISTS (SELECT 1 FROM workspaces LIMIT 1);

-- 2. Seed default branch
INSERT INTO branches (id, name, city)
SELECT 'b0eeeeee-0000-0000-0000-000000000001'::uuid, 'Calicut HQ', 'Calicut'
WHERE NOT EXISTS (SELECT 1 FROM branches LIMIT 1);

-- 3. Seed default pipeline stages if empty
INSERT INTO pipeline_stages (name, label, pipeline, color, position, is_system)
SELECT * FROM (VALUES
  ('new', 'New', 'ops', 'bg-blue-500/10 text-blue-600', 0, true),
  ('contacted', 'Contacted', 'ops', 'bg-yellow-500/10 text-yellow-600', 1, true),
  ('qualified', 'Qualified', 'ops', 'bg-purple-500/10 text-purple-600', 2, true),
  ('site_visit_scheduled', 'Site Visit', 'ops', 'bg-green-500/10 text-green-600', 3, true),
  ('negotiating', 'Negotiation', 'sales', 'bg-orange-500/10 text-orange-600', 4, true),
  ('closed_won', 'Won', 'sales', 'bg-emerald-500/10 text-emerald-600', 5, true),
  ('closed_lost', 'Lost', 'sales', 'bg-red-500/10 text-red-600', 6, true)
) AS v(name, label, pipeline, color, position, is_system)
WHERE NOT EXISTS (SELECT 1 FROM pipeline_stages LIMIT 1);

-- 4. Auto-provision admin trigger function
CREATE OR REPLACE FUNCTION public.auto_provision_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _branch_id uuid;
  _ws_id uuid;
BEGIN
  IF NEW.email = 'fahimcholakkal.official@gmail.com' THEN
    SELECT id INTO _branch_id FROM branches LIMIT 1;

    NEW.is_approved := true;
    NEW.can_view_owners := true;
    NEW.can_edit_properties := true;
    NEW.pipeline_access := 'both';
    NEW.full_name := COALESCE(NEW.full_name, 'Fahim Cholakkal');

    IF _branch_id IS NOT NULL THEN
      NEW.branch_id := _branch_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = NEW.user_id AND role = 'admin') THEN
      INSERT INTO user_roles (user_id, role) VALUES (NEW.user_id, 'admin');
    END IF;

    FOR _ws_id IN SELECT id FROM workspaces LOOP
      IF NOT EXISTS (SELECT 1 FROM user_workspaces WHERE user_id = NEW.user_id AND workspace_id = _ws_id) THEN
        INSERT INTO user_workspaces (user_id, workspace_id, role, is_active)
        VALUES (NEW.user_id, _ws_id, 'admin', true);
      END IF;
    END LOOP;

    RAISE LOG 'Admin provisioned for user_id: %', NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Attach trigger
DROP TRIGGER IF EXISTS trg_auto_provision_admin ON profiles;
CREATE TRIGGER trg_auto_provision_admin
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_provision_admin();
