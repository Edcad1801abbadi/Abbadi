import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MapPin, Clock, Car, LogOut, AlertTriangle,
  Navigation, Users, User, ChevronDown, Phone, Check, Lock, Volume2, Bot,
} from "lucide-react";
import AudioLevelIndicator from "@/components/radio/AudioLevelIndicator";
import { useWebRTC, unlockAudio } from "@/hooks/useWebRTC";
import { supabase } from "@/integrations/supabase/client";
import { useRoomParticipants } from "@/hooks/useRoomParticipants";
import { useCallAssignment } from "@/hooks/useCallAssignment";
import { useWebRTCAudio } from "@/hooks/useWebRTCAudio";
import { playPTTClick, playIncomingCallSound, playEmergencyRingSound } from "@/hooks/useNotificationSounds";
import { TRAINING_AREAS } from "@/constants/trainingAreas";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getDeviceSuffix } from "@/lib/deviceId";
import VoiceAssistant from "@/components/VoiceAssistant";
import EdcLogo from "@/components/EdcLogo";
import { useInstructors } from "@/hooks/useInstructors";
import { isVipByPeerId, isVipByName, VIP_NAME_CLASS, VIP_BORDER_CLASS } from "@/lib/vip";
import {
  FALLBACK_ICE_SERVERS,
  fetchTurnCredentials as fetchTurnCredentialsFromEdge,
} from "@/lib/turnCredentials";

const SCHEDULE = [
  { session: 1, start: "06:10", end: "06:55" },
  { session: 2, start: "07:00", end: "07:45" },
  { session: 3, start: "07:50", end: "08:35" },
  { session: 4, start: "08:40", end: "09:25" },
  { session: 5, start: "09:30", end: "10:15" },
  { session: 6, start: "10:20", end: "11:05" },
  { session: 7, start: "11:10", end: "11:55" },
  { session: 8, start: "12:05", end: "12:50" },
  { session: 9, start: "12:55", end: "13:40" },
  { session: 10, start: "13:45", end: "14:30" },
  { session: 11, start: "14:35", end: "15:20" },
  { session: 12, start: "15:25", end: "16:10" },
  { session: 13, start: "16:15", end: "17:00" },
  { session: 14, start: "17:05", end: "17:50" },
];
const toMinutes = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

const fetchTurnCredentials = () => fetchTurnCredentialsFromEdge();

const StudentCarScreen = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { name = "Student", roomCode = "DEFAULT", carNumber = "1098", boxNumber = "01", vehicleType = "auto" } = location.state || {};

  const [now, setNow] = useState(new Date());
  const [selectedArea, setSelectedArea] = useState<string>(roomCode || TRAINING_AREAS[0]);
  const [areaPickerOpen, setAreaPickerOpen] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [iceServers, setIceServers] = useState<RTCIceServer[]>([]);
  const [turnWarning, setTurnWarning] = useState<string | null>(null);
  const [turnFetchError, setTurnFetchError] = useState<string | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [emergencySent, setEmergencySent] = useState(false);
  const lastInstructorRef = useRef<{ peerId: string; name: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fetch TURN credentials
  useEffect(() => {
    let isMounted = true;

    const loadTurnCredentials = async () => {
      try {
        const result = await fetchTurnCredentials();
        if (!isMounted) return;

        setIceServers(result.iceServers);
        setTurnWarning(result.usedFallback ? result.errorMessage ?? "TURN unavailable" : null);
        setTurnFetchError(null);
      } catch (error) {
        if (!isMounted) return;

        const errorMessage = error instanceof Error ? error.message : "TURN unavailable";
        console.error("[Student] TURN fetch error:", error);
        setTurnFetchError(errorMessage);
        setTurnWarning(errorMessage);
        setIceServers(FALLBACK_ICE_SERVERS);
      }
    };

    void loadTurnCredentials();

    return () => {
      isMounted = false;
    };
  }, []);

  const peerId = useMemo(() => `car-${carNumber}-${getDeviceSuffix()}`, [carNumber]);
  const peerMeta = useMemo(() => ({ type: "car" as const, name: `Car ${carNumber}`, carNumber }), [carNumber]);
  const effectiveIceServers = iceServers.length > 0 ? iceServers : FALLBACK_ICE_SERVERS;
  const webrtc = useWebRTC({ roomCode: selectedArea, peerId, peerMeta });
  const {
    isConnected, isTalking, currentSpeaker, connectedPeers, audioLevel, connectionType,
    incomingPrivateCall, privatePeerId, startTalking, stopTalking, setPrivatePeerId,
  } = webrtc;

  const { data: instructorsList } = useInstructors();

  const { participants: dbParticipants } = useRoomParticipants({
    roomCode: selectedArea, peerId, peerName: `Car ${carNumber}`, peerType: "car", carNumber,
  });

  // Call assignment - car watches for instructor assignment
  const { assignment } = useCallAssignment({
    roomCode: selectedArea, peerId, peerType: "car", carNumber,
  });

  // WebRTC Audio (receiver mode) - active only when assigned by instructor
  const audioHook = useWebRTCAudio({
    callId: assignment?.callId || "",
    selfId: peerId,
    peerId: assignment?.instructorPeerId || "",
    iceServers: effectiveIceServers,
    mode: "receiver",
    allowedPeerId: assignment?.instructorPeerId,
  });

  // Auto-ready when assignment arrives
  const prevAssignmentRef = useRef<string | null>(null);
  useEffect(() => {
    if (assignment && assignment.callId !== prevAssignmentRef.current) {
      prevAssignmentRef.current = assignment.callId;
      console.log("[Car] Got assignment ✅, readying receiver for:", assignment.callId);
      setTimeout(() => {
        audioHook.initMic(); // In receiver mode this just sets ready + creates PC
      }, 300);
    } else if (!assignment && prevAssignmentRef.current) {
      prevAssignmentRef.current = null;
      audioHook.hangup();
    }
  }, [assignment]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bind remote stream to audio element
  useEffect(() => {
    if (audioRef.current && audioHook.remoteStream) {
      audioRef.current.srcObject = audioHook.remoteStream;
      if (audioUnlocked) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [audioHook.remoteStream, audioUnlocked]);

  const handleUnlockAudio = useCallback(async () => {
    unlockAudio();
    if (audioRef.current) {
      try {
        await audioRef.current.play();
      } catch { }
    }
    setAudioUnlocked(true);
    console.log("[Car] Audio unlocked ✅");
  }, []);

  const connectedInstructors = useMemo(() => {
    const webrtcInstIds = new Set(connectedPeers.filter(p => p.type === "instructor").map(p => p.peerId));
    const dbInstructors = dbParticipants.filter(p => p.peer_type === "instructor");
    // Deduplicate by employee_id
    const seen = new Map<string, typeof dbInstructors[0]>();
    for (const p of dbInstructors) {
      const empId = p.peer_id.match(/^instructor-(\d+)/)?.[1] || p.peer_id;
      const existing = seen.get(empId);
      if (!existing || webrtcInstIds.has(p.peer_id)) {
        seen.set(empId, p);
      }
    }
    const list = [...seen.values()].map(p => ({
      peerId: p.peer_id, type: "instructor" as const, name: p.student_name, hasAudio: webrtcInstIds.has(p.peer_id),
    }));
    if (list.length > 0) {
      lastInstructorRef.current = { peerId: list[0].peerId, name: list[0].name };
    }
    return list;
  }, [dbParticipants, connectedPeers]);

  // Also track instructor from assignment
  useEffect(() => {
    if (assignment?.instructorPeerId) {
      lastInstructorRef.current = { peerId: assignment.instructorPeerId, name: "Instructor" };
    }
  }, [assignment]);

  // Emergency call handler
  const handleEmergency = useCallback(() => {
    const targetInstructor = connectedInstructors[0] || lastInstructorRef.current;
    if (!targetInstructor) {
      console.warn("[Car] No instructor available for emergency");
      return;
    }
    console.log("[Car] 🚨 EMERGENCY - calling instructor:", targetInstructor.peerId);
    playEmergencyRingSound();
    setEmergencySent(true);
    // Send on the TARGET instructor's emergency channel so they receive it
    const emergencyChannel = supabase.channel(`emergency-${selectedArea}-${targetInstructor.peerId}`);
    emergencyChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        emergencyChannel.send({
          type: "broadcast",
          event: "emergency-request",
          payload: {
            from: peerId,
            to: targetInstructor.peerId,
            carNumber,
            carName: `Car ${carNumber}`,
          },
        });
        setTimeout(() => supabase.removeChannel(emergencyChannel), 2000);
      }
    });
    // Reset after 10 seconds
    setTimeout(() => setEmergencySent(false), 10000);
  }, [connectedInstructors, peerId, carNumber, selectedArea]);

  const connectedOtherCars = useMemo(() => {
    const webrtcCarIds = new Set(connectedPeers.filter(p => p.type === "car").map(p => p.peerId));
    const dbCars = dbParticipants.filter(p => p.peer_type === "car");
    // Deduplicate by car_number
    const seen = new Map<string, typeof dbCars[0]>();
    for (const p of dbCars) {
      const existing = seen.get(p.car_number);
      if (!existing || webrtcCarIds.has(p.peer_id)) {
        seen.set(p.car_number, p);
      }
    }
    return [...seen.values()].map(p => ({
      peerId: p.peer_id, type: "car" as const, name: p.student_name, carNumber: p.car_number, hasAudio: webrtcCarIds.has(p.peer_id),
    }));
  }, [dbParticipants, connectedPeers]);

  useEffect(() => {
    if (incomingPrivateCall) { playIncomingCallSound(); setPrivatePeerId(incomingPrivateCall.from); }
  }, [incomingPrivateCall, setPrivatePeerId]);

  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);

  const time = useMemo(() => {
    const h = now.getHours().toString().padStart(2, "0");
    const m = now.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  }, [now]);

  const seconds = useMemo(() => now.getSeconds().toString().padStart(2, "0"), [now]);

  const dayName = useMemo(() => {
    const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    return days[now.getDay()];
  }, [now]);

  const monthName = useMemo(() => {
    const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    return months[now.getMonth()];
  }, [now]);

  const RAMADAN_START = new Date(2026, 2, 17);
  const ramadanDay = useMemo(() => {
    const diff = Math.floor((now.getTime() - RAMADAN_START.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diff >= 1 && diff <= 30) return diff;
    return null;
  }, [now]);

  const classInfo = useMemo(() => {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const nowSec = now.getSeconds();
    for (const slot of SCHEDULE) {
      const startMin = toMinutes(slot.start);
      const endMin = toMinutes(slot.end);
      if (nowMin >= startMin && nowMin < endMin) {
        const remainTotal = (endMin - nowMin - 1) * 60 + (59 - nowSec);
        const rm = Math.floor(remainTotal / 60);
        const rs = remainTotal % 60;
        const totalDuration = (endMin - startMin) * 60;
        const elapsed = (nowMin - startMin) * 60 + nowSec;
        const progress = (elapsed / totalDuration) * 100;
        const shift = slot.session <= 7 ? "صباحي" : "مسائي";
        const displayNum = slot.session <= 7 ? slot.session : slot.session - 7;
        return { current: displayNum, remaining: `${rm.toString().padStart(2, "0")}:${rs.toString().padStart(2, "0")}`, label: `Session ${displayNum}`, shift, progress };
      }
      const nextSlot = SCHEDULE[SCHEDULE.indexOf(slot) + 1];
      if (nextSlot) {
        const nextStart = toMinutes(nextSlot.start);
        if (nowMin >= endMin && nowMin < nextStart) {
          const remainTotal = (nextStart - nowMin - 1) * 60 + (59 - nowSec);
          const rm = Math.floor(remainTotal / 60);
          const rs = remainTotal % 60;
          return { current: 0, remaining: `${rm.toString().padStart(2, "0")}:${rs.toString().padStart(2, "0")}`, label: "Break", shift: "", progress: 100 };
        }
      }
    }
    const firstStart = toMinutes(SCHEDULE[0].start);
    if (nowMin < firstStart) return { current: 0, remaining: "—", label: "Before shift", shift: "", progress: 0 };
    return { current: 0, remaining: "—", label: "After shift", shift: "", progress: 100 };
  }, [now]);

  const handlePTTStart = useCallback(() => { unlockAudio(); playPTTClick(); startTalking(`Car ${carNumber}`); }, [carNumber, startTalking]);
  const handlePTTEnd = useCallback(() => { stopTalking(); }, [stopTalking]);

  return (
    <div className="h-[100dvh] bg-black flex flex-col select-none overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
      {/* Hidden audio element for receiving */}
      <audio ref={audioRef} autoPlay playsInline />

      {/* Company Header */}
      <div className="flex items-center justify-center px-4 py-2 bg-neutral-900/80 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <EdcLogo className="w-6 h-6" />
          <span className="text-white text-sm font-black uppercase tracking-wide">EDC TOWER</span>
        </div>
      </div>

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-orange-700/50" style={{ background: 'linear-gradient(180deg, #f5a623 0%, #e8941e 50%, #d4820a 100%)' }}>
        <div className="flex items-center gap-2">
          <span className="text-white font-mono text-lg font-bold" dir="ltr">{time}</span>
          <span className="text-destructive font-mono text-xs" dir="ltr">{seconds}</span>
        </div>
        <Popover open={areaPickerOpen} onOpenChange={setAreaPickerOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1.5 bg-blue-600/20 px-3 py-1 rounded-full hover:bg-blue-600/30 transition-colors">
              <Navigation className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-blue-400 text-xs font-bold">{selectedArea}</span>
              <ChevronDown className={`w-3 h-3 text-blue-400 transition-transform ${areaPickerOpen ? "rotate-180" : ""}`} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-0 bg-neutral-900 border-neutral-700 rounded-xl overflow-hidden" align="center" sideOffset={8}>
            {TRAINING_AREAS.map((area) => (
              <button key={area} onClick={() => { setSelectedArea(area); setAreaPickerOpen(false); }} className={`w-full px-4 py-3 text-sm border-b border-neutral-800 last:border-0 transition-colors flex items-center justify-between ${selectedArea === area ? "bg-purple-600/20 text-purple-400 font-bold" : "text-neutral-300 hover:bg-neutral-800"}`}>
                <span>{area}</span>
                {selectedArea === area && <Check className="w-4 h-4 text-purple-400" />}
              </button>
            ))}
          </PopoverContent>
        </Popover>
        <button onClick={() => navigate("/")} className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content - all banners inside scrollable area */}
      <div className="flex-1 flex flex-col p-4 gap-2 overflow-y-auto min-h-0">
        {turnWarning && (
          <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>TURN unavailable, using STUN fallback ({turnWarning}).</span>
          </div>
        )}

        {turnFetchError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
            Voice relay unavailable right now; running in fallback mode.
          </div>
        )}

        <div className="flex items-center justify-between bg-neutral-800/60 rounded-xl px-3 py-1.5 border border-neutral-700/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connectedPeers.length > 0 ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]" : isConnected ? "bg-amber-500" : "bg-red-500"}`} />
            <span className="text-[10px] font-mono text-muted-foreground">
              {connectedPeers.length > 0 ? "CONNECTED" : isConnected ? "CHANNEL OK" : "OFFLINE"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">Peers: {connectedPeers.length}</span>
            {connectionType !== "unknown" && (
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                connectionType === "host" ? "bg-primary/20 text-primary" :
                connectionType === "stun" ? "bg-info/20 text-info" :
                "bg-accent/20 text-accent"
              }`}>{connectionType.toUpperCase()}</span>
            )}
            {assignment && (
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                audioHook.status === "connected" ? "bg-primary/20 text-primary" :
                audioHook.status === "calling" ? "bg-accent/20 text-accent" :
                "bg-destructive/20 text-destructive"
              }`}>🔊 {audioHook.status.toUpperCase()}</span>
            )}
          </div>
        </div>

        {/* Audio unlock */}
        {!audioUnlocked && (
          <button onClick={handleUnlockAudio} className="w-full py-3 rounded-2xl bg-info text-foreground font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform flex-shrink-0">
            <Volume2 className="w-5 h-5" />
            Start Audio (Required)
          </button>
        )}

        {/* Incoming private call */}
        <AnimatePresence>
          {incomingPrivateCall && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden flex-shrink-0">
              <div className="bg-gradient-to-r from-info/20 to-accent/20 rounded-2xl border border-info/30 p-3 flex items-center gap-3">
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-10 h-10 rounded-full bg-info/20 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-info" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-bold truncate">{incomingPrivateCall.callerName}</p>
                  <p className="text-muted-foreground text-[10px]">📞 Incoming Private Call</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Private mode indicator */}
        <AnimatePresence>
          {privatePeerId && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden flex-shrink-0">
              <div className="bg-accent/10 border border-accent/20 rounded-xl px-3 py-1.5 flex items-center justify-center gap-2">
                <Lock className="w-3.5 h-3.5 text-accent" />
                <span className="text-accent text-xs font-bold">🔒 Private Mode</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instructor Presence Banner */}
        {(() => {
          const connectedInstructor = connectedInstructors[0];
          if (!connectedInstructor) return null;
          const empIdStr = connectedInstructor.peerId.split("-")[1];
          const empId = empIdStr ? parseInt(empIdStr, 10) : null;
          const instructorRecord = instructorsList?.find(i => i.employee_id === empId);
          const photoUrl = instructorRecord?.photo_url || null;
          const vip = isVipByPeerId(connectedInstructor.peerId) || isVipByName(connectedInstructor.name);
          return (
            <div className={`bg-gradient-to-r from-primary/10 to-info/10 rounded-2xl px-3 py-2.5 flex items-center gap-3 relative flex-shrink-0 ${vip ? VIP_BORDER_CLASS : "border border-primary/20"}`}>
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-primary/30">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={connectedInstructor.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg class="w-5 h-5 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
                  }}
                />
              ) : (
                <User className="w-5 h-5 text-primary" />
              )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-primary text-[10px] font-bold">👨‍🏫 Instructor</p>
                <p className={`text-sm font-bold truncate ${vip ? VIP_NAME_CLASS : "text-foreground"}`}>{connectedInstructor.name}</p>
              </div>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 animate-pulse ${vip ? "bg-yellow-400" : "bg-primary"}`} />
            </div>
          );
        })()}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-2 col-span-1">
            {/* UAE License Plate */}
            <div
              className="flex-1 rounded-md overflow-hidden"
              style={{
                border: '3px solid #9a9a9a',
                borderRadius: '6px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.25)',
                aspectRatio: '1.8 / 1',
                minHeight: '70px',
              }}
            >
              {/* Orange header */}
              <div
                className="flex items-center justify-between px-2"
                style={{
                  background: 'linear-gradient(180deg, #f5a623 0%, #e8941e 40%, #c07a15 100%)',
                  borderBottom: '2px solid #a06510',
                  height: '38%',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.3)',
                }}
              >
                <span className="text-sm font-black leading-none" style={{ color: '#1a1a1a', textShadow: '0 1px 0 rgba(255,255,255,0.4), 0 2px 3px rgba(0,0,0,0.15)' }}>L</span>
                <div className="flex flex-col items-center leading-none">
                  <span className="text-[8px] font-bold" style={{ color: '#1a1a1a', fontFamily: 'Arial, sans-serif', textShadow: '0 0.5px 0 rgba(255,255,255,0.3)' }}>أبو ظبي</span>
                  <span className="text-[6px] font-bold tracking-wider" style={{ color: '#1a1a1a', textShadow: '0 0.5px 0 rgba(255,255,255,0.3)' }}>A.D</span>
                </div>
                <span className="text-sm font-black leading-none" style={{ color: '#1a1a1a', fontFamily: 'Arial, sans-serif', textShadow: '0 1px 0 rgba(255,255,255,0.4), 0 2px 3px rgba(0,0,0,0.15)' }}>ت</span>
              </div>
              {/* Silver embossed number area */}
              <div
                className="flex items-center justify-center"
                style={{
                  background: 'linear-gradient(180deg, #e8e8e8 0%, #d4d4d4 30%, #c0c0c0 70%, #b0b0b0 100%)',
                  height: '62%',
                  boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2), inset 0 -1px 3px rgba(0,0,0,0.08)',
                }}
              >
                <span
                  className="font-mono font-black tracking-[0.15em] leading-none"
                  dir="ltr"
                  style={{
                    fontSize: 'clamp(18px, 5vw, 28px)',
                    color: '#111',
                    textShadow: '0 2px 1px rgba(0,0,0,0.25), 0 -1px 0 rgba(255,255,255,0.8), 1px 1px 0 rgba(0,0,0,0.12), -1px -1px 0 rgba(255,255,255,0.5), 0 0 6px rgba(0,0,0,0.05)',
                    WebkitTextStroke: '0.4px rgba(0,0,0,0.12)',
                    letterSpacing: '0.15em',
                  }}
                >
                  {carNumber}
                </span>
              </div>
            </div>
            {/* Box Number & Type badge */}
            <div className="flex flex-col items-center justify-center rounded-lg px-3 py-2 border border-accent/30 gap-1" style={{ background: 'linear-gradient(180deg, rgba(245,166,35,0.18), rgba(245,166,35,0.06))' }}>
              <span className="text-[8px] text-accent/70 font-semibold">BOX</span>
              <span className="text-lg font-black text-accent font-mono leading-none" dir="ltr">{boxNumber}</span>
              <span className={`text-[9px] font-black leading-none mt-0.5 px-1.5 py-0.5 rounded ${vehicleType === "auto" ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"}`}>
                {vehicleType === "auto" ? "A" : "M"}
              </span>
            </div>
          </div>
          <div className="bg-neutral-900 rounded-2xl p-3 border border-neutral-800 flex flex-col items-center justify-center">
            <Clock className="w-5 h-5 text-emerald-400 mb-1" />
            <span className="text-[10px] text-neutral-500">{classInfo.label}</span>
            <span className="text-emerald-400 font-mono text-xl font-black mt-0.5" dir="ltr">{classInfo.remaining}</span>
            {classInfo.current > 0 && (
              <div className="w-full h-1 bg-neutral-800 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${classInfo.progress}%` }} />
              </div>
            )}
          </div>
          <div className="bg-neutral-900 rounded-2xl p-3 border border-neutral-800 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[10px] text-neutral-400">{dayName}</span>
              <span className="text-[10px] text-neutral-500">{monthName}</span>
            </div>
            <span className="text-destructive font-mono text-xl font-black" dir="ltr">{now.getDate()}</span>
            {ramadanDay ? (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[9px] text-accent/60">رمضان</span>
                <span className="text-accent text-xs font-bold">{ramadanDay}</span>
              </div>
            ) : (
              <span className="text-muted-foreground text-xs mt-1">—</span>
            )}
          </div>
        </div>


        {/* Status Bar */}
        <button onClick={() => setShowParticipants(!showParticipants)} className="bg-neutral-900/50 rounded-xl px-4 py-2 border border-neutral-800/50 flex items-center justify-between w-full hover:bg-neutral-800/50 transition-colors">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-neutral-600"}`} />
            <span className="text-neutral-400 text-xs">{isConnected ? "Connected" : "Disconnected"}</span>
          </div>
          <span className="text-white text-sm font-bold">{name}</span>
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-neutral-500 text-xs">{dbParticipants.length + 1} online</span>
            <span className={`font-mono text-[8px] px-1 py-0.5 rounded ${
              connectionType === "turn" ? "bg-yellow-500/20 text-yellow-400" :
              connectionType === "stun" ? "bg-blue-400/20 text-blue-400" :
              connectionType === "host" ? "bg-emerald-500/20 text-emerald-400" :
              "bg-neutral-700/50 text-neutral-500"
            }`}>
              {connectionType === "turn" ? "TURN" : connectionType === "stun" ? "STUN" : connectionType === "host" ? "HOST" : "---"}
            </span>
            <ChevronDown className={`w-3 h-3 text-neutral-600 transition-transform ${showParticipants ? "rotate-180" : ""}`} />
          </div>
        </button>

        {/* Participants List */}
        <AnimatePresence>
          {showParticipants && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="bg-neutral-900 rounded-2xl border border-neutral-800 max-h-48 overflow-y-auto">
                <div className="flex items-center gap-3 px-4 py-2.5 border-b border-neutral-800">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center"><Car className="w-4 h-4 text-emerald-400" /></div>
                  <div className="flex-1">
                    <span className="text-white text-sm font-bold">{name}</span>
                    <span className="text-neutral-500 text-[10px] ml-2">You</span>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                {connectedInstructors.length > 0 && (
                  <>
                    <div className="sticky top-0 bg-neutral-800 px-3 py-1.5 text-[10px] font-bold text-blue-400 border-b border-neutral-700">
                      👨‍🏫 Instructors Online ({connectedInstructors.length})
                    </div>
                    {connectedInstructors.map((p) => {
                      const vip = isVipByPeerId(p.peerId) || isVipByName(p.name);
                      return (
                        <div key={p.peerId} className={`flex items-center gap-3 px-4 py-2.5 border-b border-neutral-800/50 last:border-0 relative ${vip ? VIP_BORDER_CLASS : ""}`}>
                          <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center"><User className={`w-4 h-4 ${vip ? "text-yellow-400" : "text-blue-400"}`} /></div>
                          <div className="flex-1">
                            <span className={`text-sm font-semibold ${vip ? VIP_NAME_CLASS : "text-white"}`}>{p.name}</span>
                            <span className="text-blue-400 text-[10px] ml-2">Instructor</span>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                      );
                    })}
                  </>
                )}
                {connectedOtherCars.length > 0 && (
                  <>
                    <div className="sticky top-0 bg-neutral-800 px-3 py-1.5 text-[10px] font-bold text-amber-400 border-b border-neutral-700">
                      🚗 Connected Cars ({connectedOtherCars.length})
                    </div>
                    {connectedOtherCars.map((p) => (
                      <div key={p.peerId} className="flex items-center gap-3 px-4 py-2.5 border-b border-neutral-800/50 last:border-0">
                        <div className="w-8 h-8 rounded-lg bg-amber-600/20 flex items-center justify-center"><Car className="w-4 h-4 text-amber-400" /></div>
                        <div className="flex-1">
                          <span className="text-white text-sm font-semibold font-mono" dir="ltr">{p.carNumber || p.name}</span>
                          <span className="text-amber-400 text-[10px] ml-2">Car</span>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                    ))}
                  </>
                )}
                {dbParticipants.length === 0 && (
                  <div className="px-4 py-4 text-center text-neutral-500 text-xs">No other participants</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Current speaker */}
        {currentSpeaker && !isTalking && (
          <div className={`rounded-xl px-4 py-2 flex items-center justify-center gap-2 relative ${isVipByName(currentSpeaker) ? `bg-yellow-600/20 border border-yellow-500/30 ${VIP_BORDER_CLASS}` : "bg-blue-600/20 border border-blue-500/30"}`}>
            <Mic className={`w-4 h-4 animate-pulse ${isVipByName(currentSpeaker) ? "text-yellow-400" : "text-blue-400"}`} />
            <span className={`text-sm font-bold ${isVipByName(currentSpeaker) ? VIP_NAME_CLASS : "text-blue-400"}`}>{currentSpeaker} is speaking</span>
          </div>
        )}

        {isTalking && (
          <div className="bg-neutral-900 rounded-xl px-4 py-2 border border-red-500/30">
            <AudioLevelIndicator level={audioLevel} isTalking={isTalking} />
          </div>
        )}

      </div>

      {/* Bottom Actions - fixed outside scroll */}
      <div className="p-4 pt-2 space-y-2 flex-shrink-0">
        {/* Current speaker */}
        {currentSpeaker && !isTalking && (
          <div className={`rounded-xl px-3 py-1.5 flex items-center justify-center gap-2 relative ${isVipByName(currentSpeaker) ? `bg-accent/15 border border-accent/20 ${VIP_BORDER_CLASS}` : "bg-info/15 border border-info/20"}`}>
            <Mic className={`w-3.5 h-3.5 animate-pulse ${isVipByName(currentSpeaker) ? "text-accent" : "text-info"}`} />
            <span className={`text-xs font-bold ${isVipByName(currentSpeaker) ? VIP_NAME_CLASS : "text-info"}`}>{currentSpeaker} is speaking</span>
          </div>
        )}

        {isTalking && (
          <div className="bg-card rounded-xl px-3 py-1.5 border border-destructive/30">
            <AudioLevelIndicator level={audioLevel} isTalking={isTalking} />
          </div>
        )}

        <div className="relative flex items-center justify-center">
          <AnimatePresence>
            {isTalking && (
              <motion.div initial={{ scale: 1, opacity: 0.4 }} animate={{ scale: 1.5, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }} className="absolute inset-0 rounded-2xl border-2 border-white/20" />
            )}
            {isTalking && (
              <motion.div initial={{ scale: 1, opacity: 0.3 }} animate={{ scale: 1.3, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut", delay: 0.3 }} className="absolute inset-0 rounded-2xl border-2 border-white/15" />
            )}
          </AnimatePresence>

          <motion.button
            onPointerDown={(e) => { e.preventDefault(); handlePTTStart(); }}
            onPointerUp={(e) => { e.preventDefault(); handlePTTEnd(); }}
            onPointerLeave={handlePTTEnd}
            onContextMenu={(e) => e.preventDefault()}
            onTouchStart={(e) => { e.preventDefault(); handlePTTStart(); }}
            onTouchEnd={(e) => { e.preventDefault(); handlePTTEnd(); }}
            whileTap={{ scale: 0.94 }}
            animate={isTalking ? { boxShadow: ["0 0 20px rgba(239,68,68,0.3)", "0 0 40px rgba(239,68,68,0.6)", "0 0 20px rgba(239,68,68,0.3)"] } : {}}
            transition={isTalking ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
            className={`relative w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-base touch-none select-none backdrop-blur-xl border transition-colors duration-300 ${
              isTalking
                ? "bg-destructive/40 border-destructive/50 text-white"
                : "bg-white/10 border-white/20 text-foreground hover:bg-white/15"
            }`}
          >
            <Mic className={`w-6 h-6 ${isTalking ? "animate-pulse" : ""}`} />
            <span>{isTalking ? "Broadcasting..." : privatePeerId ? "🔒 Speak Privately" : "Push to Talk"}</span>
            {isTalking && (
              <div className="flex items-center gap-0.5 ml-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <motion.div key={i} className="w-1 rounded-full bg-white/70" animate={{ height: [6, 18, 6] }} transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }} />
                ))}
              </div>
            )}
          </motion.button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setShowAssistant(true)}
            className="relative overflow-hidden rounded-2xl py-4 flex items-center justify-center active:scale-95 transition-transform bg-secondary/50 border border-border"
          >
            <Bot className="w-8 h-8 text-cyan-300 relative z-10 drop-shadow-[0_0_14px_rgba(0,212,170,0.7)]" />
          </button>

          <button
            onClick={handleEmergency}
            disabled={emergencySent}
            className={`relative overflow-hidden rounded-2xl py-4 flex items-center justify-center active:scale-95 transition-transform bg-secondary/50 border border-border ${emergencySent ? "animate-pulse" : ""}`}
          >
            <AlertTriangle
              className="w-8 h-8 text-accent relative z-10 drop-shadow-[0_0_16px_hsl(var(--accent)/0.7)]"
              fill="hsl(var(--accent) / 0.15)"
            />
          </button>

          <button
            className="relative overflow-hidden rounded-2xl py-4 flex items-center justify-center active:scale-95 transition-transform bg-secondary/50 border border-border"
          >
            <MapPin className="w-8 h-8 text-primary relative z-10 drop-shadow-[0_0_14px_hsl(var(--primary)/0.7)]" />
          </button>
        </div>
      </div>

      {/* Voice Assistant Overlay */}
      <AnimatePresence>
        {showAssistant && (
          <VoiceAssistant
            carNumber={carNumber}
            trainingArea={selectedArea}
            currentSession={classInfo.label}
            remainingTime={classInfo.remaining}
            shift={classInfo.shift || ""}
            ramadanDay={ramadanDay}
            onClose={() => setShowAssistant(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentCarScreen;
