-- Explicit deny policies on instructors (defense in depth; default deny already applies)
CREATE POLICY "Deny public insert on instructors"
  ON public.instructors FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "Deny public update on instructors"
  ON public.instructors FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny public delete on instructors"
  ON public.instructors FOR DELETE TO anon, authenticated USING (false);

-- Lock down writes on instructor-photos bucket via storage.objects RLS
CREATE POLICY "Deny public insert on instructor-photos"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (false);
CREATE POLICY "Deny public update on instructor-photos"
  ON storage.objects FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);
CREATE POLICY "Deny public delete on instructor-photos"
  ON storage.objects FOR DELETE TO anon, authenticated
  USING (false);
