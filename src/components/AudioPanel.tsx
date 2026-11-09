import { useEffect, useRef, useState } from "react";
import { useWebRTCAudio } from "@/hooks/useWebRTCAudio";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Phone, PhoneOff, Volume2 } from "lucide-react";

interface AudioPanelProps {
  callId: string;
  selfDeviceId: string;
  peerDeviceId: string;
  iceServers: RTCIceServer[];
  mode: "sender" | "receiver";
  allowedPeerId?: string;
}

export function AudioPanel({ callId, selfDeviceId, peerDeviceId, iceServers, mode, allowedPeerId }: AudioPanelProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const webrtc = useWebRTCAudio({
    callId,
    selfId: selfDeviceId,
    peerId: peerDeviceId,
    iceServers,
    mode,
    allowedPeerId,
  });

  // Bind remote stream to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = webrtc.remoteStream;
    }
  }, [webrtc.remoteStream]);

  const unlockAudio = async () => {
    if (!audioRef.current) return;
    try {
      await audioRef.current.play();
      setAudioUnlocked(true);
      console.log("[AudioPanel] Audio unlocked ✅");
    } catch (e) {
      console.warn("[AudioPanel] Audio unlock failed:", e);
      setAudioUnlocked(true);
    }
  };

  const statusColors: Record<string, string> = {
    idle: "bg-muted text-muted-foreground",
    ready: "bg-blue-500/20 text-blue-400",
    calling: "bg-yellow-500/20 text-yellow-400",
    connected: "bg-green-500/20 text-green-400",
    failed: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="p-4 rounded-xl border border-border bg-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">🔊 Audio Link</h3>
        <span className={`text-xs px-2 py-1 rounded-full font-mono ${statusColors[webrtc.status]}`}>
          {webrtc.status.toUpperCase()}
        </span>
      </div>

      <div className="text-xs text-muted-foreground space-y-1 font-mono">
        <div>Call: {callId}</div>
        <div>Mode: {mode}</div>
        <div>Self: {selfDeviceId.slice(0, 12)}...</div>
        <div>Peer: {peerDeviceId ? `${peerDeviceId.slice(0, 12)}...` : "—"}</div>
      </div>

      <audio ref={audioRef} autoPlay playsInline />

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={audioUnlocked ? "secondary" : "default"}
          size="sm"
          onClick={unlockAudio}
          disabled={audioUnlocked}
          className="text-xs"
        >
          <Volume2 className="w-3 h-3 mr-1" />
          {audioUnlocked ? "Audio ✅" : "Start Audio"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={webrtc.initMic}
          disabled={webrtc.status !== "idle"}
          className="text-xs"
        >
          <Mic className="w-3 h-3 mr-1" />
          {mode === "receiver" ? "Ready" : "Init Mic"}
        </Button>

        {mode === "sender" && (
          <Button
            variant="default"
            size="sm"
            onClick={webrtc.callPeer}
            disabled={webrtc.status !== "ready" || !peerDeviceId}
            className="text-xs"
          >
            <Phone className="w-3 h-3 mr-1" />
            Call
          </Button>
        )}

        {mode === "sender" && (
          <Button
            variant={webrtc.micEnabled ? "destructive" : "outline"}
            size="sm"
            onClick={() => webrtc.enableMic(!webrtc.micEnabled)}
            disabled={webrtc.status === "idle"}
            className="text-xs"
          >
            {webrtc.micEnabled ? <MicOff className="w-3 h-3 mr-1" /> : <Mic className="w-3 h-3 mr-1" />}
            {webrtc.micEnabled ? "Mute" : "Enable Mic"}
          </Button>
        )}
      </div>

      <Button
        variant="destructive"
        size="sm"
        onClick={webrtc.hangup}
        disabled={webrtc.status === "idle"}
        className="w-full text-xs"
      >
        <PhoneOff className="w-3 h-3 mr-1" />
        Hangup
      </Button>
    </div>
  );
}
