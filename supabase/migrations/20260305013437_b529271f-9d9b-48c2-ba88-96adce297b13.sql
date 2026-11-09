-- Drop foreign key constraint and change room_id to text for presence tracking
ALTER TABLE public.room_participants DROP CONSTRAINT IF EXISTS room_participants_room_id_fkey;
ALTER TABLE public.room_participants ALTER COLUMN room_id TYPE text USING room_id::text;

-- Clean up old stale data
DELETE FROM public.room_participants WHERE is_active = false;