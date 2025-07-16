-- Create b2b_reservations table
CREATE TABLE IF NOT EXISTS b2b_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id UUID REFERENCES societies(id),
  agency_id UUID REFERENCES agencies(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  vehicles JSONB NOT NULL DEFAULT '[]'::jsonb,
  with_driver BOOLEAN DEFAULT false,
  additional_charges NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create global_revenues table for tracking revenues
CREATE TABLE IF NOT EXISTS global_revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id),
  source TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  date DATE NOT NULL,
  vehicle_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vehicle_revenues table for vehicle-specific revenue tracking
CREATE TABLE IF NOT EXISTS vehicle_revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id),
  vehicle_id UUID REFERENCES vehicles(id),
  source TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  date DATE NOT NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for b2b_reservations
ALTER TABLE b2b_reservations ENABLE ROW LEVEL SECURITY;

-- Create policies for b2b_reservations
CREATE POLICY "Agency members can manage B2B reservations" ON b2b_reservations
FOR ALL USING (agency_id = auth.uid());

-- Enable RLS for global_revenues
ALTER TABLE global_revenues ENABLE ROW LEVEL SECURITY;

-- Create policies for global_revenues
CREATE POLICY "Agency members can manage global revenues" ON global_revenues
FOR ALL USING (agency_id = auth.uid());

-- Enable RLS for vehicle_revenues
ALTER TABLE vehicle_revenues ENABLE ROW LEVEL SECURITY;

-- Create policies for vehicle_revenues
CREATE POLICY "Agency members can manage vehicle revenues" ON vehicle_revenues
FOR ALL USING (agency_id = auth.uid());