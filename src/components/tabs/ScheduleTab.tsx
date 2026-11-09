import { useEffect, useState } from "react";
import PageHeader from "./PageHeader";
import { SCHEDULE, getCurrentSlot, ScheduleSlot } from "@/lib/schedule";
import { cn } from "@/lib/utils";

const groupColor = (kind: ScheduleSlot["kind"]) => {
  switch (kind) {
    case "overtime": return "border-amber-400/70";
    case "countdown": return "border-rose-400/70";
    case "break": return "border-white/20";
    default: return "border-cyan-400/70";
  }
};

const Section = ({ title, items, currentLabel, color }: { title: string; items: ScheduleSlot[]; currentLabel?: string; color: string }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 px-1">
      <h3 className="text-base font-bold text-white">{title}</h3>
      <div className={cn("h-0.5 flex-1 rounded-full", color)} />
    </div>
    {items.map((s, i) => {
      const isCurrent = currentLabel && s.label === currentLabel && s.start === currentLabel;
      const current = currentLabel === `${s.shift}|${s.label}|${s.start}`;
      return (
        <div
          key={i}
          className={cn(
            "glass-card p-3 flex items-center justify-between border-l-4 pl-4",
            groupColor(s.kind),
            current && "ring-2 ring-cyan-400/60 bg-cyan-400/5"
          )}
        >
          <div>
            <div className={cn("text-sm font-bold", current ? "text-cyan-300" : "text-white")}>{s.label}</div>
            {current && <div className="text-[10px] text-cyan-400/80 mt-0.5">● Current slot</div>}
          </div>
          <div className="font-mono text-white/80 text-sm">{s.start} – {s.end}</div>
        </div>
      );
    })}
  </div>
);

const ScheduleTab = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 5000); return () => clearInterval(id); }, []);
  const info = getCurrentSlot(now);
  const currentKey = info.slot ? `${info.slot.shift}|${info.slot.label}|${info.slot.start}` : "";

  const overtime = SCHEDULE.filter(s => s.shift === "Overtime");
  const morning = SCHEDULE.filter(s => s.shift === "Morning");
  const evening = SCHEDULE.filter(s => s.shift === "Evening");

  return (
    <div className="h-full overflow-y-auto pb-24">
      <PageHeader title="Schedule" subtitle="All sessions and breaks" />
      <div className="px-5 space-y-6">
        <Section title="Overtime" items={overtime} currentLabel={currentKey} color="bg-amber-400/60" />
        <Section title="Morning Shift" items={morning} currentLabel={currentKey} color="bg-cyan-400/60" />
        <Section title="Evening Shift" items={evening} currentLabel={currentKey} color="bg-cyan-400/60" />
      </div>
    </div>
  );
};
export default ScheduleTab;
