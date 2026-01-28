-- Create lead_settings table for branch-level feature toggles
CREATE TABLE public.lead_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  show_temperature_indicator boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(branch_id)
);

-- Enable RLS
ALTER TABLE public.lead_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage lead settings"
ON public.lead_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view lead settings"
ON public.lead_settings FOR SELECT
USING (
  branch_id IS NULL OR branch_id = get_user_branch_id(auth.uid())
);

-- Create trigger for updated_at
CREATE TRIGGER update_lead_settings_updated_at
BEFORE UPDATE ON public.lead_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();