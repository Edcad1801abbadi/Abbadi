CREATE TABLE public.student_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_number text NOT NULL,
  student_name text NOT NULL,
  session_number int,
  start_time text,
  end_time text,
  schedule_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.student_schedules TO anon, authenticated;
GRANT ALL ON public.student_schedules TO service_role;
ALTER TABLE public.student_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read schedules" ON public.student_schedules FOR SELECT USING (true);
CREATE POLICY "Anyone can upload schedules" ON public.student_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can clear schedules" ON public.student_schedules FOR DELETE USING (true);
CREATE INDEX idx_student_schedules_car_date ON public.student_schedules(car_number, schedule_date);