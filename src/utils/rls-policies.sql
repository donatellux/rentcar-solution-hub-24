
-- Enable RLS on all tables and create policies for agency-based access

-- Agencies table policies
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agency" ON public.agencies
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own agency" ON public.agencies
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own agency" ON public.agencies
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Vehicles table policies
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their agency vehicles" ON public.vehicles
  FOR SELECT USING (agency_id = auth.uid());

CREATE POLICY "Users can insert vehicles for their agency" ON public.vehicles
  FOR INSERT WITH CHECK (agency_id = auth.uid());

CREATE POLICY "Users can update their agency vehicles" ON public.vehicles
  FOR UPDATE USING (agency_id = auth.uid());

CREATE POLICY "Users can delete their agency vehicles" ON public.vehicles
  FOR DELETE USING (agency_id = auth.uid());

-- Clients table policies
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their agency clients" ON public.clients
  FOR SELECT USING (agency_id = auth.uid());

CREATE POLICY "Users can insert clients for their agency" ON public.clients
  FOR INSERT WITH CHECK (agency_id = auth.uid());

CREATE POLICY "Users can update their agency clients" ON public.clients
  FOR UPDATE USING (agency_id = auth.uid());

CREATE POLICY "Users can delete their agency clients" ON public.clients
  FOR DELETE USING (agency_id = auth.uid());

-- Reservations table policies
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their agency reservations" ON public.reservations
  FOR SELECT USING (agency_id = auth.uid());

CREATE POLICY "Users can insert reservations for their agency" ON public.reservations
  FOR INSERT WITH CHECK (agency_id = auth.uid());

CREATE POLICY "Users can update their agency reservations" ON public.reservations
  FOR UPDATE USING (agency_id = auth.uid());

CREATE POLICY "Users can delete their agency reservations" ON public.reservations
  FOR DELETE USING (agency_id = auth.uid());

-- Entretiens table policies
ALTER TABLE public.entretiens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their agency entretiens" ON public.entretiens
  FOR SELECT USING (agency_id = auth.uid());

CREATE POLICY "Users can insert entretiens for their agency" ON public.entretiens
  FOR INSERT WITH CHECK (agency_id = auth.uid());

CREATE POLICY "Users can update their agency entretiens" ON public.entretiens
  FOR UPDATE USING (agency_id = auth.uid());

CREATE POLICY "Users can delete their agency entretiens" ON public.entretiens
  FOR DELETE USING (agency_id = auth.uid());

-- Vehicle expenses table policies
ALTER TABLE public.vehicle_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their agency vehicle expenses" ON public.vehicle_expenses
  FOR SELECT USING (agency_id = auth.uid());

CREATE POLICY "Users can insert vehicle expenses for their agency" ON public.vehicle_expenses
  FOR INSERT WITH CHECK (agency_id = auth.uid());

CREATE POLICY "Users can update their agency vehicle expenses" ON public.vehicle_expenses
  FOR UPDATE USING (agency_id = auth.uid());

CREATE POLICY "Users can delete their agency vehicle expenses" ON public.vehicle_expenses
  FOR DELETE USING (agency_id = auth.uid());

-- Global expenses table policies
ALTER TABLE public.global_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their agency global expenses" ON public.global_expenses
  FOR SELECT USING (agency_id = auth.uid());

CREATE POLICY "Users can insert global expenses for their agency" ON public.global_expenses
  FOR INSERT WITH CHECK (agency_id = auth.uid());

CREATE POLICY "Users can update their agency global expenses" ON public.global_expenses
  FOR UPDATE USING (agency_id = auth.uid());

CREATE POLICY "Users can delete their agency global expenses" ON public.global_expenses
  FOR DELETE USING (agency_id = auth.uid());

-- Documents table policies
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their agency documents" ON public.documents
  FOR SELECT USING (agency_id = auth.uid());

CREATE POLICY "Users can insert documents for their agency" ON public.documents
  FOR INSERT WITH CHECK (agency_id = auth.uid());

CREATE POLICY "Users can update their agency documents" ON public.documents
  FOR UPDATE USING (agency_id = auth.uid());

CREATE POLICY "Users can delete their agency documents" ON public.documents
  FOR DELETE USING (agency_id = auth.uid());

-- Rapports table policies
ALTER TABLE public.rapports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their agency rapports" ON public.rapports
  FOR SELECT USING (agency_id = auth.uid());

CREATE POLICY "Users can insert rapports for their agency" ON public.rapports
  FOR INSERT WITH CHECK (agency_id = auth.uid());

CREATE POLICY "Users can update their agency rapports" ON public.rapports
  FOR UPDATE USING (agency_id = auth.uid());

CREATE POLICY "Users can delete their agency rapports" ON public.rapports
  FOR DELETE USING (agency_id = auth.uid());
