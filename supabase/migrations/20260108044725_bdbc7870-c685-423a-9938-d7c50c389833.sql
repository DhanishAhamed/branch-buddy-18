-- Add new lead statuses to the enum
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'not_interested';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'need_followup';

-- Create call_notes table to track interactions
CREATE TABLE public.call_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  notes TEXT NOT NULL,
  customer_response TEXT,
  followup_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for call_notes
CREATE POLICY "Staff can view branch call notes"
ON public.call_notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads l 
    WHERE l.id = call_notes.lead_id 
    AND l.branch_id = get_user_branch_id(auth.uid())
  )
);

CREATE POLICY "Staff can insert call notes"
ON public.call_notes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all call notes"
ON public.call_notes FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create lead_properties junction table for interested properties
CREATE TABLE public.lead_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lead_id, property_id)
);

-- Enable RLS
ALTER TABLE public.lead_properties ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_properties
CREATE POLICY "Staff can view branch lead properties"
ON public.lead_properties FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads l 
    WHERE l.id = lead_properties.lead_id 
    AND l.branch_id = get_user_branch_id(auth.uid())
  )
);

CREATE POLICY "Staff can manage lead properties"
ON public.lead_properties FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.leads l 
    WHERE l.id = lead_properties.lead_id 
    AND l.branch_id = get_user_branch_id(auth.uid())
  )
);

CREATE POLICY "Admins can manage all lead properties"
ON public.lead_properties FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Add site_visit_time column to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS site_visit_time TIMESTAMP WITH TIME ZONE;

-- Create pipeline_stages table for custom pipelines
CREATE TABLE public.pipeline_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  pipeline TEXT NOT NULL DEFAULT 'ops', -- 'ops' or 'sales'
  color TEXT NOT NULL DEFAULT 'bg-primary/10 text-primary',
  position INTEGER NOT NULL DEFAULT 0,
  is_system BOOLEAN NOT NULL DEFAULT false,
  branch_id UUID REFERENCES public.branches(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view pipeline stages"
ON public.pipeline_stages FOR SELECT
USING (true);

CREATE POLICY "Admins can manage pipeline stages"
ON public.pipeline_stages FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Insert default pipeline stages
INSERT INTO public.pipeline_stages (name, label, pipeline, color, position, is_system) VALUES
  ('new', 'New', 'ops', 'bg-blue-500/10 text-blue-600', 0, true),
  ('contacted', 'Contacted', 'ops', 'bg-yellow-500/10 text-yellow-600', 1, true),
  ('qualified', 'Qualified', 'ops', 'bg-purple-500/10 text-purple-600', 2, true),
  ('need_followup', 'Need Followup', 'sales', 'bg-amber-500/10 text-amber-600', 0, false),
  ('site_visit_scheduled', 'Site Visit Scheduled', 'ops', 'bg-primary/10 text-primary', 3, true),
  ('site_visit_scheduled', 'Site Visit Scheduled', 'sales', 'bg-primary/10 text-primary', 1, true),
  ('negotiating', 'Negotiating', 'sales', 'bg-orange-500/10 text-orange-600', 2, true),
  ('closed_won', 'Won', 'sales', 'bg-green-500/10 text-green-600', 3, true),
  ('closed_lost', 'Lost', 'sales', 'bg-destructive/10 text-destructive', 4, true),
  ('not_interested', 'Not Interested', 'sales', 'bg-muted text-muted-foreground', 5, false);