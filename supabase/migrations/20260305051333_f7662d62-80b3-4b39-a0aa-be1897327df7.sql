
-- Update cleanup function to use 35 second threshold
CREATE OR REPLACE FUNCTION public.cleanup_stale_participants()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  cleaned integer;
BEGIN
  UPDATE public.room_participants
  SET is_active = false
  WHERE is_active = true
    AND joined_at < (now() - interval '35 seconds');
  GET DIAGNOSTICS cleaned = ROW_COUNT;
  RETURN cleaned;
END;
$function$;

-- Create reset_room_state RPC
CREATE OR REPLACE FUNCTION public.reset_room_state()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.room_participants;
END;
$function$;
