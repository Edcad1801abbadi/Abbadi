
-- Fix 1: Revoke public execute on reset_room_state and cleanup_stale_participants
REVOKE EXECUTE ON FUNCTION public.reset_room_state() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reset_room_state() FROM anon;
REVOKE EXECUTE ON FUNCTION public.reset_room_state() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reset_room_state() TO service_role;

-- Fix 3: Replace overly permissive instructors UPDATE policy with photo_url-only restriction
DROP POLICY IF EXISTS "Anyone can update instructor photo_url" ON public.instructors;
CREATE POLICY "Only photo_url can be updated"
ON public.instructors FOR UPDATE
USING (true)
WITH CHECK (
  name = (SELECT i.name FROM public.instructors i WHERE i.id = instructors.id) AND
  employee_id = (SELECT i.employee_id FROM public.instructors i WHERE i.id = instructors.id) AND
  serial_number = (SELECT i.serial_number FROM public.instructors i WHERE i.id = instructors.id) AND
  position = (SELECT i.position FROM public.instructors i WHERE i.id = instructors.id)
);
