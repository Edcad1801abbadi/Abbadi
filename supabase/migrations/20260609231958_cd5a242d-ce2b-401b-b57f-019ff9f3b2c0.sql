REVOKE EXECUTE ON FUNCTION public.reset_room_state() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_room_state() TO service_role;