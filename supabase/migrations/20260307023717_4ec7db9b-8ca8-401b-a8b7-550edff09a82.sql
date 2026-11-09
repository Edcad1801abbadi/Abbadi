CREATE POLICY "Anyone can update instructor photo_url"
ON public.instructors FOR UPDATE
USING (true)
WITH CHECK (true);