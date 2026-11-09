
-- 1) Drop unused DELETE policy on room_participants (deletions happen via SECURITY DEFINER reset_room_state)
DROP POLICY IF EXISTS "Anyone can leave rooms" ON public.room_participants;

-- 2) Lock instructor record updates to service_role only (uploads now go through edge function)
DROP POLICY IF EXISTS "Only photo_url can be updated" ON public.instructors;

-- 3) Remove unauthenticated INSERT/UPDATE on instructor-photos storage bucket
DROP POLICY IF EXISTS "Anyone can upload instructor photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update instructor photos" ON storage.objects;
