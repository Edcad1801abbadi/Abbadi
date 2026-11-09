-- Function to clean up stale participants (no heartbeat for 60+ seconds)
CREATE OR REPLACE FUNCTION public.cleanup_stale_participants()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned integer;
BEGIN
  UPDATE public.room_participants
  SET is_active = false
  WHERE is_active = true
    AND joined_at < (now() - interval '60 seconds');
  GET DIAGNOSTICS cleaned = ROW_COUNT;
  RETURN cleaned;
END;
$$;