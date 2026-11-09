import { Settings, ShieldCheck, LayoutGrid, Map, Users, CalendarDays, Timer, Radio } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

export type TabKey =
  | "settings" | "control" | "widget" | "map" | "contacts" | "schedule" | "timer" | "radio";

const TABS: { key: TabKey; label: string; icon: typeof Settings }[] = [
  { key: "settings", label: "Settings", icon: Settings },
  { key: "control", label: "Control", icon: ShieldCheck },
  { key: "widget", label: "Widget", icon: LayoutGrid },
  { key: "map", label: "Map", icon: Map },
  { key: "contacts", label: "Contacts", icon: Users },
  { key: "schedule", label: "Schedule", icon: CalendarDays },
  { key: "timer", label: "Timer", icon: Timer },
  { key: "radio", label: "Radio", icon: Radio },
];

export const useActiveTab = (): TabKey => {
  const [params] = useSearchParams();
  const t = (params.get("tab") || "radio") as TabKey;
  return TABS.find(x => x.key === t) ? t : "radio";
};

const BottomNav = () => {
  const [params, setParams] = useSearchParams();
  const active = (params.get("tab") || "radio") as TabKey;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-nav px-1 pt-1.5 pb-[max(env(safe-area-inset-bottom),6px)]">
      <ul className="flex items-end justify-around max-w-[640px] mx-auto">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = active === key;
          return (
            <li key={key} className="flex-1">
              <button
                onClick={() => {
                  const next = new URLSearchParams(params);
                  next.set("tab", key);
                  setParams(next, { replace: true });
                }}
                className={cn(
                  "w-full flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-colors",
                  isActive ? "text-cyan-400" : "text-white/45 hover:text-white/70"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]")} />
                <span className="text-[9px] font-medium tracking-wide">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomNav;
