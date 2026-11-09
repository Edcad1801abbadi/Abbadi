import { useState, useMemo, useEffect } from "react";

interface LCDScreenProps {
  isTalking: boolean;
  currentView: string;
  selectedTarget: string | null;
  dialNumber: string;
  signalStrength: number;
  roomCode: string;
  name: string;
  connectedCount?: number;
}

const RAMADAN_START = new Date(2026, 2, 17);

const SCHEDULE = [
  // Morning shift
  { session: 1, start: "06:10", end: "06:55" },
  { session: 2, start: "07:00", end: "07:45" },
  { session: 3, start: "07:50", end: "08:35" },
  { session: 4, start: "08:40", end: "09:25" },
  { session: 5, start: "09:30", end: "10:15" },
  { session: 6, start: "10:20", end: "11:05" },
  { session: 7, start: "11:10", end: "11:55" },
  // Evening shift
  { session: 8, start: "12:05", end: "12:50" },
  { session: 9, start: "12:55", end: "13:40" },
  { session: 10, start: "13:45", end: "14:30" },
  { session: 11, start: "14:35", end: "15:20" },
  { session: 12, start: "15:25", end: "16:10" },
  { session: 13, start: "16:15", end: "17:00" },
  { session: 14, start: "17:05", end: "17:50" },
];

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const LCDScreen = ({
  isTalking, currentView, selectedTarget, dialNumber,
  signalStrength, roomCode, name, connectedCount = 0,
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

    for (const slot of SCHEDULE) {
      const startMin = toMinutes(slot.start);
      const endMin = toMinutes(slot.end);
      if (nowMin >= startMin && nowMin < endMin) {
        const remainTotal = (endMin - nowMin - 1) * 60 + (59 - nowSec);
        const rm = Math.floor(remainTotal / 60);
        const rs = remainTotal % 60;
        const shift = slot.session <= 7 ? "Morning" : "Evening";
        const displayNum = slot.session <= 7 ? slot.session : slot.session - 7;
        return { current: displayNum, remaining: `${rm.toString().padStart(2, "0")}:${rs.toString().padStart(2, "0")}`, label: `Session ${displayNum}`, shift };
      }
      // Check break after this session
      const nextSlot = SCHEDULE[SCHEDULE.indexOf(slot) + 1];
      if (nextSlot) {
        const nextStart = toMinutes(nextSlot.start);
        if (nowMin >= endMin && nowMin < nextStart) {
          const remainTotal = (nextStart - nowMin - 1) * 60 + (59 - nowSec);
          const rm = Math.floor(remainTotal / 60);
          const rs = remainTotal % 60;
          return { current: 0, remaining: `${rm.toString().padStart(2, "0")}:${rs.toString().padStart(2, "0")}`, label: "Break", shift: "" };
        }
      }
    }

    const firstStart = toMinutes(SCHEDULE[0].start);
    if (nowMin < firstStart) return { current: 0, remaining: "—", label: "Before shift", shift: "" };
    return { current: 0, remaining: "—", label: "After shift", shift: "" };
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

          <span className="text-[10px] font-mono text-[#00ff66]/70 tracking-wider">EMIRATES MOBILITY</span>

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

          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-mono text-[#00ff66]/80">{classInfo.label}</div>
            <div className="font-mono text-[#00ff66] text-lg font-bold" dir="ltr">⏱ {classInfo.remaining}</div>
          </div>

          <div className="h-px bg-[#00ff66]/20 mb-2" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-[#00ff66]/50">Target:</span>
            <span className="text-[12px] font-mono text-[#00ff66] truncate max-w-[200px]">
              {selectedTarget || "Public broadcast"}
            </span>
          </div>

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
