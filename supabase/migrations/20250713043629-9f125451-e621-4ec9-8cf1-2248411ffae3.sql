
-- First, let's check and update the storage policies for clientlicences bucket
-- Delete existing restrictive policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete files" ON storage.objects;

-- Create more permissive policies for the clientlicences bucket
CREATE POLICY "Allow authenticated upload to clientlicences" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'clientlicences' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Allow authenticated select from clientlicences" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'clientlicences' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Allow authenticated update to clientlicences" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'clientlicences' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Allow authenticated delete from clientlicences" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'clientlicences' 
    AND auth.uid() IS NOT NULL
  );

-- Make sure the bucket allows uploads
UPDATE storage.buckets 
SET public = true 
WHERE id = 'clientlicences';
