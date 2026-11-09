import { useState, useMemo, useEffect } from "react";

interface StudentInfo {
  carNumber?: string;
  name?: string;
  boxNumber?: string;
  type?: string;
}

interface LCDScreenProps {
  isTalking: boolean;
  currentView: string;
  selectedTarget: string | null;
  dialNumber: string;
  signalStrength: number;
  roomCode: string;
  name: string;
  connectedCount?: number;
  studentInfo?: StudentInfo | null;
}

const RAMADAN_START = new Date(2026, 2, 17);

const SCHEDULE: { start: string; end: string; label: string; shift: string; kind: "lesson" | "overtime" | "break" | "countdown" }[] = [
  // Morning shift
  { start: "04:20", end: "05:05", label: "Overtime 1", shift: "Morning", kind: "overtime" },
  { start: "05:10", end: "05:55", label: "Overtime 2", shift: "Morning", kind: "overtime" },
  { start: "05:55", end: "06:20", label: "Pre-Shift Countdown", shift: "Morning", kind: "countdown" },
  { start: "06:20", end: "07:05", label: "Lesson 1", shift: "Morning", kind: "lesson" },
  { start: "07:10", end: "07:55", label: "Lesson 2", shift: "Morning", kind: "lesson" },
  { start: "08:00", end: "08:45", label: "Lesson 3", shift: "Morning", kind: "lesson" },
  { start: "08:50", end: "09:35", label: "Lesson 4", shift: "Morning", kind: "lesson" },
  { start: "09:35", end: "10:00", label: "Main Break", shift: "Morning", kind: "break" },
  { start: "10:00", end: "10:45", label: "Lesson 5", shift: "Morning", kind: "lesson" },
  { start: "10:50", end: "11:35", label: "Lesson 6", shift: "Morning", kind: "lesson" },
  { start: "11:40", end: "12:25", label: "Lesson 7", shift: "Morning", kind: "lesson" },
  { start: "12:30", end: "13:15", label: "Lesson 8", shift: "Morning", kind: "lesson" },
  { start: "13:20", end: "14:05", label: "Lesson 9", shift: "Morning", kind: "lesson" },
  // Evening shift
  { start: "14:15", end: "15:00", label: "Lesson 1", shift: "Evening", kind: "lesson" },
  { start: "15:05", end: "15:50", label: "Lesson 2", shift: "Evening", kind: "lesson" },
  { start: "15:55", end: "16:40", label: "Lesson 3", shift: "Evening", kind: "lesson" },
  { start: "16:45", end: "17:30", label: "Lesson 4", shift: "Evening", kind: "lesson" },
  { start: "17:30", end: "17:55", label: "Main Break", shift: "Evening", kind: "break" },
  { start: "17:55", end: "18:40", label: "Lesson 5", shift: "Evening", kind: "lesson" },
  { start: "18:45", end: "19:30", label: "Lesson 6", shift: "Evening", kind: "lesson" },
  { start: "19:35", end: "20:20", label: "Lesson 7", shift: "Evening", kind: "lesson" },
  { start: "20:25", end: "21:10", label: "Lesson 8", shift: "Evening", kind: "lesson" },
  { start: "21:15", end: "22:00", label: "Lesson 9", shift: "Evening", kind: "lesson" },
  { start: "22:15", end: "23:00", label: "Overtime 1", shift: "Evening", kind: "overtime" },
  { start: "23:05", end: "23:50", label: "Overtime 2", shift: "Evening", kind: "overtime" },
];

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const LCDScreen = ({
  isTalking, currentView, selectedTarget, dialNumber,
  signalStrength, roomCode, name, connectedCount = 0, studentInfo,
}: LCDScreenProps) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const time = useMemo(() => {
    const h = now.getHours().toString().padStart(2, "0");
    const m = now.getMinutes().toString().padStart(2, "0");
    const s = now.getSeconds().toString().padStart(2, "0");
    return { h, m, s };
  }, [now]);

  const dayName = useMemo(() => {
    const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    return days[now.getDay()];
  }, [now]);

  const monthName = useMemo(() => {
    const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    return months[now.getMonth()];
  }, [now]);

  const ramadanDay = useMemo(() => {
    const diff = Math.floor((now.getTime() - RAMADAN_START.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (diff >= 1 && diff <= 30) return diff;
    return null;
  }, [now]);

  const classInfo = useMemo(() => {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const nowSec = now.getSeconds();
    const fmt = (totalSec: number) => {
      const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
      const s = (totalSec % 60).toString().padStart(2, "0");
      return `${m}:${s}`;
    };

    for (let i = 0; i < SCHEDULE.length; i++) {
      const slot = SCHEDULE[i];
      const startMin = toMinutes(slot.start);
      const endMin = toMinutes(slot.end);
      if (nowMin >= startMin && nowMin < endMin) {
        const remainTotal = (endMin - nowMin - 1) * 60 + (59 - nowSec);
        return { remaining: fmt(remainTotal), label: slot.label, shift: slot.shift, kind: slot.kind };
      }
      const nextSlot = SCHEDULE[i + 1];
      if (nextSlot) {
        const nextStart = toMinutes(nextSlot.start);
        if (nowMin >= endMin && nowMin < nextStart) {
          const remainTotal = (nextStart - nowMin - 1) * 60 + (59 - nowSec);
          return { remaining: fmt(remainTotal), label: "Break", shift: slot.shift, kind: "break" as const };
        }
      }
    }

    const firstStart = toMinutes(SCHEDULE[0].start);
    if (nowMin < firstStart) return { remaining: "—", label: "Before shift", shift: "", kind: "break" as const };
    return { remaining: "—", label: "After shift", shift: "", kind: "break" as const };
  }, [now]);

  const signalLevel = Math.min(Math.max(signalStrength, 0), 5);

  return (
    <div className="relative rounded-xl overflow-hidden border-2 border-neutral-600 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
      <div className="bg-gradient-to-b from-[#1a2a1a] to-[#0d1a0d] p-4 min-h-[220px] relative">
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,255,0,0.03)_2px,rgba(0,255,0,0.03)_4px)]" />

        <div className="flex items-center justify-between mb-3 relative z-10">
          {/* Signal Strength - Professional Bars */}
          <div className="flex items-end gap-[2px]" title={`Signal: ${signalLevel}/5`}>
            {Array.from({ length: 5 }, (_, i) => {
              const isActive = i < signalLevel;
              const barHeight = 4 + (i + 1) * 3;
              const color = isActive
                ? signalLevel <= 1 ? '#ff3333' : signalLevel <= 2 ? '#ffa500' : '#00ff66'
                : 'rgba(0,255,102,0.12)';
              return (
                <div
                  key={i}
                  className="w-[4px] rounded-[1px]"
                  style={{
                    height: `${barHeight}px`,
                    backgroundColor: color,
                    transition: 'background-color 0.6s ease-in-out, opacity 0.4s ease',
                    opacity: isActive ? 1 : 0.3,
                  }}
                />
              );
            })}
          </div>

          <span className="text-[10px] font-mono text-[#00ff66]/70 tracking-wider">EDC TOWER</span>

          {/* Battery Icon */}
          <div className="flex items-center gap-[3px]">
            <div className="w-[18px] h-[10px] border border-[#00ff66]/50 rounded-[2px] p-[1.5px] flex items-center gap-[1px] relative">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className={`flex-1 h-full rounded-[0.5px] ${i < 3 ? 'bg-[#00ff66]/80' : 'bg-[#00ff66]/30'}`} />
              ))}
              <div className="absolute -right-[3px] top-1/2 -translate-y-1/2 w-[2px] h-[5px] bg-[#00ff66]/40 rounded-r-[1px]" />
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <div className="text-center mb-2">
            <div className="font-mono text-white text-4xl font-bold tracking-wider leading-none" dir="ltr">
              {time.h}:{time.m}
              <span className="text-lg text-[#ff3333] ml-1">{time.s}</span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-[#00ff66]/80">{dayName}</span>
              <span className="text-[11px] font-mono text-[#00ff66]/60">{monthName}</span>
            </div>
            <span className="text-[13px] font-mono text-[#ff3333] font-bold" dir="ltr">{now.getDate()}</span>
            {ramadanDay && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono text-[#ffa500]/60">رمضان</span>
                <span className="text-[13px] font-mono text-[#ffa500] font-bold">{ramadanDay}</span>
              </div>
            )}
          </div>

          <div className="h-px bg-[#00ff66]/20 mb-3" />

          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <div className={`text-[11px] font-mono font-bold ${
                classInfo.kind === "overtime" ? "text-[#ffa500]" :
                classInfo.kind === "break" ? "text-[#00ff66]/60" :
                classInfo.kind === "countdown" ? "text-[#ff3333]" : "text-[#00ff66]"
              }`}>{classInfo.label}</div>
              {classInfo.shift && (
                <span className="text-[9px] font-mono text-[#00ff66]/50">[{classInfo.shift}]</span>
              )}
            </div>
            <div className="font-mono text-[#00ff66] text-lg font-bold" dir="ltr">⏱ {classInfo.remaining}</div>
          </div>

          <div className="h-px bg-[#00ff66]/20 mb-2" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#00ff66]/50">Target:</span>
            <span className="text-[12px] font-mono text-[#00ff66] truncate max-w-[200px]">
              {selectedTarget || "Public broadcast"}
            </span>
          </div>

          {studentInfo && (studentInfo.carNumber || studentInfo.name) && (
            <div className="mt-2 rounded-md border border-[#00ff66]/30 bg-[#00ff66]/5 p-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#00ff66]/60">Student</span>
                <span className="text-[11px] font-mono text-[#00ff66] truncate max-w-[180px]">
                  {studentInfo.name || "—"}
                </span>
              </div>
              {studentInfo.carNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#00ff66]/60">Car #</span>
                  <span className="text-[11px] font-mono text-[#00ff66] font-bold" dir="ltr">{studentInfo.carNumber}</span>
                </div>
              )}
              {studentInfo.boxNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#00ff66]/60">Box</span>
                  <span className="text-[11px] font-mono text-[#00ff66]" dir="ltr">{studentInfo.boxNumber}</span>
                </div>
              )}
              {studentInfo.type && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#00ff66]/60">Type</span>
                  <span className="text-[11px] font-mono text-[#00ff66]">{studentInfo.type}</span>
                </div>
              )}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#00ff66]/50">Connected:</span>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-[3px]">
                {Array.from({ length: Math.min(connectedCount, 8) }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#00ff66] animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
                {connectedCount === 0 && <div className="w-1.5 h-1.5 rounded-full bg-[#00ff66]/20" />}
              </div>
              <span className="text-[12px] font-mono text-[#00ff66] font-bold" dir="ltr">{connectedCount}</span>
            </div>
          </div>

          {isTalking && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="flex items-center gap-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="w-[3px] bg-[#ff3333] rounded-full animate-pulse" style={{ height: `${8 + Math.random() * 16}px`, animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
              <span className="text-[11px] font-mono text-[#ff3333] animate-pulse">TX</span>
            </div>
          )}

          {currentView === "dial" && dialNumber && (
            <div className="mt-2 text-center">
              <div className="font-mono text-[#00ff66] text-2xl font-bold tracking-widest" dir="ltr">► {dialNumber}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LCDScreen;
