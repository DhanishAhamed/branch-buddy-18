-- Enable PostGIS extension for geospatial data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create enum types
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
CREATE TYPE public.pipeline_access AS ENUM ('sales', 'ops', 'both');
CREATE TYPE public.property_status AS ENUM ('available', 'under_offer', 'sold', 'rented', 'off_market');
CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'qualified', 'site_visit_scheduled', 'negotiating', 'closed_won', 'closed_lost');
CREATE TYPE public.portal_type AS ENUM ('commercial', 'residential', 'rentals');

-- Branches table (multi-city support)
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles as per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'staff',
  UNIQUE (user_id, role)
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  branch_id UUID REFERENCES public.branches(id),
  is_approved BOOLEAN NOT NULL DEFAULT false,
  can_view_owners BOOLEAN NOT NULL DEFAULT false,
  pipeline_access pipeline_access NOT NULL DEFAULT 'both',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Property types (master data)
CREATE TABLE public.property_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  portal_type portal_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Properties table with PostGIS
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id) NOT NULL,
  property_type_id UUID REFERENCES public.property_types(id),
  title TEXT NOT NULL,
  description TEXT,
  address TEXT,
  location GEOMETRY(Point, 4326),
  price DECIMAL(15,2),
  area_sqft DECIMAL(10,2),
  bedrooms INTEGER,
  bathrooms INTEGER,
  owner_details JSONB DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  status property_status NOT NULL DEFAULT 'available',
  portal_type portal_type,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id) NOT NULL,
  property_id UUID REFERENCES public.properties(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  source TEXT DEFAULT 'portal',
  status lead_status NOT NULL DEFAULT 'new',
  pipeline TEXT DEFAULT 'ops',
  assigned_to UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks/Schedule table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id),
  property_id UUID REFERENCES public.properties(id),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WhatsApp templates
CREATE TABLE public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id),
  name TEXT NOT NULL,
  template TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's branch_id
CREATE OR REPLACE FUNCTION public.get_user_branch_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id FROM public.profiles WHERE user_id = _user_id
$$;

-- Function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_approved, false) FROM public.profiles WHERE user_id = _user_id
$$;

-- RLS Policies for branches
CREATE POLICY "Anyone can view branches" ON public.branches FOR SELECT USING (true);
CREATE POLICY "Admins can manage branches" ON public.branches FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for property_types
CREATE POLICY "Anyone can view property types" ON public.property_types FOR SELECT USING (true);
CREATE POLICY "Admins can manage property types" ON public.property_types FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for properties
CREATE POLICY "Public can view available properties" ON public.properties 
  FOR SELECT USING (status = 'available');
CREATE POLICY "Staff can view branch properties" ON public.properties 
  FOR SELECT USING (
    public.is_user_approved(auth.uid()) AND 
    branch_id = public.get_user_branch_id(auth.uid())
  );
CREATE POLICY "Admins can view all properties" ON public.properties 
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can manage branch properties" ON public.properties 
  FOR ALL USING (
    public.is_user_approved(auth.uid()) AND 
    branch_id = public.get_user_branch_id(auth.uid())
  );
CREATE POLICY "Admins can manage all properties" ON public.properties 
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for leads
CREATE POLICY "Staff can view branch leads" ON public.leads 
  FOR SELECT USING (
    public.is_user_approved(auth.uid()) AND 
    branch_id = public.get_user_branch_id(auth.uid())
  );
CREATE POLICY "Admins can view all leads" ON public.leads 
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can manage branch leads" ON public.leads 
  FOR ALL USING (
    public.is_user_approved(auth.uid()) AND 
    branch_id = public.get_user_branch_id(auth.uid())
  );
CREATE POLICY "Admins can manage all leads" ON public.leads 
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can insert leads" ON public.leads 
  FOR INSERT WITH CHECK (true);

-- RLS Policies for tasks
CREATE POLICY "Users can view own tasks" ON public.tasks 
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can manage own tasks" ON public.tasks 
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins can view all tasks" ON public.tasks 
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for whatsapp_templates
CREATE POLICY "Staff can view branch templates" ON public.whatsapp_templates 
  FOR SELECT USING (
    branch_id IS NULL OR 
    branch_id = public.get_user_branch_id(auth.uid())
  );
CREATE POLICY "Admins can manage templates" ON public.whatsapp_templates 
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default property types
INSERT INTO public.property_types (name, portal_type) VALUES
  ('Luxury Villa', 'residential'),
  ('Apartment', 'residential'),
  ('Independent House', 'residential'),
  ('Mens Hostel', 'rentals'),
  ('Womens Hostel', 'rentals'),
  ('PG Accommodation', 'rentals'),
  ('Office Space', 'commercial'),
  ('Retail Shop', 'commercial'),
  ('Warehouse', 'commercial'),
  ('Co-working Space', 'commercial');

-- Insert default branches
INSERT INTO public.branches (name, city) VALUES
  ('Calicut', 'Calicut'),
  ('Kochi', 'Kochi');