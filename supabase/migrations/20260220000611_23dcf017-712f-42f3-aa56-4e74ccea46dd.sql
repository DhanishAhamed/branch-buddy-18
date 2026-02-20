
-- Contact folders
CREATE TABLE public.contact_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'bg-primary/10',
  workspace_id UUID REFERENCES public.workspaces(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Contact entries
CREATE TABLE public.contact_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID NOT NULL REFERENCES public.contact_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  source_type TEXT, -- 'lead', 'customer', 'owner', 'manual'
  source_id TEXT, -- lead_id, customer_id, or owner phone
  workspace_id UUID REFERENCES public.workspaces(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_entries ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for folders
CREATE POLICY "Admins can manage contact folders"
ON public.contact_folders FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND (
    (workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid()))
    OR (workspace_id IS NULL)
  )
);

-- Admin-only policies for entries
CREATE POLICY "Admins can manage contact entries"
ON public.contact_entries FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND (
    (workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid()))
    OR (workspace_id IS NULL)
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_contact_folders_updated_at
BEFORE UPDATE ON public.contact_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contact_entries_updated_at
BEFORE UPDATE ON public.contact_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
