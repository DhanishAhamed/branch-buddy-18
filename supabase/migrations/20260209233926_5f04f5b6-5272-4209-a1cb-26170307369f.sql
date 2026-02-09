-- Create lead_status_log table to track all status changes
CREATE TABLE public.lead_status_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_status_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view status logs"
ON public.lead_status_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Staff can view logs for their branch leads
CREATE POLICY "Staff can view branch status logs"
ON public.lead_status_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM leads l
    WHERE l.id = lead_status_log.lead_id
    AND l.branch_id = get_user_branch_id(auth.uid())
  )
);

-- Authenticated users can insert logs
CREATE POLICY "Users can insert status logs"
ON public.lead_status_log FOR INSERT
WITH CHECK (auth.uid() = changed_by);

-- Index for faster lookups
CREATE INDEX idx_lead_status_log_lead_id ON public.lead_status_log(lead_id);
