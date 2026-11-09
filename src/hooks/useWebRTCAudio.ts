import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type SignalPayload =
  | { type: "offer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; from: string; to: string; candidate: RTCIceCandidateInit };

interface UseWebRTCAudioOptions {
  /** Unique call channel ID, e.g. "Tower2:1098" */
  callId: string;
  selfId: string;
  peerId: string;
  iceServers: RTCIceServer[];
  /** "sender" = instructor (has mic), "receiver" = car (no mic, receive only) */
  mode: "sender" | "receiver";
  /** Optional: only accept signals from this peer (security filter) */
  allowedPeerId?: string;
}

export function useWebRTCAudio({ callId, selfId, peerId, iceServers, mode, allowedPeerId }: UseWebRTCAudioOptions) {
  const [status, setStatus] = useState<"idle" | "ready" | "calling" | "connected" | "failed">("idle");
  const [micEnabled, setMicEnabled] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const selfIdRef = useRef(selfId);
  const peerIdRef = useRef(peerId);

  useEffect(() => { selfIdRef.current = selfId; }, [selfId]);
  useEffect(() => { peerIdRef.current = peerId; }, [peerId]);

  const send = useCallback((msg: SignalPayload) => {
    const ch = channelRef.current;
    if (!ch) { console.warn("[Audio] No channel to send"); return; }
    ch.send({ type: "broadcast", event: "signal", payload: msg });
  }, []);

  const flushPendingIce = useCallback(async (pc: RTCPeerConnection) => {
    const pending = [...pendingIceRef.current];
    pendingIceRef.current = [];
    if (pending.length > 0) {
      console.log(`[Audio] Flushing ${pending.length} queued ICE candidates`);
    }
    for (const c of pending) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) {
        console.warn("[Audio] addIceCandidate flush error:", e);
      }
    }
  }, []);

  const ensurePC = useCallback(() => {
    if (pcRef.current && pcRef.current.connectionState !== "closed") return pcRef.current;

    console.log("[Audio] Creating RTCPeerConnection, mode:", mode, "ICE servers:", iceServers.length);
    const pc = new RTCPeerConnection({ iceServers, iceCandidatePoolSize: 4 });

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      console.log("[Audio] connectionState:", s);
      if (s === "connected") setStatus("connected");
      if (s === "failed" || s === "disconnected") setStatus("failed");
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[Audio] iceConnectionState:", pc.iceConnectionState);
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        send({ type: "ice", from: selfIdRef.current, to: peerIdRef.current, candidate: e.candidate.toJSON() });
      }
    };

    pc.ontrack = (e) => {
      console.log("[Audio] ontrack ✅:", e.track.kind, "readyState:", e.track.readyState);
      e.streams[0]?.getTracks().forEach((t) => {
        const existing = remoteStreamRef.current.getTracks().find(et => et.id === t.id);
        if (!existing) {
          remoteStreamRef.current.addTrack(t);
          console.log("[Audio] Added remote track:", t.kind, t.id);
        }
      });
    };

    // For receiver mode: add recvonly transceiver so remote peer knows we want audio
    if (mode === "receiver") {
      pc.addTransceiver("audio", { direction: "recvonly" });
      console.log("[Audio] Added recvonly transceiver");
    }

    pcRef.current = pc;
    return pc;
  }, [iceServers, send, mode]);

  /** Sender only: acquire mic and add tracks */
  const initMic = useCallback(async () => {
    if (mode === "receiver") {
      console.log("[Audio] Receiver mode - skipping mic init, setting ready");
      ensurePC();
      setStatus("ready");
      return;
    }
    try {
      console.log("[Audio] Requesting microphone (sender)...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000, sampleSize: 16, channelCount: 1 },
        video: false,
      });
      localStreamRef.current = stream;

      const pc = ensurePC();
      stream.getTracks().forEach((t) => {
        t.enabled = false; // muted by default
        pc.addTrack(t, stream);
        console.log("[Audio] Added local track:", t.kind, "enabled:", t.enabled);
      });

      setStatus("ready");
      console.log("[Audio] Mic ready ✅");
    } catch (err) {
      console.error("[Audio] Mic access denied:", err);
      setStatus("failed");
    }
  }, [ensurePC, mode]);

  const enableMic = useCallback((enabled: boolean) => {
    if (mode === "receiver") return;
    setMicEnabled(enabled);
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = enabled;
      console.log("[Audio] Mic track.enabled =", enabled);
    });
  }, [mode]);

  const callPeer = useCallback(async () => {
    const pc = ensurePC();
    setStatus("calling");

    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
      await pc.setLocalDescription(offer);
      console.log("[Audio] Sent offer ✅ to:", peerIdRef.current, "callId:", callId);
      send({ type: "offer", from: selfIdRef.current, to: peerIdRef.current, sdp: offer });
    } catch (err) {
      console.error("[Audio] Call failed:", err);
      setStatus("failed");
    }
  }, [ensurePC, send, callId]);

  const hangup = useCallback(() => {
    console.log("[Audio] Hanging up, callId:", callId);
    enableMic(false);

    const pc = pcRef.current;
    pcRef.current = null;
    try {
      pc?.getSenders().forEach((s) => s.track?.stop());
      pc?.close();
    } catch { }

    try {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch { }

    localStreamRef.current = null;
    remoteStreamRef.current = new MediaStream();
    pendingIceRef.current = [];
    setStatus("idle");
    setMicEnabled(false);
  }, [enableMic, callId]);

  // Subscribe to signaling channel scoped by callId
  useEffect(() => {
    if (!callId || !selfId || !peerId) return;

    const channelName = `webrtc:${callId}`;
    console.log("[Audio] Subscribing to channel:", channelName, "as:", selfId, "mode:", mode);
    const ch = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = ch;

    ch.on("broadcast", { event: "signal" }, async ({ payload }) => {
      const msg = payload as SignalPayload;
      // Security: only accept messages addressed to us
      if (msg.to !== selfIdRef.current) return;
      // Security: only accept from allowed peer
      if (allowedPeerId && msg.from !== allowedPeerId) {
        console.warn("[Audio] Rejected signal from unauthorized peer:", msg.from);
        return;
      }

      const pc = ensurePC();

      try {
        if (msg.type === "offer") {
          console.log("[Audio] Got offer ✅ from:", msg.from);
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          await flushPendingIce(pc);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log("[Audio] Sent answer ✅ to:", msg.from);
          send({ type: "answer", from: selfIdRef.current, to: msg.from, sdp: answer });
        }

        if (msg.type === "answer") {
          console.log("[Audio] Got answer ✅ from:", msg.from);
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          await flushPendingIce(pc);
        }

        if (msg.type === "ice") {
          if (!pc.remoteDescription) {
            console.log("[Audio] Queuing ICE (no remote desc yet)");
            pendingIceRef.current.push(msg.candidate);
            return;
          }
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        }
      } catch (e) {
        console.error("[Audio] Signal handling error:", e);
      }
    });

    ch.subscribe((s) => {
      console.log("[Audio] Channel status:", s);
    });

    return () => {
      console.log("[Audio] Removing channel:", channelName);
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [callId, selfId, peerId, mode, allowedPeerId, ensurePC, send, flushPendingIce]);

  return {
    status,
    micEnabled,
    remoteStream: remoteStreamRef.current,
    initMic,
    enableMic,
    callPeer,
    hangup,
  };
}
