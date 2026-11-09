-- Add peer_type and peer_name columns for better tracking
ALTER TABLE public.room_participants ADD COLUMN IF NOT EXISTS peer_type text NOT NULL DEFAULT 'car';
ALTER TABLE public.room_participants ADD COLUMN IF NOT EXISTS peer_id text NOT NULL DEFAULT '';

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;