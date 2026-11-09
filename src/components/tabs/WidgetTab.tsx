import { useEffect, useState } from "react";
import PageHeader from "./PageHeader";
import { getCurrentSlot, fmtCountdown } from "@/lib/schedule";

const WidgetTab = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  const info = getCurrentSlot(now);
  const slot = info.slot ?? info.next;
  const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
  const progressPct = Math.round(info.progress * 100);

  return (
    <div className="h-full overflow-y-auto pb-24">
      <PageHeader title="Widget" subtitle="Home-screen previews" />
      <div className="px-5 space-y-5">
        <div className="glass-card p-4 border-amber-400/30 bg-amber-400/5">
          <div className="text-amber-300 font-bold text-sm mb-1">Home-Screen Widget</div>
          <p className="text-xs text-white/70 leading-relaxed">
            Add this widget to your home screen to track training and timer without opening the app.
          </p>
          <ul className="text-[11px] text-white/50 mt-2 space-y-1 list-disc pl-4">
            <li>iOS: long-press home screen → "+" → search for EDC TOWER</li>
            <li>Android: long-press → Widgets → EDC TOWER</li>
          </ul>
        </div>

        {/* Small widget */}
        <div>
          <div className="text-xs text-white/50 mb-2 px-1">Small (1×2)</div>
          <div className="glass-card p-4 flex items-center justify-between border-dashed">
            <div className="text-2xl font-black text-emerald-400 font-mono">{fmtCountdown(info.remainingSec)}</div>
            <div className="text-right">
              <div className="text-[10px] text-white/50 flex items-center gap-1 justify-end">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{time}
              </div>
              <div className="text-xs text-emerald-400 font-bold">{slot?.label ?? "—"}</div>
            </div>
          </div>
        </div>

        {/* Medium widget */}
        <div>
          <div className="text-xs text-white/50 mb-2 px-1">Medium (2×4)</div>
          <div className="glass-card p-4 border-dashed">
            <div className="flex items-center justify-between mb-3">
              <div className="text-amber-400 font-black tracking-wide">EDC TOWER</div>
              <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-400/30 px-2 py-0.5 rounded">● Connected</span>
            </div>
            <div className="bg-black/40 rounded-xl p-4">
              <div className="flex items-center justify-between text-white/60 text-xs mb-2">
                <span>{slot?.shift ?? ""}</span>
                <span className="text-emerald-400 font-bold">{slot?.label ?? "—"}</span>
              </div>
              <div className="text-center text-emerald-400 text-4xl font-black font-mono my-3">{fmtCountdown(info.remainingSec)}</div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-white/40 mt-1.5 font-mono">
                <span>{slot?.start ?? "--:--"}</span>
                <span>{slot?.end ?? "--:--"}</span>
              </div>
            </div>
            {info.next && (
              <div className="flex items-center justify-between mt-3 px-2 py-2 bg-cyan-400/10 rounded-lg border border-cyan-400/20">
                <span className="text-[11px] text-white/60">Next</span>
                <span className="text-cyan-400 text-sm font-bold">{info.next.label}</span>
                <span className="text-cyan-400 font-mono text-sm">{info.next.start}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default WidgetTab;
