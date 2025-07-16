-- Create societies table for B2B clients
CREATE TABLE societies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  society_name TEXT NOT NULL,
  rib TEXT,
  iban TEXT, 
  ice TEXT,
  rc TEXT,
  address TEXT,
  contact_person TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add B2B columns to reservations table
ALTER TABLE reservations ADD COLUMN is_b2b BOOLEAN DEFAULT false;
ALTER TABLE reservations ADD COLUMN society_id UUID REFERENCES societies(id) ON DELETE SET NULL;
ALTER TABLE reservations ADD COLUMN with_driver BOOLEAN DEFAULT false;
ALTER TABLE reservations ADD COLUMN number_of_cars INTEGER DEFAULT 1;
ALTER TABLE reservations ADD COLUMN additional_charges NUMERIC DEFAULT 0;

-- Enable Row Level Security for societies table
ALTER TABLE societies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for societies
CREATE POLICY "select_own_societies" ON societies
FOR SELECT USING (agency_id = auth.uid());

CREATE POLICY "insert_own_societies" ON societies  
FOR INSERT WITH CHECK (agency_id = auth.uid());

CREATE POLICY "update_own_societies" ON societies
FOR UPDATE USING (agency_id = auth.uid());

CREATE POLICY "delete_own_societies" ON societies
FOR DELETE USING (agency_id = auth.uid());