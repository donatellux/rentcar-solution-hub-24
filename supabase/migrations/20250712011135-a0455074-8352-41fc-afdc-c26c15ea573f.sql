
-- First, let's check if there are any existing policies and drop them if needed
DROP POLICY IF EXISTS "Users can view their own agency" ON public.agencies;
DROP POLICY IF EXISTS "Users can update their own agency" ON public.agencies;
DROP POLICY IF EXISTS "Users can insert their own agency" ON public.agencies;

DROP POLICY IF EXISTS "Users can view their agency vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can insert vehicles for their agency" ON public.vehicles;
DROP POLICY IF EXISTS "Users can update their agency vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can delete their agency vehicles" ON public.vehicles;

-- Recreate agencies policies with proper authentication checks
CREATE POLICY "Users can view their own agency" ON public.agencies
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own agency" ON public.agencies
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own agency" ON public.agencies
  FOR INSERT WITH CHECK (auth.uid() = id AND auth.uid() IS NOT NULL);

-- Recreate vehicles policies with proper authentication checks
CREATE POLICY "Users can view their agency vehicles" ON public.vehicles
  FOR SELECT USING (agency_id = auth.uid() AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert vehicles for their agency" ON public.vehicles
  FOR INSERT WITH CHECK (agency_id = auth.uid() AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their agency vehicles" ON public.vehicles
  FOR UPDATE USING (agency_id = auth.uid() AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their agency vehicles" ON public.vehicles
  FOR DELETE USING (agency_id = auth.uid() AND auth.uid() IS NOT NULL);

-- Also update policies for other tables to ensure consistency
DROP POLICY IF EXISTS "Users can view their agency clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert clients for their agency" ON public.clients;
DROP POLICY IF EXISTS "Users can update their agency clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their agency clients" ON public.clients;

CREATE POLICY "Users can view their agency clients" ON public.clients
  FOR SELECT USING (agency_id = auth.uid() AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert clients for their agency" ON public.clients
  FOR INSERT WITH CHECK (agency_id = auth.uid() AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their agency clients" ON public.clients
  FOR UPDATE USING (agency_id = auth.uid() AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their agency clients" ON public.clients
  FOR DELETE USING (agency_id = auth.uid() AND auth.uid() IS NOT NULL);
