import { useState } from "react";
import PageHeader from "./PageHeader";
import { useInstructors } from "@/hooks/useInstructors";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CHANNELS = ["Main", "Aria 2", "Admin"] as const;
type Channel = typeof CHANNELS[number];

const ControlTab = () => {
  const { data: instructors = [] } = useInstructors();
  const [assignments, setAssignments] = useState<Record<number, Channel>>({});
  const [connected, setConnected] = useState<Record<number, boolean>>({});

  const counts = CHANNELS.reduce((acc, ch) => {
    acc[ch] = instructors.filter(i => (assignments[i.employee_id] ?? "Main") === ch).length;
    return acc;
  }, {} as Record<Channel, number>);
  const onlineCount = Object.values(connected).filter(Boolean).length;

  const resetAll = async () => {
    setAssignments({});
    await supabase.rpc("reset_room_state");
    toast.success("All users reset to Main channel");
  };

  return (
    <div className="h-full overflow-y-auto pb-24">
      <PageHeader title="Control Panel" subtitle="Manage users and channels" />
      <div className="px-5 space-y-3">
        <div className="grid grid-cols-5 gap-2">
          {CHANNELS.map(ch => (
            <div key={ch} className="glass-card py-3 text-center">
              <div className="text-2xl font-black text-white">{counts[ch]}</div>
              <div className="text-[10px] text-white/60 mt-0.5">{ch}</div>
            </div>
          ))}
          <div className="glass-card py-3 text-center bg-emerald-500/10 border-emerald-400/30">
            <div className="text-2xl font-black text-emerald-400">{onlineCount}</div>
            <div className="text-[10px] text-emerald-300 mt-0.5">Online</div>
          </div>
          <div className="glass-card py-3 text-center bg-cyan-500/10 border-cyan-400/30">
            <div className="text-2xl font-black text-cyan-400">{instructors.length}</div>
            <div className="text-[10px] text-cyan-300 mt-0.5">Total</div>
          </div>
        </div>

        <button onClick={resetAll} className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-sm transition">
          Reset all to Main channel
        </button>

        {instructors.map(p => {
          const ch = assignments[p.employee_id] ?? "Main";
          const isOn = connected[p.employee_id] ?? false;
          return (
            <div key={p.employee_id} className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center text-white font-black overflow-hidden">
                    {p.photo_url ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" /> : p.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{p.name.toUpperCase()}</div>
                    <div className="text-[11px] text-white/50">{p.position} · ID: {p.employee_id}</div>
                  </div>
                </div>
                <span className={cn("text-[10px] px-2 py-1 rounded-md border", isOn ? "bg-emerald-500/15 text-emerald-400 border-emerald-400/30" : "bg-rose-500/15 text-rose-400 border-rose-400/30")}>
                  {isOn ? "Online" : "Offline"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/50">Channel: <span className="text-cyan-400 font-bold">{ch}</span></span>
                <div className="flex gap-1.5">
                  {CHANNELS.map(c => (
                    <button key={c} onClick={() => setAssignments(a => ({ ...a, [p.employee_id]: c }))}
                      className={cn("px-3 py-1 rounded-md text-[11px] font-bold transition border",
                        ch === c ? "bg-cyan-400 text-black border-cyan-400" : "text-white/70 border-white/15 hover:bg-white/5")}>
                      {c}
                    </button>
                  ))}
                  <button onClick={() => setConnected(s => ({ ...s, [p.employee_id]: !s[p.employee_id] }))}
                    className={cn("px-3 py-1 rounded-md text-[11px] font-bold transition", isOn ? "bg-rose-500 text-white" : "bg-emerald-500 text-black")}>
                    {isOn ? "Disconnect" : "Connect"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default ControlTab;
