
ALTER TABLE public.student_schedules
  ADD COLUMN IF NOT EXISTS tower text,
  ADD COLUMN IF NOT EXISTS md_rating smallint,
  ADD COLUMN IF NOT EXISTS wk_rating smallint,
  ADD COLUMN IF NOT EXISTS remark text,
  ADD COLUMN IF NOT EXISTS signature_url text,
  ADD COLUMN IF NOT EXISTS attendance text DEFAULT 'present',
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}'::text[];

-- Allow updating rows so the app can save ratings/remarks/signature/attendance from the card
DROP POLICY IF EXISTS "Anyone can update schedules" ON public.student_schedules;
CREATE POLICY "Anyone can update schedules"
  ON public.student_schedules
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

GRANT UPDATE ON public.student_schedules TO anon, authenticated;
