ALTER TABLE public.room_participants ADD COLUMN IF NOT EXISTS call_id text;
ALTER TABLE public.room_participants ADD COLUMN IF NOT EXISTS assigned_instructor_peer_id text;