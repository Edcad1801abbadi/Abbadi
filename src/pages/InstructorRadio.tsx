import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playVipJoinSound, playVipLeaveSound, playEmergencyRingSound } from "@/hooks/useNotificationSounds";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, LogOut, Phone, List, Hash, PhoneOff, Users, Car, User, ChevronDown, Check, MapPin, Volume2, Lock, Bot } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import LCDScreen from "@/components/radio/LCDScreen";
import NumPad from "@/components/radio/NumPad";
import VehicleList from "@/components/radio/VehicleList";
import AudioLevelIndicator from "@/components/radio/AudioLevelIndicator";
import { useWebRTC, unlockAudio } from "@/hooks/useWebRTC";
import { useRoomParticipants } from "@/hooks/useRoomParticipants";
import { useInstructors } from "@/hooks/useInstructors";
import { useCallAssignment } from "@/hooks/useCallAssignment";
import { useWebRTCAudio } from "@/hooks/useWebRTCAudio";
import { playPTTClick, playChannelSwitchSound } from "@/hooks/useNotificationSounds";
import { TRAINING_AREAS } from "@/constants/trainingAreas";
import { getDeviceSuffix } from "@/lib/deviceId";
import InstructorVoiceAssistant from "@/components/InstructorVoiceAssistant";
import { isVipByPeerId, isVipByName, VIP_NAME_CLASS, VIP_BORDER_CLASS } from "@/lib/vip";
import { fetchTurnCredentials as fetchTurnCredentialsFromEdge } from "@/lib/turnCredentials";

type RadioView = "main" | "dial" | "vehicles" | "instructors" | "connected-cars" | "connected-instructors";

const fetchTurnCredentials = () => fetchTurnCredentialsFromEdge();

const InstructorRadio = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { name = "Instructor", roomCode = "XK7M2", employeeId = "0" } = location.state || {};

  const [selectedArea, setSelectedArea] = useState<string>(roomCode || TRAINING_AREAS[0]);
  const [areaPickerOpen, setAreaPickerOpen] = useState(false);
  const peerId = useMemo(() => `instructor-${employeeId}-${getDeviceSuffix()}`, [employeeId]);
  const peerMeta = useMemo(() => ({ type: "instructor" as const, name }), [name]);
  const [iceServers, setIceServers] = useState<RTCIceServer[]>([]);
  const [turnWarning, setTurnWarning] = useState<string | null>(null);

  // Fetch TURN credentials
  useEffect(() => {
    let isMounted = true;

    fetchTurnCredentials().then((result) => {
      if (!isMounted) return;
      setIceServers(result.iceServers);
      setTurnWarning(result.usedFallback ? result.errorMessage ?? "TURN unavailable" : null);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const {
    isConnected, isTalking, currentSpeaker, connectedPeers, audioLevel, connectionType,
    privatePeerId, startTalking, stopTalking, startPrivateMode, endPrivateMode,
  } = useWebRTC({ roomCode: selectedArea, peerId, peerMeta });

  const { participants: dbParticipants } = useRoomParticipants({
    roomCode: selectedArea, peerId, peerName: name, peerType: "instructor", carNumber: "----",
  });

  // Call assignment system
  const { assignment, assignTocar, clearAssignment } = useCallAssignment({
    roomCode: selectedArea, peerId, peerType: "instructor", carNumber: "----",
  });

  // WebRTC Audio (sender mode) - active only when assigned to a car
  const audioHook = useWebRTCAudio({
    callId: assignment?.callId || "",
    selfId: peerId,
    peerId: assignment?.carPeerId || "",
    iceServers,
    mode: "sender",
  });

  // Auto-init mic and call when assignment is made
  const prevAssignmentRef = useRef<string | null>(null);
  useEffect(() => {
    if (assignment && assignment.callId !== prevAssignmentRef.current) {
      prevAssignmentRef.current = assignment.callId;
      console.log("[Instructor] New assignment, initializing audio for:", assignment.callId);
      // Small delay to let channel subscribe
      setTimeout(async () => {
        await audioHook.initMic();
        // Wait a moment for receiver to also subscribe
        setTimeout(() => {
          audioHook.callPeer();
        }, 1500);
      }, 500);
    } else if (!assignment && prevAssignmentRef.current) {
      prevAssignmentRef.current = null;
      audioHook.hangup();
    }
  }, [assignment]); // eslint-disable-line react-hooks/exhaustive-deps

  const connectedCars = useMemo(() => {
    const webrtcCarIds = new Set(connectedPeers.filter(p => p.type === "car").map(p => p.peerId));
    const dbCars = dbParticipants.filter(p => p.peer_type === "car");
    // Deduplicate by car_number - keep the one with audio, or the latest
    const seen = new Map<string, typeof dbCars[0]>();
    for (const p of dbCars) {
      const existing = seen.get(p.car_number);
      if (!existing || webrtcCarIds.has(p.peer_id)) {
        seen.set(p.car_number, p);
      }
    }
    return [...seen.values()].map(p => ({ peerId: p.peer_id, type: "car" as const, name: p.student_name, carNumber: p.car_number, hasAudio: webrtcCarIds.has(p.peer_id) }));
  }, [dbParticipants, connectedPeers]);

  const connectedInstructors = useMemo(() => {
    const webrtcInstIds = new Set(connectedPeers.filter(p => p.type === "instructor").map(p => p.peerId));
    const dbInstructors = dbParticipants.filter(p => p.peer_type === "instructor");
    // Deduplicate by employee_id extracted from peer_id
    const seen = new Map<string, typeof dbInstructors[0]>();
    for (const p of dbInstructors) {
      const empId = p.peer_id.match(/^instructor-(\d+)/)?.[1] || p.peer_id;
      const existing = seen.get(empId);
      if (!existing || webrtcInstIds.has(p.peer_id)) {
        seen.set(empId, p);
      }
    }
    return [...seen.values()].map(p => ({ peerId: p.peer_id, type: "instructor" as const, name: p.student_name, hasAudio: webrtcInstIds.has(p.peer_id) }));
  }, [dbParticipants, connectedPeers]);

  const [currentView, setCurrentView] = useState<RadioView>("main");
  const [dialNumber, setDialNumber] = useState("");
  const [showAssistant, setShowAssistant] = useState(false);
  const signalStrength = isConnected ? 4 : 0;

  const [peerNotification, setPeerNotification] = useState<{ type: "join" | "leave"; count: number } | null>(null);
  const prevPeersCount = useRef(connectedPeers.length);
  const [channelNotification, setChannelNotification] = useState<string | null>(null);
  const [emergencyAlert, setEmergencyAlert] = useState<{ from: string; carNumber: string; carName: string } | null>(null);

  // Listen for emergency requests from cars - use UNIQUE channel name to avoid conflict with useWebRTC
  const emergencyHandlerRef = useRef<{ connectedCars: typeof connectedCars }>({ connectedCars: [] });
  emergencyHandlerRef.current.connectedCars = connectedCars;

  useEffect(() => {
    if (!selectedArea || !peerId) return;
    // CRITICAL: Use a different channel name to avoid destroying useWebRTC's channel
    const channel = supabase.channel(`emergency-${selectedArea}-${peerId}`);
    channel.on("broadcast", { event: "emergency-request" }, ({ payload }) => {
      if (payload.to !== peerId) return;
      console.log("[Instructor] 🚨 EMERGENCY from car:", payload.carNumber);
      playEmergencyRingSound();
      setEmergencyAlert({ from: payload.from, carNumber: payload.carNumber, carName: payload.carName });
      const carPeer = emergencyHandlerRef.current.connectedCars.find(p => p.carNumber === payload.carNumber);
      if (carPeer) {
        setTimeout(() => {
          handleCallCar(carPeer.carNumber, carPeer.peerId);
          setEmergencyAlert(null);
        }, 2000);
      }
      setTimeout(() => setEmergencyAlert(null), 10000);
    });
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedArea, peerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const privateTargetLabel = useMemo(() => {
    if (!privatePeerId) return null;
    const car = connectedCars.find(p => p.peerId === privatePeerId);
    if (car) return `Car ${car.carNumber}`;
    const inst = connectedInstructors.find(p => p.peerId === privatePeerId);
    if (inst) return inst.name;
    const peer = connectedPeers.find(p => p.peerId === privatePeerId);
    if (peer) return peer.carNumber ? `Car ${peer.carNumber}` : peer.name;
    return privatePeerId;
  }, [privatePeerId, connectedCars, connectedInstructors, connectedPeers]);

  const handleChannelSwitch = useCallback((area: string) => {
    // Clear assignment when switching channels
    if (assignment) {
      audioHook.hangup();
      clearAssignment();
    }
    setSelectedArea(area);
    setAreaPickerOpen(false);
    playChannelSwitchSound();
    setChannelNotification(area);
    setTimeout(() => setChannelNotification(null), 2000);
  }, [assignment, audioHook, clearAssignment]);

  // Track VIP join/leave sounds
  const prevPeersRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const prev = prevPeersCount.current;
    const curr = connectedPeers.length;
    const currentIds = new Set(connectedPeers.map(p => p.peerId));
    const prevIds = prevPeersRef.current;

    if (prev !== curr && prev !== undefined) {
      // Check if a VIP joined or left
      const joined = connectedPeers.filter(p => !prevIds.has(p.peerId));
      const left = [...prevIds].filter(id => !currentIds.has(id));
      const vipJoined = joined.some(p => isVipByPeerId(p.peerId));
      const vipLeft = left.some(id => isVipByPeerId(id));

      if (vipJoined) playVipJoinSound();
      if (vipLeft) playVipLeaveSound();

      setPeerNotification({ type: curr > prev ? "join" : "leave", count: curr });
      const timer = setTimeout(() => setPeerNotification(null), 2500);
      prevPeersRef.current = currentIds;
      prevPeersCount.current = curr;
      return () => clearTimeout(timer);
    }
    prevPeersRef.current = currentIds;
    prevPeersCount.current = curr;
  }, [connectedPeers]);

  const handlePTTStart = useCallback(() => {
    unlockAudio();
    playPTTClick();
    if (assignment && audioHook.status === "connected") {
      console.log(`[AudioRoute] 🔒 PTT START → PRIVATE mode | callId: ${assignment.callId} | target: ${assignment.carPeerId} | audioHook status: ${audioHook.status}`);
      audioHook.enableMic(true);
      startTalking(name, { broadcastAudio: false });
    } else {
      console.log(`[AudioRoute] 📡 PTT START → BROADCAST mode | room: ${selectedArea} | peers: ${connectedPeers.length} | assignment: ${assignment ? 'yes (not connected)' : 'none'}`);
      startTalking(name, { broadcastAudio: true });
    }
  }, [name, startTalking, assignment, audioHook, selectedArea, connectedPeers.length]);

  const handlePTTEnd = useCallback(() => {
    if (assignment) {
      console.log(`[AudioRoute] 🔇 PTT END → PRIVATE mic off | callId: ${assignment.callId}`);
      audioHook.enableMic(false);
    } else {
      console.log(`[AudioRoute] 🔇 PTT END → BROADCAST stopped`);
    }
    stopTalking();
  }, [stopTalking, assignment, audioHook]);

  useInstructors();

  const handleDial = (digit: string) => {
    if (digit === "CLR") { setDialNumber(""); }
    else if (digit === "CALL") {
      if (dialNumber) {
        // Try car first
        const carPeer = connectedCars.find(p => p.carNumber === dialNumber);
        if (carPeer) {
          handleCallCar(carPeer.carNumber, carPeer.peerId);
        } else {
          // Try instructor by employee ID
          const targetInst = connectedInstructors.find(p => {
            const match = p.peerId.match(/^instructor-(\d+)/);
            return match && match[1] === dialNumber;
          });
          if (targetInst) {
            handleStartPrivateCall(targetInst.peerId, targetInst.name);
          }
        }
        setCurrentView("main"); setDialNumber("");
      }
    } else { setDialNumber(prev => prev.length < 6 ? prev + digit : prev); }
  };

  const handleCallCar = useCallback(async (carNum: string, carPeerId: string) => {
    // Clear previous assignment first
    if (assignment) {
      audioHook.hangup();
      await clearAssignment();
    }
    // Create new assignment
    await assignTocar(carNum, carPeerId);
    startPrivateMode(carPeerId, name);
  }, [assignment, audioHook, clearAssignment, assignTocar, startPrivateMode, name]);

  const handleSelectVehicle = (vehicle: string) => {
    const carNum = vehicle.replace("Car ", "");
    const carPeer = connectedCars.find(p => p.carNumber === carNum);
    if (carPeer) handleCallCar(carPeer.carNumber, carPeer.peerId);
    setCurrentView("main");
  };

  const handleSelectInstructor = (id: string, _instructorName: string) => {
    startPrivateMode(`instructor-${id}`, name);
    setCurrentView("main");
  };

  const handleStartPrivateCall = useCallback((targetPeerId: string, _targetLabel: string) => {
    // Check if it's a car
    const car = connectedCars.find(p => p.peerId === targetPeerId);
    if (car) {
      handleCallCar(car.carNumber, car.peerId);
    } else {
      startPrivateMode(targetPeerId, name);
    }
    setCurrentView("main");
  }, [name, startPrivateMode, connectedCars, handleCallCar]);

  const handleEndCall = useCallback(() => {
    if (assignment) {
      audioHook.hangup();
      clearAssignment();
    }
    endPrivateMode();
  }, [assignment, audioHook, clearAssignment, endPrivateMode]);

  const selectedTarget = privatePeerId ? `🔒 ${privateTargetLabel}` : null;

  return (
    <div className="h-[100dvh] flex items-center justify-center px-2 relative overflow-hidden select-none" onContextMenu={(e) => e.preventDefault()}>
      <AnimatePresence>
        {peerNotification && (
          <motion.div initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg border ${
              peerNotification.type === "join" ? "bg-primary/20 text-primary border-primary/30" : "bg-destructive/20 text-destructive border-destructive/30"
            }`}
          >
            {peerNotification.type === "join" ? "🟢 User joined the room" : "🔴 User left the room"}
            <span className="ml-2 text-xs opacity-70">({peerNotification.count} connected)</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emergency Alert */}
      <AnimatePresence>
        {emergencyAlert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -60 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -60 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] px-6 py-4 rounded-2xl bg-red-600/90 border-2 border-red-400 shadow-[0_0_40px_rgba(239,68,68,0.5)] text-center backdrop-blur-sm"
          >
            <div className="text-2xl mb-1">🚨</div>
            <p className="text-white font-black text-sm">EMERGENCY</p>
            <p className="text-red-100 text-xs mt-1">{emergencyAlert.carName} needs help!</p>
            <p className="text-red-200/70 text-[10px] mt-2 animate-pulse">Connecting automatically...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(220,20%,10%),hsl(220,20%,5%))]" />

      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-[500px] flex flex-col h-[100dvh] py-2">
        {turnWarning && (
          <div className="mb-2 flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
            <span aria-hidden="true">⚠️</span>
            <span>TURN unavailable, using STUN fallback ({turnWarning}).</span>
          </div>
        )}

        <div className="bg-gradient-to-b from-neutral-800 via-neutral-900 to-neutral-950 rounded-[2rem] p-1.5 shadow-[0_0_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="bg-neutral-900 rounded-[1.7rem] flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Scrollable content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              <div className="flex items-center justify-between py-2">
                <div className="flex-1 flex justify-center gap-[3px]">
                  {Array.from({ length: 12 }).map((_, i) => (<div key={i} className="w-[2px] h-6 bg-neutral-700 rounded-full" />))}
                </div>
                <div className="relative flex items-center gap-1.5 mr-1">
                  <div className={`w-3 h-3 rounded-full border border-black/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] ${
                    isConnected && audioHook.status === "connected"
                      ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7),inset_0_1px_2px_rgba(255,255,255,0.3)] animate-pulse"
                      : isConnected && audioHook.status !== "failed"
                      ? "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6),inset_0_1px_2px_rgba(255,255,255,0.3)] animate-pulse"
                      : "bg-red-600 shadow-[0_0_6px_rgba(220,38,38,0.5),inset_0_1px_2px_rgba(255,255,255,0.2)]"
                  }`} />
                  <Volume2 className={`w-3.5 h-3.5 ${
                    isConnected && audioHook.status === "connected" ? "text-emerald-500" :
                    isConnected ? "text-amber-500" : "text-red-600"
                  }`} />
                </div>
              </div>

              <LCDScreen isTalking={isTalking} currentView={currentView} selectedTarget={selectedTarget} dialNumber={dialNumber} signalStrength={signalStrength} roomCode={selectedArea} name={name} connectedCount={dbParticipants.length + 1} />

              <div className="flex items-center justify-between bg-card/60 rounded-lg px-3 py-1.5 border border-border">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${connectedPeers.length > 0 ? "bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.7)]" : isConnected ? "bg-accent" : "bg-destructive"}`} />
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {connectedPeers.length > 0 ? "CONNECTED" : isConnected ? "CHANNEL OK" : "OFFLINE"}
                  </span>
                  {assignment && (
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                      audioHook.status === "connected" ? "bg-primary/20 text-primary" :
                      audioHook.status === "calling" ? "bg-accent/20 text-accent" :
                      "bg-destructive/20 text-destructive"
                    }`}>🔊 {audioHook.status.toUpperCase()}</span>
                  )}
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
                </div>
              </div>

              <div className={`rounded-lg px-3 py-1.5 flex items-center justify-center gap-2 text-[11px] font-bold ${
                privatePeerId ? "bg-accent/10 border border-accent/20" : "bg-primary/10 border border-primary/20"
              }`}>
                {privatePeerId ? (
                  <><Lock className="w-3 h-3 text-accent" /><span className="text-accent">🔒 Private: {privateTargetLabel}</span></>
                ) : (
                  <><Volume2 className="w-3 h-3 text-primary" /><span className="text-primary">🔊 Public broadcast</span></>
                )}
              </div>

              <AnimatePresence>
                {channelNotification && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="bg-primary/20 border border-primary/30 rounded-lg px-3 py-1.5 flex items-center justify-center gap-2">
                    <MapPin className="w-3 h-3 text-primary" />
                    <span className="text-primary text-xs font-bold">Switched to: {channelNotification}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {isTalking && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="bg-card/80 rounded-lg border border-border px-3 py-1.5">
                      <AudioLevelIndicator level={audioLevel} isTalking={isTalking} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-3 gap-1.5 mb-1">
                <MenuButton icon={<Car className="w-4 h-4" />} label="Connected Cars" active={currentView === "connected-cars"} onClick={() => setCurrentView(currentView === "connected-cars" ? "main" : "connected-cars")} badge={connectedCars.length} />
                <MenuButton icon={<Users className="w-4 h-4" />} label="Instructors Online" active={currentView === "connected-instructors"} onClick={() => setCurrentView(currentView === "connected-instructors" ? "main" : "connected-instructors")} badge={connectedInstructors.length} />
                <MenuButton icon={<Hash className="w-4 h-4" />} label="Dial Number" active={currentView === "dial"} onClick={() => setCurrentView(currentView === "dial" ? "main" : "dial")} />
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <MenuButton icon={<List className="w-4 h-4" />} label="All Cars" active={currentView === "vehicles"} onClick={() => setCurrentView(currentView === "vehicles" ? "main" : "vehicles")} />
                <MenuButton icon={<Phone className="w-4 h-4" />} label="All Instructors" active={currentView === "instructors"} onClick={() => setCurrentView(currentView === "instructors" ? "main" : "instructors")} />
                <MenuButton icon={<Bot className="w-4 h-4" />} label="Smart Assistant" active={false} onClick={() => setShowAssistant(true)} />
                <MenuButton icon={<LogOut className="w-4 h-4" />} label="Logout" active={false} onClick={() => navigate("/")} variant="danger" />
              </div>

              <AnimatePresence mode="wait">
                {currentView === "dial" && (<motion.div key="dial" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><NumPad onPress={handleDial} dialNumber={dialNumber} /></motion.div>)}
                {currentView === "vehicles" && (<motion.div key="vehicles" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><VehicleList onSelect={handleSelectVehicle} /></motion.div>)}
                {currentView === "instructors" && (<motion.div key="instructors" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><InstructorList onSelect={handleSelectInstructor} currentEmployeeId={employeeId} /></motion.div>)}
                {currentView === "connected-cars" && (<motion.div key="connected-cars" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><ConnectedCarsList cars={connectedCars} activePeerId={privatePeerId} onCall={(carNum, targetPeerId) => handleStartPrivateCall(targetPeerId, `Car ${carNum}`)} /></motion.div>)}
                {currentView === "connected-instructors" && (<motion.div key="connected-instructors" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><ConnectedInstructorsList instructors={connectedInstructors} currentName={name} activePeerId={privatePeerId} onCall={(instName, targetPeerId) => handleStartPrivateCall(targetPeerId, instName)} /></motion.div>)}
              </AnimatePresence>

              {privatePeerId && (
                <div className="pt-1">
                  <button onClick={handleEndCall} className="w-full py-2 rounded-xl flex items-center justify-center gap-2 font-bold text-sm bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30 transition-all">
                    <PhoneOff className="w-4 h-4" />
                    End Private Call — Return to Public
                  </button>
                </div>
              )}
            </div>

            {/* PTT + Status — FIXED at bottom, outside scroll */}
            <div className="flex-shrink-0 px-4 pb-3 pt-2 border-t border-neutral-800/60">
              <div className="relative">
                <AnimatePresence>
                  {isTalking && (
                    <>
                      <motion.div key="r1" initial={{ scale: 0.98, opacity: 0.4 }} animate={{ scale: 1.06, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }} className="absolute inset-0 rounded-2xl border border-red-400/25 pointer-events-none" />
                      <motion.div key="r2" initial={{ scale: 0.98, opacity: 0.25 }} animate={{ scale: 1.04, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }} className="absolute inset-0 rounded-2xl border border-red-400/15 pointer-events-none" />
                    </>
                  )}
                </AnimatePresence>

                <motion.button
                  onPointerDown={(e) => { e.preventDefault(); handlePTTStart(); }}
                  onPointerUp={(e) => { e.preventDefault(); handlePTTEnd(); }}
                  onPointerLeave={handlePTTEnd}
                  onContextMenu={(e) => e.preventDefault()}
                  onTouchStart={(e) => { e.preventDefault(); handlePTTStart(); }}
                  onTouchEnd={(e) => { e.preventDefault(); handlePTTEnd(); }}
                  whileTap={{ scale: 0.95 }}
                  animate={isTalking
                    ? { backgroundColor: "rgba(239,68,68,0.3)", borderColor: "rgba(239,68,68,0.45)" }
                    : { backgroundColor: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.12)" }
                  }
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="relative w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-bold text-lg select-none touch-none backdrop-blur-xl border text-foreground"
                >
                  <motion.div
                    animate={isTalking ? { rotate: [0, -6, 6, -4, 4, 0] } : { rotate: 0 }}
                    transition={isTalking ? { duration: 0.8, repeat: Infinity, repeatDelay: 1.2 } : {}}
                  >
                    <Mic className={`w-6 h-6 ${isTalking ? "text-red-400" : ""}`} />
                  </motion.div>
                  <span>{isTalking ? "Broadcasting..." : privatePeerId ? "🔒 Speak Privately" : "Push to Talk"}</span>
                  {isTalking && (
                    <div className="flex items-center gap-[3px] ml-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <motion.div key={i} className="w-[3px] rounded-full bg-red-400/80" animate={{ height: [4, 14 + Math.random() * 6, 4] }} transition={{ duration: 0.4 + Math.random() * 0.3, repeat: Infinity, delay: i * 0.08 }} />
                      ))}
                    </div>
                  )}
                </motion.button>
              </div>

              <div className="flex items-center justify-between px-1 pt-2 text-[10px] font-mono text-muted-foreground">
                <Popover open={areaPickerOpen} onOpenChange={setAreaPickerOpen}>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1 px-2 py-1 rounded-md bg-card/60 border border-border hover:bg-card transition-colors">
                      <MapPin className="w-3 h-3 text-primary" />
                      <span className="text-foreground">{selectedArea}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${areaPickerOpen ? "rotate-180" : ""}`} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-0 bg-neutral-900 border-neutral-700 rounded-xl overflow-hidden" align="start" sideOffset={8}>
                    {TRAINING_AREAS.map((area) => (
                      <button key={area} onClick={() => handleChannelSwitch(area)} className={`w-full px-3 py-2.5 text-xs border-b border-neutral-800 last:border-0 transition-colors flex items-center justify-between ${selectedArea === area ? "bg-primary/20 text-primary font-bold" : "text-neutral-300 hover:bg-neutral-800"}`}>
                        <span>{area}</span>
                        {selectedArea === area && <Check className="w-3 h-3 text-primary" />}
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
                <span className={`px-1.5 py-0.5 rounded ${
                  connectionType === "turn" ? "bg-yellow-500/20 text-yellow-400" :
                  connectionType === "stun" ? "bg-blue-400/20 text-blue-400" :
                  connectionType === "host" ? "bg-primary/20 text-primary" :
                  "bg-neutral-700/50 text-muted-foreground"
                }`}>
                  {connectionType === "turn" ? "TURN" : connectionType === "stun" ? "STUN" : connectionType === "host" ? "HOST" : "---"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1">
          <div className={`w-2 h-20 rounded-l-md transition-colors ${isTalking ? "bg-destructive" : "bg-neutral-700"}`} />
        </div>
      </motion.div>

      <AnimatePresence>
        {showAssistant && (
          <InstructorVoiceAssistant
            instructorName={name}
            employeeId={employeeId}
            trainingArea={selectedArea}
            connectedCarsCount={connectedCars.length}
            selectedCar={privatePeerId ? privateTargetLabel : null}
            onClose={() => setShowAssistant(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const MenuButton = ({ icon, label, active, onClick, variant = "default", badge }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; variant?: "default" | "danger"; badge?: number }) => (
  <button onClick={onClick} className={`relative flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all ${active ? "bg-primary/20 text-primary border border-primary/30" : variant === "danger" ? "bg-neutral-800 text-destructive/70 hover:text-destructive border border-neutral-700" : "bg-neutral-800 text-muted-foreground hover:text-foreground border border-neutral-700"}`}>
    {badge !== undefined && badge > 0 && (<span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[8px] font-black flex items-center justify-center">{badge}</span>)}
    {icon}
    {label}
  </button>
);

const InstructorList = ({ onSelect, currentEmployeeId }: { onSelect: (id: string, name: string) => void; currentEmployeeId: string }) => {
  const { data: instructors = [], isLoading } = useInstructors();
  const filtered = instructors.filter((inst) => String(inst.employee_id) !== String(currentEmployeeId));
  if (isLoading) return <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 p-4 text-center text-xs text-muted-foreground">Loading...</div>;
  return (
    <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 max-h-40 overflow-y-auto">
      {filtered.length === 0 ? (
        <div className="p-4 text-center text-xs text-muted-foreground">No other instructors found</div>
      ) : (
      filtered.map((inst) => (
          <button key={inst.employee_id} onClick={() => onSelect(String(inst.employee_id), inst.name)} className="w-full px-3 py-2 text-left border-b border-neutral-700 last:border-0 hover:bg-neutral-700/50 transition-colors flex items-center gap-2">
            <User className="w-3 h-3 text-primary" />
            <span className="text-xs text-foreground">{inst.name}</span>
            <span className="text-[10px] text-muted-foreground ml-auto">#{inst.employee_id}</span>
          </button>
        ))
      )}
    </div>
  );
};

const ConnectedCarsList = ({ cars, activePeerId, onCall }: { cars: { peerId: string; carNumber: string; name: string; hasAudio: boolean }[]; activePeerId: string | null; onCall: (carNumber: string, peerId: string) => void }) => (
  <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 max-h-40 overflow-y-auto">
    {cars.length === 0 ? (
      <div className="p-4 text-center text-xs text-muted-foreground">No cars connected</div>
    ) : (
      cars.map((car) => {
        const vip = isVipByPeerId(car.peerId);
        return (
          <button key={car.peerId} onClick={() => onCall(car.carNumber, car.peerId)} className={`w-full px-3 py-2 text-left border-b border-neutral-700 last:border-0 hover:bg-neutral-700/50 transition-colors flex items-center gap-2 ${activePeerId === car.peerId ? "bg-amber-500/10" : ""} ${vip ? VIP_BORDER_CLASS : ""}`}>
            <Car className="w-3 h-3 text-amber-400" />
            <span className={`text-xs font-mono ${vip ? VIP_NAME_CLASS : "text-foreground"}`}>{car.carNumber}</span>
            <span className={`text-[10px] ${vip ? VIP_NAME_CLASS : "text-muted-foreground"}`}>{car.name}</span>
            <div className={`ml-auto w-2 h-2 rounded-full ${car.hasAudio ? "bg-green-500" : "bg-yellow-500"}`} />
            {activePeerId === car.peerId && <Lock className="w-3 h-3 text-amber-400" />}
          </button>
        );
      })
    )}
  </div>
);

const ConnectedInstructorsList = ({ instructors, currentName, activePeerId, onCall }: { instructors: { peerId: string; name: string; hasAudio: boolean }[]; currentName: string; activePeerId: string | null; onCall: (name: string, peerId: string) => void }) => (
  <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 max-h-40 overflow-y-auto">
    {instructors.length === 0 ? (
      <div className="p-4 text-center text-xs text-muted-foreground">No other instructors online</div>
    ) : (
      instructors.map((inst) => {
        const vip = isVipByPeerId(inst.peerId) || isVipByName(inst.name);
        return (
          <button key={inst.peerId} onClick={() => onCall(inst.name, inst.peerId)} className={`w-full px-3 py-2 text-left border-b border-neutral-700 last:border-0 hover:bg-neutral-700/50 transition-colors flex items-center gap-2 ${activePeerId === inst.peerId ? "bg-blue-500/10" : ""} ${vip ? VIP_BORDER_CLASS : ""}`}>
            <User className={`w-3 h-3 ${vip ? "text-yellow-400" : "text-blue-400"}`} />
            <span className={`text-xs ${vip ? VIP_NAME_CLASS : "text-foreground"}`}>{inst.name}</span>
            <div className={`ml-auto w-2 h-2 rounded-full ${inst.hasAudio ? "bg-green-500" : "bg-yellow-500"}`} />
            {activePeerId === inst.peerId && <Lock className="w-3 h-3 text-blue-400" />}
          </button>
        );
      })
    )}
  </div>
);

export default InstructorRadio;
