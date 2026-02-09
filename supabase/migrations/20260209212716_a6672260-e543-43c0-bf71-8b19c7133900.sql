
-- Add lead preference columns
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS interested_places text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS property_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS customer_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS bhk_options text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS budget_min numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS budget_max numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS furnishing text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS enquiry_date date DEFAULT NULL,
ADD COLUMN IF NOT EXISTS expected_purchase_date date DEFAULT NULL;
