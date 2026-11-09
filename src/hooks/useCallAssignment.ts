import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseCallAssignmentOptions {
  roomCode: string;
  peerId: string;
  peerType: "instructor" | "car";
  carNumber: string;
}

interface CallAssignment {
  callId: string;
  instructorPeerId: string;
  carPeerId: string;
}

/**
 * Manages call_id and assigned_instructor_peer_id on room_participants.
 * - Instructor: can assign themselves to a car (creates callId)
 * - Car: watches own row for assignment changes
 */
export function useCallAssignment({ roomCode, peerId, peerType, carNumber }: UseCallAssignmentOptions) {
  const [assignment, setAssignment] = useState<CallAssignment | null>(null);
  const prevCallIdRef = useRef<string | null>(null);

  /** Instructor calls this to assign themselves to a car */
  const assignTocar = useCallback(async (targetCarNumber: string, targetCarPeerId: string) => {
    const callId = `${roomCode}:${targetCarNumber}`;
    console.log("[CallAssign] Instructor assigning to car:", targetCarNumber, "callId:", callId);

    // Update the car's row with assignment
    const { error } = await supabase
      .from("room_participants")
      .update({
        call_id: callId,
        assigned_instructor_peer_id: peerId,
      })
      .eq("peer_id", targetCarPeerId)
      .eq("room_id", roomCode)
      .eq("is_active", true);

    if (error) {
      console.error("[CallAssign] Assignment error:", error);
      return null;
    }

    const newAssignment: CallAssignment = {
      callId,
      instructorPeerId: peerId,
      carPeerId: targetCarPeerId,
    };
    setAssignment(newAssignment);
    console.log("[CallAssign] Assignment set ✅:", newAssignment);
    return newAssignment;
  }, [roomCode, peerId]);

  /** Instructor clears current assignment */
  const clearAssignment = useCallback(async () => {
    if (!assignment) return;
    console.log("[CallAssign] Clearing assignment for car:", assignment.carPeerId);

    await supabase
      .from("room_participants")
      .update({ call_id: null, assigned_instructor_peer_id: null })
      .eq("peer_id", assignment.carPeerId)
      .eq("room_id", roomCode)
      .eq("is_active", true);

    setAssignment(null);
  }, [assignment, roomCode]);

  // Car: watch own row for assignment changes via realtime
  useEffect(() => {
    if (peerType !== "car" || !peerId || !roomCode) return;

    // Initial fetch
    const fetchAssignment = async () => {
      const { data } = await supabase
        .from("room_participants")
        .select("call_id, assigned_instructor_peer_id, peer_id")
        .eq("peer_id", peerId)
        .eq("room_id", roomCode)
        .eq("is_active", true)
        .single();

      if (data?.call_id && data?.assigned_instructor_peer_id) {
        const newAssignment: CallAssignment = {
          callId: data.call_id,
          instructorPeerId: data.assigned_instructor_peer_id,
          carPeerId: data.peer_id,
        };
        if (newAssignment.callId !== prevCallIdRef.current) {
          console.log("[CallAssign] Car got assignment ✅:", newAssignment);
          prevCallIdRef.current = newAssignment.callId;
          setAssignment(newAssignment);
        }
      } else {
        if (prevCallIdRef.current) {
          console.log("[CallAssign] Car assignment cleared");
          prevCallIdRef.current = null;
          setAssignment(null);
        }
      }
    };

    fetchAssignment();

    // Listen for changes to own row
    const channel = supabase
      .channel(`call-assign-${peerId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "room_participants",
          filter: `peer_id=eq.${peerId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row.call_id && row.assigned_instructor_peer_id && row.is_active) {
            const newAssignment: CallAssignment = {
              callId: row.call_id,
              instructorPeerId: row.assigned_instructor_peer_id,
              carPeerId: row.peer_id,
            };
            if (newAssignment.callId !== prevCallIdRef.current) {
              console.log("[CallAssign] Car assignment updated ✅:", newAssignment);
              prevCallIdRef.current = newAssignment.callId;
              setAssignment(newAssignment);
            }
          } else {
            if (prevCallIdRef.current) {
              console.log("[CallAssign] Car assignment cleared via update");
              prevCallIdRef.current = null;
              setAssignment(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [peerType, peerId, roomCode]);

  return {
    assignment,
    assignTocar,
    clearAssignment,
  };
}
