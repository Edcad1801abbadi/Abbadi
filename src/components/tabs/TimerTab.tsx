import { useEffect, useState } from "react";
import PageHeader from "./PageHeader";
import { getCurrentSlot, fmtCountdown } from "@/lib/schedule";

const TimerTab = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  const info = getCurrentSlot(now);
  const slot = info.slot ?? info.next;
  const progressPct = Math.round(info.progress * 100);
  const C = 2 * Math.PI * 110;
  const dash = C * info.progress;

  return (
    <div className="h-full overflow-y-auto pb-24">
      <PageHeader title="Timer" subtitle="Live class countdown" />
      <div className="px-5 space-y-5">
        <div className="glass-card p-6 flex flex-col items-center">
          <div className="relative w-[260px] h-[260px]">
            <svg viewBox="0 0 240 240" className="w-full h-full -rotate-90">
              <circle cx="120" cy="120" r="110" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
              <circle cx="120" cy="120" r="110" fill="none" stroke="rgb(34,211,238)" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${dash} ${C}`} style={{ transition: "stroke-dasharray 0.5s linear" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl font-black text-cyan-400 font-mono tabular-nums">{fmtCountdown(info.remainingSec)}</div>
              <div className="text-xs text-white/50 mt-2">minutes remaining</div>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Current</span>
            <span className="text-sm font-bold text-white">{slot?.label ?? "—"}</span>
          </div>
          <div className="h-px bg-white/10" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Start</span>
            <span className="font-mono text-white">{slot?.start ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">End</span>
            <span className="font-mono text-white">{slot?.end ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Shift</span>
            <span className="text-white">{slot?.shift ?? "—"}</span>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/50">Progress</span>
            <span className="text-sm font-bold text-cyan-400">{progressPct}%</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {info.next && (
          <div className="glass-card p-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-white/40 uppercase tracking-wide">Next</div>
              <div className="text-sm text-white font-bold mt-0.5">{info.next.label}</div>
            </div>
            <div className="font-mono text-cyan-400">{info.next.start}</div>
          </div>
        )}
      </div>
    </div>
  );
};
export default TimerTab;
