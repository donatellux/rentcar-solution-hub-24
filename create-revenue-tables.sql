-- Create global_revenues table
CREATE TABLE public.global_revenues (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  source text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  description text,
  date date NOT NULL,
  vehicle_ids jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT global_revenues_pkey PRIMARY KEY (id),
  CONSTRAINT global_revenues_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id)
);

-- Create vehicle_revenues table
CREATE TABLE public.vehicle_revenues (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  vehicle_id uuid NOT NULL,
  source text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  description text,
  date date NOT NULL,
  start_date date,
  end_date date,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vehicle_revenues_pkey PRIMARY KEY (id),
  CONSTRAINT vehicle_revenues_agency_id_fkey FOREIGN KEY (agency_id) REFERENCES public.agencies(id),
  CONSTRAINT vehicle_revenues_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id)
);

-- Enable RLS on global_revenues
ALTER TABLE public.global_revenues ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for global_revenues
CREATE POLICY "Agency can manage their own global revenues" ON public.global_revenues
FOR ALL USING (
  agency_id IN (
    SELECT id FROM public.agencies WHERE id = auth.uid()
  )
);

-- Enable RLS on vehicle_revenues  
ALTER TABLE public.vehicle_revenues ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for vehicle_revenues
CREATE POLICY "Agency can manage their own vehicle revenues" ON public.vehicle_revenues
FOR ALL USING (
  agency_id IN (
    SELECT id FROM public.agencies WHERE id = auth.uid()
  )
);