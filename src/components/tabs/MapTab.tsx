import { useState, useMemo } from "react";
import PageHeader from "./PageHeader";
import { useVehicles } from "@/hooks/useVehicles";
import { useStudentSchedules, findStudentForCar } from "@/hooks/useStudentSchedules";
import { Car, GraduationCap, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "active" | "stopped" | "maintenance";

const MapTab = () => {
  const { data: vehicles = [] } = useVehicles();
  const { data: schedules = [] } = useStudentSchedules();
  const [filter, setFilter] = useState<"all" | Status>("all");

  // Pseudo-random but stable status per car for demo
  const enriched = useMemo(() => vehicles.map((v, i) => {
    const seed = (v.car_number.charCodeAt(0) + i) % 10;
    const status: Status = seed < 7 ? "active" : seed < 9 ? "stopped" : "maintenance";
    const speed = status === "active" ? 20 + (seed * 5) % 60 : 0;
    const student = findStudentForCar(schedules, v.car_number);
    return { ...v, status, speed, student };
  }), [vehicles, schedules]);

  const filtered = filter === "all" ? enriched : enriched.filter(e => e.status === filter);
  const counts = {
    all: enriched.length,
    active: enriched.filter(e => e.status === "active").length,
    stopped: enriched.filter(e => e.status === "stopped").length,
    maintenance: enriched.filter(e => e.status === "maintenance").length,
  };

  const dot = (s: Status) => s === "active" ? "bg-emerald-400" : s === "stopped" ? "bg-amber-400" : "bg-rose-400";

  return (
    <div className="h-full overflow-y-auto pb-24">
      <PageHeader title="Vehicles Map" subtitle="Live fleet tracking" />
      <div className="px-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          {([["all", "All"], ["active", "Active"], ["stopped", "Stopped"], ["maintenance", "Service"]] as const).map(([k, lbl]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={cn("glass-card px-3 py-1.5 text-xs font-bold flex items-center gap-1.5", filter === k ? "bg-cyan-400/20 text-cyan-300 border-cyan-400/40" : "text-white/70")}>
              {k !== "all" && <span className={cn("w-1.5 h-1.5 rounded-full", dot(k as Status))} />}
              {lbl} ({counts[k as keyof typeof counts]})
            </button>
          ))}
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-rose-400" />
            <div>
              <div className="text-sm font-bold text-white">Live tracking — Abu Dhabi</div>
              <div className="text-[11px] text-white/50">Locations refresh every 3 seconds</div>
            </div>
          </div>
          <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-400/30 px-2 py-1 rounded">● LIVE</span>
        </div>

        {filtered.map((v) => (
          <div key={v.car_number} className="glass-card p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={cn("w-12 h-12 rounded-full border-2 flex items-center justify-center", v.status === "active" ? "border-emerald-400" : v.status === "stopped" ? "border-amber-400" : "border-rose-400")}>
                  <Car className="w-6 h-6 text-rose-300" />
                </div>
                <div>
                  <div className="text-base font-bold text-white">AD {v.car_number}</div>
                  <div className="text-xs text-white/60">{v.type} · Box {v.box_number}</div>
                  {v.student && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-white/80">
                      <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{v.student.student_name}</span>
                      {v.student.session_number && <span className="ml-1 text-[10px] bg-cyan-400/15 text-cyan-300 px-1.5 py-0.5 rounded">S{v.student.session_number}</span>}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className={cn("text-base font-bold", v.status === "active" ? "text-emerald-400" : "text-white/40")}>{v.speed} km/h</div>
                <div className="text-[11px] text-white/50 capitalize">{v.status}</div>
              </div>
            </div>
          </div>
        ))}

        {!filtered.length && <div className="glass-card p-8 text-center text-white/50 text-sm">No vehicles</div>}
      </div>
    </div>
  );
};
export default MapTab;
