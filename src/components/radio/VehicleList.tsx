import { Car, GraduationCap, Clock, Star, MessageSquare, PenLine, UserCheck, UserX, Languages, Box } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useVehicles } from "@/hooks/useVehicles";
import {
  useStudentSchedules,
  useUpdateStudentSchedule,
  findStudentForCar,
  type StudentSchedule,
  type Attendance,
} from "@/hooks/useStudentSchedules";

interface VehicleListProps {
  onSelect: (vehicle: string) => void;
}

// Per-tower palette (Tower 2 blue, Tower 3 violet, Tower 5 gold+multilang)
type Palette = {
  ring: string; bg: string; hover: string; text: string; chip: string; accent: string; label: string;
};
const TOWER_PALETTES: Record<string, Palette> = {
  "Tower 2": {
    label: "T2",
    ring: "border-sky-500/40",
    bg: "bg-sky-500/5",
    hover: "hover:bg-sky-500/15",
    text: "text-sky-300",
    chip: "bg-sky-500/15 border-sky-500/40 text-sky-300",
    accent: "text-sky-400",
  },
  "Tower 3": {
    label: "T3",
    ring: "border-violet-500/40",
    bg: "bg-violet-500/5",
    hover: "hover:bg-violet-500/15",
    text: "text-violet-300",
    chip: "bg-violet-500/15 border-violet-500/40 text-violet-300",
    accent: "text-violet-400",
  },
  "Tower 5": {
    label: "T5",
    ring: "border-amber-500/40",
    bg: "bg-amber-500/5",
    hover: "hover:bg-amber-500/15",
    text: "text-amber-300",
    chip: "bg-amber-500/15 border-amber-500/40 text-amber-300",
    accent: "text-amber-400",
  },
};
const DEFAULT_PALETTE: Palette = {
  label: "—",
  ring: "border-emerald-500/40",
  bg: "bg-emerald-500/5",
  hover: "hover:bg-emerald-500/15",
  text: "text-emerald-300",
  chip: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
  accent: "text-emerald-400",
};
const paletteFor = (tower?: string | null) => TOWER_PALETTES[tower ?? ""] ?? DEFAULT_PALETTE;

const VehicleList = ({ onSelect }: VehicleListProps) => {
  const { data: vehicles = [], isLoading } = useVehicles();
  const { data: schedules = [] } = useStudentSchedules();

  // Anchor "now" to Asia/Dubai wall-clock so it matches start_time/end_time
  // regardless of the viewer's device timezone or server TZ.
  const getDubaiMinutes = () => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dubai",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());
    const h = Number(parts.find(p => p.type === "hour")?.value ?? 0);
    const m = Number(parts.find(p => p.type === "minute")?.value ?? 0);
    return (h % 24) * 60 + m;
  };
  const [nowMin, setNowMin] = useState(getDubaiMinutes);
  useEffect(() => {
    const t = setInterval(() => setNowMin(getDubaiMinutes()), 15000);
    return () => clearInterval(t);
  }, []);

  const DAY = 24 * 60;
  const parseHM = (t?: string | null): number | null => {
    if (!t) return null;
    const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(t);
    if (!m) return null;
    const h = Number(m[1]);
    const mm = Number(m[2]);
    if (!Number.isFinite(h) || !Number.isFinite(mm)) return null;
    if (h < 0 || h > 24 || mm < 0 || mm > 59) return null;
    return ((h * 60 + mm) % DAY + DAY) % DAY;
  };

  const isInSession = (s?: StudentSchedule | null) => {
    const start = parseHM(s?.start_time);
    const end = parseHM(s?.end_time);
    if (start === null || end === null) return false;
    if (end === start) return false;
    // Handle sessions that cross midnight (e.g., 23:30 → 00:30)
    if (end > start) return nowMin >= start && nowMin < end;
    return nowMin >= start || nowMin < end;
  };

  const liveVehicles = useMemo(() => {
    return vehicles
      .map(v => {
        const sched = findStudentForCar(schedules, v.car_number, nowMin);
        return { v, sched, active: isInSession(sched) };
      })
      .filter(x => x.active && x.sched)
      .map(x => {
        const start = parseHM(x.sched?.start_time) ?? 0;
        // Minutes elapsed since the session started, wrapping across midnight.
        const elapsed = ((nowMin - start) % DAY + DAY) % DAY;
        return { ...x, startMin: start, proximity: elapsed };
      })
      .sort((a, b) => {
        if (a.proximity !== b.proximity) return a.proximity - b.proximity;
        if (a.startMin !== b.startMin) return a.startMin - b.startMin;
        return a.v.car_number.localeCompare(b.v.car_number);
      });
  }, [vehicles, schedules, nowMin]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
        <span className="w-4 h-4 animate-spin border-2 border-current border-t-transparent rounded-full" /> Loading...
      </div>
    );
  }

  if (liveVehicles.length === 0) {
    return (
      <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 p-6 text-center">
        <GraduationCap className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
        <p className="text-xs text-muted-foreground">No students in session right now</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[26rem] overflow-y-auto pr-1">
      <div className="px-2 py-1.5 text-[10px] font-bold text-emerald-400 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        {liveVehicles.length} student{liveVehicles.length > 1 ? "s" : ""} in session now
      </div>
      {liveVehicles.map(({ v, sched }) => (
        <StudentCard
          key={sched!.id}
          carNumber={v.car_number}
          boxNumber={v.box_number}
          vehicleType={v.type}
          student={sched!}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

const StudentCard = ({
  carNumber, boxNumber, vehicleType, student, onSelect,
}: {
  carNumber: string;
  boxNumber: string;
  vehicleType: string;
  student: StudentSchedule;
  onSelect: (v: string) => void;
}) => {
  const p = paletteFor(student.tower);
  const { mutate: update, isPending } = useUpdateStudentSchedule();
  const isTower5 = student.tower === "Tower 5";

  const cycleRating = (field: "md_rating" | "wk_rating") => {
    const current = student[field] ?? 0;
    const next = current >= 5 ? 0 : current + 1;
    update({ id: student.id, patch: { [field]: next || null } });
  };

  const editRemark = () => {
    const v = window.prompt("Remark", student.remark ?? "");
    if (v !== null) update({ id: student.id, patch: { remark: v.trim() || null } });
  };

  const editSignature = () => {
    const v = window.prompt("Signature (name or URL)", student.signature_url ?? "");
    if (v !== null) update({ id: student.id, patch: { signature_url: v.trim() || null } });
  };

  const cycleAttendance = () => {
    const order: Attendance[] = ["present", "late", "absent"];
    const cur = (student.attendance as Attendance) ?? "present";
    const next = order[(order.indexOf(cur) + 1) % order.length];
    update({ id: student.id, patch: { attendance: next } });
  };

  const attendance = (student.attendance as Attendance) ?? "present";
  const attendanceStyle: Record<Attendance, string> = {
    present: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
    late: "bg-amber-500/15 border-amber-500/40 text-amber-300",
    absent: "bg-rose-500/15 border-rose-500/40 text-rose-300",
  };
  const AttIcon = attendance === "absent" ? UserX : UserCheck;

  const carColor = vehicleType === "manual" ? "text-orange-400" : "text-primary";

  return (
    <div
      className={`rounded-xl border ${p.ring} ${p.bg} ${isPending ? "opacity-70" : ""} overflow-hidden`}
    >
      {/* Header row — clickable to dial car */}
      <button
        onClick={() => onSelect(`Car ${carNumber}`)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${p.hover}`}
      >
        <Car className={`w-4 h-4 ${carColor} flex-shrink-0`} />
        <span className={`font-mono text-sm ${carColor} font-bold`} dir="ltr">{carNumber}</span>
        <span className="text-[10px] font-mono text-white/60 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded flex items-center gap-1">
          <Box className="w-2.5 h-2.5" /> BOX {boxNumber}
        </span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${p.chip}`}>
          {p.label}
        </span>
        <span className="ml-auto text-[9px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/40 px-1.5 py-0.5 rounded uppercase tracking-wide flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
        </span>
      </button>

      {/* Student identity */}
      <div className="px-3 pb-2 flex items-center gap-2 text-[12px]">
        <GraduationCap className={`w-3.5 h-3.5 ${p.accent} flex-shrink-0`} />
        <span className="truncate font-semibold text-white" dir="ltr">{student.student_name}</span>
        {student.session_number != null && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${p.chip}`}>
            S{student.session_number}
          </span>
        )}
      </div>

      {(student.start_time || student.end_time) && (
        <div className={`px-3 pb-2 flex items-center gap-1.5 text-[10px] font-mono ${p.text}/80`}>
          <Clock className="w-3 h-3" />
          <span>{student.start_time ?? "--:--"} → {student.end_time ?? "--:--"}</span>
        </div>
      )}

      {/* Languages (Tower 5) */}
      {isTower5 && (
        <div className="px-3 pb-2 flex items-center gap-1.5 flex-wrap">
          <Languages className="w-3 h-3 text-amber-400" />
          {(student.languages ?? []).length > 0 ? (
            (student.languages ?? []).slice(0, 5).map((lg, i) => (
              <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-amber-500/10 border-amber-500/40 text-amber-200 uppercase">
                {lg}
              </span>
            ))
          ) : (
            <span className="text-[9px] text-amber-300/60 italic">No languages set</span>
          )}
        </div>
      )}

      {/* Ratings + attendance + actions */}
      <div className="px-3 pb-2.5 pt-1 border-t border-white/5 flex items-center gap-1.5 flex-wrap">
        <RatingChip label="MD" value={student.md_rating} onClick={() => cycleRating("md_rating")} color="text-cyan-300" />
        <RatingChip label="WK" value={student.wk_rating} onClick={() => cycleRating("wk_rating")} color="text-fuchsia-300" />

        <button
          onClick={cycleAttendance}
          className={`ml-auto text-[9px] font-bold px-2 py-1 rounded border uppercase flex items-center gap-1 ${attendanceStyle[attendance]}`}
        >
          <AttIcon className="w-3 h-3" /> {attendance}
        </button>

        <button
          onClick={editRemark}
          className={`text-[9px] font-bold px-2 py-1 rounded border flex items-center gap-1 ${
            student.remark ? "bg-white/10 border-white/20 text-white" : "bg-white/5 border-white/10 text-white/50"
          }`}
          title={student.remark ?? "Add remark"}
        >
          <MessageSquare className="w-3 h-3" /> Remark
        </button>

        <button
          onClick={editSignature}
          className={`text-[9px] font-bold px-2 py-1 rounded border flex items-center gap-1 ${
            student.signature_url ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" : "bg-white/5 border-white/10 text-white/50"
          }`}
          title={student.signature_url ?? "Add signature"}
        >
          <PenLine className="w-3 h-3" /> Sign
        </button>
      </div>

      {student.remark && (
        <div className="px-3 pb-2 -mt-1 text-[10px] text-white/70 italic truncate" title={student.remark}>
          “{student.remark}”
        </div>
      )}
    </div>
  );
};

const RatingChip = ({
  label, value, onClick, color,
}: { label: string; value: number | null; onClick: () => void; color: string }) => (
  <button
    onClick={onClick}
    className="text-[9px] font-bold px-2 py-1 rounded border bg-white/5 border-white/10 flex items-center gap-1"
  >
    <span className={`${color}`}>{label}</span>
    <span className="flex items-center gap-[1px]">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`w-2.5 h-2.5 ${n <= (value ?? 0) ? "fill-amber-400 text-amber-400" : "text-white/25"}`}
        />
      ))}
    </span>
  </button>
);

export default VehicleList;
