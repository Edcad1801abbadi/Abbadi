-- Drop overly-permissive public policies
DROP POLICY IF EXISTS "Anyone can read schedules" ON public.student_schedules;
DROP POLICY IF EXISTS "Anyone can upload schedules" ON public.student_schedules;
DROP POLICY IF EXISTS "Anyone can update schedules" ON public.student_schedules;
DROP POLICY IF EXISTS "Anyone can clear schedules" ON public.student_schedules;

-- Revoke anon access; grant only to authenticated + service_role
REVOKE ALL ON public.student_schedules FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_schedules TO authenticated;
GRANT ALL ON public.student_schedules TO service_role;

-- Authenticated-only policies
CREATE POLICY "Authenticated can read schedules"
  ON public.student_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert schedules"
  ON public.student_schedules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update schedules"
  ON public.student_schedules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete schedules"
  ON public.student_schedules FOR DELETE
  TO authenticated
  USING (true);