import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playJoinSound, playLeaveSound } from "@/hooks/useNotificationSounds";
import {
  FALLBACK_ICE_SERVERS,
  fetchTurnCredentials as fetchTurnCredentialsFromEdge,
} from "@/lib/turnCredentials";

export interface PeerInfo {
  peerId: string;
  type: "instructor" | "car";
  name: string;
  carNumber?: string;
}

interface UseWebRTCOptions {
  roomCode: string;
  peerId: string;
  peerMeta?: { type: "instructor" | "car"; name: string; carNumber?: string };
}

const FALLBACK_RTC_CONFIG: RTCConfiguration = {
  iceServers: FALLBACK_ICE_SERVERS,
  iceCandidatePoolSize: 10,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};

const fetchTurnCredentials = async (): Promise<RTCConfiguration> => {
  const result = await fetchTurnCredentialsFromEdge();

  if (result.usedFallback) {
    console.warn("[WebRTC] TURN fetch failed, using STUN fallback:", result.errorMessage);
  } else {
    console.log("[WebRTC] Got TURN credentials:", result.iceServers.length, "servers");
  }

  return {
    iceServers: result.iceServers,
    iceCandidatePoolSize: 10,
    bundlePolicy: "max-bundle" as RTCBundlePolicy,
    rtcpMuxPolicy: "require" as RTCRtcpMuxPolicy,
  };
};

// Global audio unlock - call on first user interaction
let audioUnlocked = false;
const audioContextRef: { current: AudioContext | null } = { current: null };

export const unlockAudio = () => {
  if (audioUnlocked) return;
  audioUnlocked = true;
  console.log("[WebRTC] Unlocking audio via user interaction");
  
  try {
    const ctx = new AudioContext();
    audioContextRef.current = ctx;
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    ctx.resume().catch(() => {});
  } catch (e) {
    console.warn("[WebRTC] Audio unlock failed:", e);
  }
  
  // Also try to play all pending remote audio elements
  pendingAudioElements.forEach((audio) => {
    if (audio.paused && audio.srcObject) {
      audio.play().catch(() => {});
    }
  });
};

// Track audio elements that failed autoplay for retry
const pendingAudioElements: Set<HTMLAudioElement> = new Set();

export const useWebRTC = ({ roomCode, peerId, peerMeta }: UseWebRTCOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [connectedPeers, setConnectedPeers] = useState<PeerInfo[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [connectionType, setConnectionType] = useState<"stun" | "turn" | "host" | "unknown">("unknown");
  const [incomingPrivateCall, setIncomingPrivateCall] = useState<{ from: string; callerName: string } | null>(null);
  const [privatePeerId, setPrivatePeerId] = useState<string | null>(null);
  const privatePeerIdRef = useRef<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    privatePeerIdRef.current = privatePeerId;
  }, [privatePeerId]);

  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const peerMetaRef = useRef<Map<string, PeerInfo>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const micAcquiredRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const remoteAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rtcConfigRef = useRef<RTCConfiguration>(FALLBACK_RTC_CONFIG);
  // ICE candidate queue per peer - buffer candidates until remoteDescription is set
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  // Apply selective mute when privatePeerId changes
  useEffect(() => {
    remoteAudiosRef.current.forEach((audio, remotePeerId) => {
      if (privatePeerId) {
        audio.muted = remotePeerId !== privatePeerId;
      } else {
        audio.muted = false;
      }
    });
  }, [privatePeerId]);

  // Audio level monitoring
  const startAudioLevelMonitoring = useCallback((stream: MediaStream) => {
    audioCtxRef.current?.close();
    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;
      setAudioLevel(Math.min(avg / 80, 1));
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const getMicrophone = useCallback(async () => {
    if (localStreamRef.current && micAcquiredRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        sampleSize: 16,
        channelCount: 1,
      },
      video: false,
    });
    stream.getAudioTracks().forEach((t) => (t.enabled = false));
    localStreamRef.current = stream;
    micAcquiredRef.current = true;
    startAudioLevelMonitoring(stream);
    console.log("[WebRTC] Mic acquired ✅, tracks:", stream.getAudioTracks().length);
    return stream;
  }, [startAudioLevelMonitoring]);

  const tryPlayAudio = useCallback((audio: HTMLAudioElement) => {
    audio.play().then(() => {
      console.log("[WebRTC] Audio playing ✅");
      pendingAudioElements.delete(audio);
    }).catch((err) => {
      console.warn("[WebRTC] Audio play blocked, queued for user interaction:", err.message);
      pendingAudioElements.add(audio);
    });
  }, []);

  // Flush queued ICE candidates after remoteDescription is set
  const flushPendingIce = useCallback(async (remotePeerId: string, pc: RTCPeerConnection) => {
    const pending = pendingIceCandidatesRef.current.get(remotePeerId);
    if (!pending || pending.length === 0) return;
    console.log(`[WebRTC] Flushing ${pending.length} queued ICE candidates for:`, remotePeerId);
    pendingIceCandidatesRef.current.delete(remotePeerId);
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn("[WebRTC] Flush ICE failed:", e);
      }
    }
  }, []);

  const createPeerConnection = useCallback(
    (remotePeerId: string, stream: MediaStream) => {
      // If we already have a connection, return it
      const existing = peersRef.current.get(remotePeerId);
      if (existing && existing.connectionState !== "closed" && existing.connectionState !== "failed") {
        return existing;
      }

      console.log("[WebRTC] Creating new PeerConnection for:", remotePeerId);
      const pc = new RTCPeerConnection(rtcConfigRef.current);
      
      // Add local tracks
      stream.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, stream);
        console.log("[WebRTC] Added local track:", track.kind, "enabled:", track.enabled);
        const params = sender.getParameters();
        if (params.encodings && params.encodings.length > 0) {
          params.encodings[0].maxBitrate = 64000;
          params.encodings[0].priority = "high";
          params.encodings[0].networkPriority = "high";
          sender.setParameters(params).catch(() => {});
        }
      });

      pc.ontrack = (event) => {
        console.log("[WebRTC] ontrack ✅ from:", remotePeerId, "kind:", event.track.kind);
        const [remoteStream] = event.streams;
        let audio = remoteAudiosRef.current.get(remotePeerId);
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          audio.volume = 1.0;
          (audio as any).playsInline = true;
          remoteAudiosRef.current.set(remotePeerId, audio);
        }
        audio.srcObject = remoteStream;
        
        const currentPrivate = privatePeerIdRef.current;
        if (currentPrivate) {
          audio.muted = remotePeerId !== currentPrivate;
        }
        
        tryPlayAudio(audio);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "ice-candidate",
            payload: { from: peerId, to: remotePeerId, candidate: event.candidate.toJSON() },
          });
        }
      };

      pc.onicegatheringstatechange = () => {
        console.log("[WebRTC] ICE gathering state:", pc.iceGatheringState, "for:", remotePeerId);
      };

      pc.oniceconnectionstatechange = () => {
        console.log("[WebRTC] ICE connection state:", pc.iceConnectionState, "for:", remotePeerId);
      };

      pc.onconnectionstatechange = () => {
        console.log("[WebRTC] Connection state:", pc.connectionState, "for:", remotePeerId);
        if (pc.connectionState === "connected") {
          pc.getStats().then((stats) => {
            stats.forEach((report) => {
              if (report.type === "candidate-pair" && report.state === "succeeded") {
                const localCandidate = stats.get(report.localCandidateId);
                if (localCandidate) {
                  const candidateType = localCandidate.candidateType;
                  if (candidateType === "relay") setConnectionType("turn");
                  else if (candidateType === "srflx") setConnectionType("stun");
                  else if (candidateType === "host") setConnectionType("host");
                  console.log("[WebRTC] Connection type:", candidateType);
                }
              }
            });
          });
          setConnectedPeers((prev) => {
            if (prev.some(p => p.peerId === remotePeerId)) return prev;
            playJoinSound();
            const meta = peerMetaRef.current.get(remotePeerId);
            return [...prev, meta || { peerId: remotePeerId, type: "instructor", name: remotePeerId }];
          });
        } else if (pc.connectionState === "failed") {
          console.log("[WebRTC] Connection failed, attempting ICE restart for:", remotePeerId);
          pc.restartIce();
        } else if (["disconnected", "closed"].includes(pc.connectionState)) {
          setConnectedPeers((prev) => prev.filter((p) => p.peerId !== remotePeerId));
        }
      };

      peersRef.current.set(remotePeerId, pc);
      return pc;
    },
    [peerId, tryPlayAudio]
  );

  // Helper to initiate WebRTC offer to a remote peer
  const initiateConnection = useCallback(
    async (remotePeerId: string, remoteMeta: PeerInfo, stream: MediaStream) => {
      if (remotePeerId === peerId) return;
      
      // Check for existing healthy connection
      const existing = peersRef.current.get(remotePeerId);
      if (existing && existing.connectionState !== "closed" && existing.connectionState !== "failed") {
        console.log("[WebRTC] Already have connection to:", remotePeerId, "state:", existing.connectionState);
        return;
      }
      
      console.log("[WebRTC] Initiating connection to:", remotePeerId, remoteMeta);
      
      peerMetaRef.current.set(remotePeerId, remoteMeta);
      const pc = createPeerConnection(remotePeerId, stream);
      
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        });
        await pc.setLocalDescription(offer);
        console.log("[WebRTC] Sending offer to:", remotePeerId);
        channelRef.current?.send({
          type: "broadcast",
          event: "offer",
          payload: { from: peerId, to: remotePeerId, sdp: pc.localDescription?.toJSON() },
        });
      } catch (err) {
        console.error("[WebRTC] Failed to create/send offer:", err);
      }
    },
    [peerId, createPeerConnection]
  );

  useEffect(() => {
    if (!roomCode || !peerId) return;
    let mounted = true;
    let presenceInterval: ReturnType<typeof setInterval> | null = null;

    const init = async () => {
      try {
        rtcConfigRef.current = await fetchTurnCredentials();
      } catch (error) {
        console.error("[WebRTC] TURN init failed, using fallback RTC config:", error);
        rtcConfigRef.current = FALLBACK_RTC_CONFIG;
      }

      let stream: MediaStream;
      try {
        stream = await getMicrophone();
      } catch (err) {
        console.error("[WebRTC] Microphone access denied:", err);
        return;
      }
      if (!mounted) return;

      const channelName = `room-${roomCode}`;
      console.log("[WebRTC] Joining channel:", channelName, "as", peerId);

      const channel = supabase.channel(channelName, {
        config: { broadcast: { self: false }, presence: { key: peerId } },
      });
      channelRef.current = channel;

      // === BROADCAST: WebRTC Signaling ===
      channel.on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (payload.to !== peerId) return;
        console.log("[WebRTC] Received offer from:", payload.from);
        
        try {
          const pc = createPeerConnection(payload.from, stream);
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          console.log("[WebRTC] Set remote description (offer) ✅");
          
          // Flush any ICE candidates that arrived before the offer
          await flushPendingIce(payload.from, pc);
          
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log("[WebRTC] Sending answer to:", payload.from);
          channel.send({
            type: "broadcast",
            event: "answer",
            payload: { from: peerId, to: payload.from, sdp: pc.localDescription?.toJSON() },
          });
        } catch (err) {
          console.error("[WebRTC] Error handling offer:", err);
        }
      });

      channel.on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (payload.to !== peerId) return;
        console.log("[WebRTC] Received answer from:", payload.from);
        
        try {
          const pc = peersRef.current.get(payload.from);
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            console.log("[WebRTC] Set remote description (answer) ✅");
            // Flush any ICE candidates that arrived before the answer
            await flushPendingIce(payload.from, pc);
          } else {
            console.warn("[WebRTC] No PC found for answer from:", payload.from);
          }
        } catch (err) {
          console.error("[WebRTC] Error handling answer:", err);
        }
      });

      channel.on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        if (payload.to !== peerId) return;
        
        const pc = peersRef.current.get(payload.from);
        if (pc && payload.candidate) {
          // Queue ICE candidates if remoteDescription isn't set yet
          if (!pc.remoteDescription) {
            console.log("[WebRTC] Queuing ICE candidate (no remote desc yet) from:", payload.from);
            const queue = pendingIceCandidatesRef.current.get(payload.from) || [];
            queue.push(payload.candidate);
            pendingIceCandidatesRef.current.set(payload.from, queue);
            return;
          }
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {
            console.warn("[WebRTC] addIceCandidate error:", e);
          }
        } else if (payload.candidate) {
          // PC doesn't exist yet, queue the candidate
          console.log("[WebRTC] Queuing ICE candidate (no PC yet) from:", payload.from);
          const queue = pendingIceCandidatesRef.current.get(payload.from) || [];
          queue.push(payload.candidate);
          pendingIceCandidatesRef.current.set(payload.from, queue);
        }
      });

      channel.on("broadcast", { event: "ptt-status" }, ({ payload }) => {
        if (payload.peerId === peerId) return;
        setCurrentSpeaker(payload.talking ? payload.name : null);
      });

      channel.on("broadcast", { event: "private-call-request" }, ({ payload }) => {
        if (payload.to !== peerId) return;
        console.log("[WebRTC] Incoming private call from:", payload.callerName);
        setIncomingPrivateCall({ from: payload.from, callerName: payload.callerName });
        setTimeout(() => setIncomingPrivateCall(null), 10000);
      });

      channel.on("broadcast", { event: "private-call-end" }, ({ payload }) => {
        if (payload.to !== peerId) return;
        setIncomingPrivateCall(null);
        setPrivatePeerId(prev => prev === payload.from ? null : prev);
      });

      // === BROADCAST-BASED PEER DISCOVERY (more reliable than presence) ===
      channel.on("broadcast", { event: "peer-announce" }, ({ payload }) => {
        if (payload.peerId === peerId || !mounted) return;
        console.log("[Discovery] Received announce from:", payload.peerId, payload.type, payload.name);
        
        const remoteMeta: PeerInfo = {
          peerId: payload.peerId,
          type: payload.type || "instructor",
          name: payload.name || payload.peerId,
          carNumber: payload.carNumber,
        };
        peerMetaRef.current.set(payload.peerId, remoteMeta);
        
        // Check if we already have a healthy connection
        const existingPc = peersRef.current.get(payload.peerId);
        if (existingPc && existingPc.connectionState !== "closed" && existingPc.connectionState !== "failed") {
          return;
        }
        
        // Use peerId comparison to decide who initiates
        if (peerId < payload.peerId) {
          console.log("[Discovery] Initiating connection to announced peer:", payload.peerId);
          initiateConnection(payload.peerId, remoteMeta, stream);
        }
      });

      // === PRESENCE: Peer Discovery (kept as secondary mechanism) ===
      channel.on("presence", { event: "join" }, ({ key, newPresences }) => {
        if (key === peerId || !mounted) return;
        console.log("[Presence] Peer joined:", key, newPresences);
        
        const presence = newPresences[0];
        if (presence) {
          const remoteMeta: PeerInfo = {
            peerId: key,
            type: presence.type || "instructor",
            name: presence.name || key,
            carNumber: presence.carNumber,
          };
          peerMetaRef.current.set(key, remoteMeta);
          
          if (peerId < key) {
            initiateConnection(key, remoteMeta, stream);
          }
        }
      });

      channel.on("presence", { event: "leave" }, ({ key }) => {
        if (key === peerId) return;
        console.log("[Presence] Peer left:", key);
        
        const pc = peersRef.current.get(key);
        if (pc) { pc.close(); peersRef.current.delete(key); }
        peerMetaRef.current.delete(key);
        pendingIceCandidatesRef.current.delete(key);
        remoteAudiosRef.current.get(key)?.remove();
        remoteAudiosRef.current.delete(key);
        setConnectedPeers((prev) => {
          const newPeers = prev.filter((p) => p.peerId !== key);
          if (newPeers.length < prev.length) playLeaveSound();
          return newPeers;
        });
        setPrivatePeerId(prev => prev === key ? null : prev);
      });

      channel.on("presence", { event: "sync" }, () => {
        if (!mounted) return;
        const state = channel.presenceState();
        console.log("[Presence] Sync - current state:", Object.keys(state));
        
        for (const [key, presences] of Object.entries(state)) {
          if (key === peerId) continue;
          
          const existingPc = peersRef.current.get(key);
          if (existingPc && existingPc.connectionState !== "closed" && existingPc.connectionState !== "failed") {
            continue;
          }
          
          const presence = (presences as any[])[0];
          if (presence) {
            const remoteMeta: PeerInfo = {
              peerId: key,
              type: presence.type || "instructor",
              name: presence.name || key,
              carNumber: presence.carNumber,
            };
            peerMetaRef.current.set(key, remoteMeta);
            
            if (peerId < key) {
              initiateConnection(key, remoteMeta, stream);
            }
          }
        }
      });

      // Announce self periodically via broadcast (reliable fallback for presence)
      const announceself = () => {
        if (!mounted || !channelRef.current) return;
        channelRef.current.send({
          type: "broadcast",
          event: "peer-announce",
          payload: {
            peerId,
            type: peerMeta?.type || "instructor",
            name: peerMeta?.name || peerId,
            carNumber: peerMeta?.carNumber || undefined,
          },
        });
      };

      // Subscribe and track presence
      channel.subscribe(async (status) => {
        console.log("[WebRTC] Channel status:", status);
        if (status === "SUBSCRIBED" && mounted) {
          setIsConnected(true);
          
          await channel.track({
            type: peerMeta?.type || "instructor",
            name: peerMeta?.name || peerId,
            carNumber: peerMeta?.carNumber || undefined,
            online_at: new Date().toISOString(),
          });
          console.log("[Presence] Tracked self:", peerId);
          
          // Announce self immediately and periodically
          setTimeout(announceself, 1000);
          setTimeout(announceself, 3000);
          setTimeout(announceself, 6000);
          presenceInterval = setInterval(announceself, 10000);
        }
      });
    };

    init().catch((error) => {
      console.error("[WebRTC] Unhandled initialization error:", error);
      rtcConfigRef.current = FALLBACK_RTC_CONFIG;
      setIsConnected(false);
    });

    return () => {
      mounted = false;
      if (presenceInterval) clearInterval(presenceInterval);
      channelRef.current?.untrack();
      channelRef.current?.unsubscribe();
      channelRef.current = null;
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      peerMetaRef.current.clear();
      pendingIceCandidatesRef.current.clear();
      remoteAudiosRef.current.forEach((a) => a.remove());
      remoteAudiosRef.current.clear();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      setIsConnected(false);
      setConnectedPeers([]);
    };
  }, [roomCode, peerId, peerMeta, getMicrophone, createPeerConnection, initiateConnection, flushPendingIce]);

  // Cleanup mic only on full unmount
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      micAcquiredRef.current = false;
    };
  }, []);

  const startTalking = useCallback(
    (name: string, options?: { broadcastAudio?: boolean }) => {
      const enableBroadcast = options?.broadcastAudio !== false;
      unlockAudio();
      // Retry playing any blocked remote audio
      remoteAudiosRef.current.forEach((audio) => {
        if (audio.paused && audio.srcObject) {
          audio.play().catch(() => {});
        }
      });
      
      if (enableBroadcast) {
        localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = true));
        console.log(`[AudioRoute] 📡 Mesh tracks ENABLED - broadcasting to ${peersRef.current.size} peers`);
      } else {
        console.log(`[AudioRoute] 🔒 Mesh tracks KEPT DISABLED - private mode, ${peersRef.current.size} peers muted`);
      }
      setIsTalking(true);
      setCurrentSpeaker(name);
      channelRef.current?.send({
        type: "broadcast",
        event: "ptt-status",
        payload: { peerId, name, talking: true, privateTo: privatePeerIdRef.current || null },
      });
    },
    [peerId]
  );

  const stopTalking = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = false));
    console.log(`[AudioRoute] 🔇 Mesh tracks DISABLED - stop talking`);
    setIsTalking(false);
    setCurrentSpeaker(null);
    channelRef.current?.send({
      type: "broadcast",
      event: "ptt-status",
      payload: { peerId, name: "", talking: false },
    });
  }, [peerId]);

  const startPrivateMode = useCallback(
    (targetPeerId: string, callerName: string) => {
      console.log("[WebRTC] Starting private mode with:", targetPeerId);
      setPrivatePeerId(targetPeerId);
      channelRef.current?.send({
        type: "broadcast",
        event: "private-call-request",
        payload: { from: peerId, to: targetPeerId, callerName },
      });
    },
    [peerId]
  );

  const endPrivateMode = useCallback(
    () => {
      if (privatePeerId) {
        channelRef.current?.send({
          type: "broadcast",
          event: "private-call-end",
          payload: { from: peerId, to: privatePeerId },
        });
      }
      console.log("[WebRTC] Ending private mode");
      setPrivatePeerId(null);
    },
    [peerId, privatePeerId]
  );

  return {
    isConnected,
    isTalking,
    currentSpeaker,
    connectedPeers,
    audioLevel,
    connectionType,
    incomingPrivateCall,
    privatePeerId,
    startTalking,
    stopTalking,
    startPrivateMode,
    endPrivateMode,
    setPrivatePeerId,
  };
};
