
-- Vehicles table
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  car_number TEXT NOT NULL UNIQUE,
  box_number TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('auto', 'manual')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vehicles are viewable by everyone"
ON public.vehicles FOR SELECT
USING (true);

-- Instructors table
CREATE TABLE public.instructors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  serial_number INT NOT NULL UNIQUE,
  employee_id INT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT 'Trainer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Instructors are viewable by everyone"
ON public.instructors FOR SELECT
USING (true);

-- Rooms table
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  instructor_name TEXT NOT NULL,
  instructor_employee_id INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rooms are viewable by everyone"
ON public.rooms FOR SELECT
USING (true);

CREATE POLICY "Anyone can create rooms"
ON public.rooms FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update rooms"
ON public.rooms FOR UPDATE
USING (true);

-- Room participants (students in rooms)
CREATE TABLE public.room_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  car_number TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants are viewable by everyone"
ON public.room_participants FOR SELECT
USING (true);

CREATE POLICY "Anyone can join rooms"
ON public.room_participants FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update participation"
ON public.room_participants FOR UPDATE
USING (true);

CREATE POLICY "Anyone can leave rooms"
ON public.room_participants FOR DELETE
USING (true);

-- Updated_at trigger for rooms
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_rooms_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
