-- Drop the old overly permissive policies
DROP POLICY IF EXISTS "Allow authenticated uploads to procurement docs" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from procurement docs" ON storage.objects;

-- Create secure policies scoped to the proposal

-- 1. Insert (Uploads): Only the startup who owns the proposal or the officer evaluating it can upload.
-- Because storage.objects doesn't have a direct proposal_id (it's in the path or we join via proposal_documents), 
-- wait, we actually log to proposal_documents. The easiest secure way for storage is checking if the user owns the challenge or is the startup.
-- In our schema, storage path is `auxiliary/${fileName}` where fileName starts with `proposal_id/`.
-- E.g. `auxiliary/123-456/...`
-- We can parse the proposal_id from the path: (string_to_array(name, '/'))[2]
-- Let's write a secure policy:

CREATE POLICY "Allow scoped uploads to procurement docs"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'procurement-documents' 
  AND auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.procurement_proposals pp
      WHERE pp.id::text = (string_to_array(name, '/'))[2]
      AND pp.startup_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.procurement_proposals pp
      JOIN public.challenges c ON pp.challenge_id = c.id
      WHERE pp.id::text = (string_to_array(name, '/'))[2]
      AND c.department_id = auth.uid()
    )
  )
);

CREATE POLICY "Allow scoped reads from procurement docs"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'procurement-documents'
  AND (
    EXISTS (
      SELECT 1 FROM public.procurement_proposals pp
      WHERE pp.id::text = (string_to_array(name, '/'))[2]
      AND pp.startup_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.procurement_proposals pp
      JOIN public.challenges c ON pp.challenge_id = c.id
      WHERE pp.id::text = (string_to_array(name, '/'))[2]
      AND c.department_id = auth.uid()
    )
  )
);
