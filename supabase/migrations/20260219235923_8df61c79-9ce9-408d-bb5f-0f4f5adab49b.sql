
-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  lead_id UUID REFERENCES public.leads(id),
  workspace_id UUID REFERENCES public.workspaces(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  customer_type TEXT NOT NULL DEFAULT 'buyer', -- buyer, renter
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Customer properties junction table
CREATE TABLE public.customer_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id),
  transaction_type TEXT NOT NULL DEFAULT 'bought', -- bought, rented
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_properties ENABLE ROW LEVEL SECURITY;

-- Customers RLS
CREATE POLICY "Admins can manage workspace customers"
ON public.customers FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND (
    (workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid()))
    OR (workspace_id IS NULL)
  )
);

CREATE POLICY "Staff can view workspace customers"
ON public.customers FOR SELECT
USING (
  is_user_approved(auth.uid())
  AND branch_id = get_user_branch_id(auth.uid())
  AND (
    (workspace_id IS NOT NULL AND workspace_id = get_active_workspace_id(auth.uid()))
    OR (workspace_id IS NULL)
  )
);

CREATE POLICY "Staff can insert workspace customers"
ON public.customers FOR INSERT
WITH CHECK (
  is_user_approved(auth.uid())
  AND branch_id = get_user_branch_id(auth.uid())
);

-- Customer properties RLS
CREATE POLICY "Admins can manage customer properties"
ON public.customer_properties FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Staff can view customer properties"
ON public.customer_properties FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM customers c
    WHERE c.id = customer_properties.customer_id
    AND c.branch_id = get_user_branch_id(auth.uid())
  )
);

CREATE POLICY "Staff can insert customer properties"
ON public.customer_properties FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM customers c
    WHERE c.id = customer_properties.customer_id
    AND c.branch_id = get_user_branch_id(auth.uid())
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
