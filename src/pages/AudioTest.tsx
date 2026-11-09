import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateDeviceId } from "@/lib/deviceId";
import { AudioPanel } from "@/components/AudioPanel";
import { Button } from "@/components/ui/button";
import { TRAINING_AREAS } from "@/constants/trainingAreas";
import { Users, Radio, ArrowLeft, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchTurnCredentials as fetchTurnCredentialsFromEdge } from "@/lib/turnCredentials";

interface PresencePeer {
  deviceId: string;
  name: string;
  joinedAt: string;
}

const fetchTurnCredentials = () => fetchTurnCredentialsFromEdge();

export default function AudioTest() {
  const navigate = useNavigate();
  const selfDeviceId = useMemo(() => getOrCreateDeviceId(), []);
  const [roomId, setRoomId] = useState<string>(TRAINING_AREAS[0]);
  const [peers, setPeers] = useState<PresencePeer[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<string>("");
  const [iceServers, setIceServers] = useState<RTCIceServer[]>([]);
  const [turnWarning, setTurnWarning] = useState<string | null>(null);
  const [manualPeerId, setManualPeerId] = useState("");

  // Fetch TURN credentials on mount
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

  // Presence channel for peer discovery
  useEffect(() => {
    if (!roomId) return;

    const channelName = `audio-presence:${roomId}`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: selfDeviceId } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const peerList: PresencePeer[] = [];
      for (const [key, presences] of Object.entries(state)) {
        if (key === selfDeviceId) continue;
        const p = (presences as any[])[0];
        peerList.push({
          deviceId: key,
          name: p?.name || key.slice(0, 8),
          joinedAt: p?.joined_at || "",
        });
      }
      setPeers(peerList);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          name: `Device-${selfDeviceId.slice(0, 6)}`,
          joined_at: new Date().toISOString(),
        });
        console.log("[AudioTest] Presence tracked in room:", roomId);
      }
    });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      setPeers([]);
      setSelectedPeer("");
    };
  }, [roomId, selfDeviceId]);

  const activePeerId = selectedPeer || manualPeerId;

  return (
    <div className="h-[100dvh] bg-background p-4 max-w-md mx-auto space-y-4 overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Radio className="w-5 h-5" />
          Audio Test
        </h1>
      </div>

      {/* Device ID */}
      <div className="p-3 rounded-lg bg-muted/50 border border-border">
        <div className="text-xs text-muted-foreground">Device ID (أنت)</div>
        <div className="font-mono text-sm text-foreground break-all">{selfDeviceId}</div>
      </div>

      {turnWarning && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>TURN unavailable, using STUN fallback ({turnWarning}).</span>
        </div>
      )}

      {/* Room Selection */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">اختر المنطقة (Room)</label>
        <div className="grid grid-cols-3 gap-2">
          {TRAINING_AREAS.slice(0, 6).map((area) => (
            <Button
              key={area}
              variant={roomId === area ? "default" : "outline"}
              size="sm"
              onClick={() => setRoomId(area)}
              className="text-xs"
            >
              {area}
            </Button>
          ))}
        </div>
      </div>

      {/* Presence List */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <Users className="w-4 h-4" />
          المتصلون ({peers.length})
        </div>
        {peers.length === 0 ? (
          <div className="p-3 rounded-lg bg-muted/30 border border-dashed border-border text-center">
            <p className="text-xs text-muted-foreground">لا يوجد أجهزة أخرى متصلة</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              افتح هذه الصفحة على جهاز آخر بنفس المنطقة
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {peers.map((peer) => (
              <button
                key={peer.deviceId}
                onClick={() => setSelectedPeer(peer.deviceId)}
                className={`w-full text-left p-2 rounded-lg border text-xs transition-colors ${
                  selectedPeer === peer.deviceId
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:bg-muted/50"
                }`}
              >
                <div className="font-mono font-medium">{peer.name}</div>
                <div className="text-[10px] text-muted-foreground break-all">
                  {peer.deviceId}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Manual Peer ID */}
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">أو أدخل Device ID يدويًا:</label>
        <input
          type="text"
          value={manualPeerId}
          onChange={(e) => {
            setManualPeerId(e.target.value);
            setSelectedPeer("");
          }}
          placeholder="paste peer device ID..."
          className="w-full p-2 rounded-lg border border-border bg-card text-foreground text-xs font-mono placeholder:text-muted-foreground"
        />
      </div>

      {/* Audio Panel */}
      {iceServers.length > 0 && (
        <AudioPanel
          callId={roomId}
          selfDeviceId={selfDeviceId}
          peerDeviceId={activePeerId}
          iceServers={iceServers}
          mode="sender"
        />
      )}

      {/* Instructions */}
      <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
        <div className="text-xs font-bold text-foreground">🧪 خطوات الاختبار:</div>
        <ol className="text-[10px] text-muted-foreground space-y-0.5 list-decimal list-inside">
          <li>افتح الصفحة على جهازين بنفس المنطقة</li>
          <li>انسخ Device ID من جهاز وألصقه في الآخر (أو اختره من القائمة)</li>
          <li>على الجهازين: Start Audio → Init Mic</li>
          <li>على جهاز واحد: Call Peer</li>
          <li>على الجهازين: Enable Mic للتحدث</li>
        </ol>
      </div>
    </div>
  );
}
