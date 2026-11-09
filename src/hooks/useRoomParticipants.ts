import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RoomParticipant {
  id: string;
  room_id: string;
  car_number: string;
  student_name: string;
  is_active: boolean;
  peer_type: string;
  peer_id: string;
  joined_at: string;
}

interface UseRoomParticipantsOptions {
  roomCode: string;
  peerId: string;
  peerName: string;
  peerType: "instructor" | "car";
  carNumber: string;
}

export const useRoomParticipants = ({
  roomCode,
  peerId,
  peerName,
  peerType,
  carNumber,
}: UseRoomParticipantsOptions) => {
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const participantIdRef = useRef<string | null>(null);

  // Register this participant in the database
  const register = useCallback(async () => {
    if (!roomCode || !peerId) return;

    // Deactivate any existing entries for this peer_id
    await supabase
      .from("room_participants")
      .update({ is_active: false })
      .eq("peer_id", peerId);

    // Also deactivate duplicates: same car_number (for cars) or same name (for instructors) in same room
    if (peerType === "car" && carNumber !== "----") {
      await supabase
        .from("room_participants")
        .update({ is_active: false })
        .eq("car_number", carNumber)
        .eq("is_active", true);
    } else if (peerType === "instructor") {
      await supabase
        .from("room_participants")
        .update({ is_active: false })
        .eq("student_name", peerName)
        .eq("peer_type", "instructor")
        .eq("is_active", true);
    }

    // Insert new active entry
    const { data, error } = await supabase
      .from("room_participants")
      .insert({
        room_id: roomCode,
        car_number: carNumber,
        student_name: peerName,
        peer_type: peerType,
        peer_id: peerId,
        is_active: true,
      })
      .select("id")
      .single();

    if (!error && data) {
      participantIdRef.current = data.id;
      console.log("[Participants] Registered ✅:", peerId, "in", roomCode);
    } else {
      console.error("[Participants] Register error:", error);
    }
  }, [roomCode, peerId, peerName, peerType, carNumber]);

  // Unregister on leave
  const unregister = useCallback(async () => {
    if (participantIdRef.current) {
      await supabase
        .from("room_participants")
        .update({ is_active: false })
        .eq("id", participantIdRef.current);
      participantIdRef.current = null;
    }
  }, []);

  // Fetch active participants
  const fetchParticipants = useCallback(async () => {
    if (!roomCode) return;
    const { data } = await supabase
      .from("room_participants")
      .select("*")
      .eq("room_id", roomCode)
      .eq("is_active", true);
    if (data) {
      setParticipants(data as RoomParticipant[]);
    }
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode || !peerId) return;

    register();
    fetchParticipants();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`participants-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_participants",
          filter: `room_id=eq.${roomCode}`,
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    // Heartbeat: keep active every 25s + cleanup stale peers
    const heartbeat = setInterval(async () => {
      if (participantIdRef.current) {
        await supabase
          .from("room_participants")
          .update({ joined_at: new Date().toISOString() })
          .eq("id", participantIdRef.current);
      }
      await supabase.rpc("cleanup_stale_participants");
    }, 25000);

    // Handle page unload
    const handleUnload = () => {
      if (participantIdRef.current) {
        navigator.sendBeacon?.(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/room_participants?id=eq.${participantIdRef.current}`,
          JSON.stringify({ is_active: false })
        );
      }
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      unregister();
      channel.unsubscribe();
      clearInterval(heartbeat);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [roomCode, peerId, register, unregister, fetchParticipants]);

  // Filter out self
  const otherParticipants = participants.filter((p) => p.peer_id !== peerId);

  return {
    participants: otherParticipants,
    allParticipants: participants,
    totalCount: participants.length,
  };
};
