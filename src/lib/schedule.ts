export type SlotKind = "lesson" | "overtime" | "break" | "countdown";

export interface ScheduleSlot {
  start: string;
  end: string;
  label: string;
  shift: "Morning" | "Evening" | "Overtime";
  kind: SlotKind;
}

export const SCHEDULE: ScheduleSlot[] = [
  { start: "04:20", end: "05:05", label: "Overtime 1", shift: "Overtime", kind: "overtime" },
  { start: "05:10", end: "05:55", label: "Overtime 2", shift: "Overtime", kind: "overtime" },
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
  { start: "22:15", end: "23:00", label: "Overtime 1", shift: "Overtime", kind: "overtime" },
  { start: "23:05", end: "23:50", label: "Overtime 2", shift: "Overtime", kind: "overtime" },
];

export const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export interface CurrentSlotInfo {
  slot: ScheduleSlot | null;
  next: ScheduleSlot | null;
  remainingSec: number;
  totalSec: number;
  progress: number; // 0..1
  inBreak: boolean;
}

export const getCurrentSlot = (now: Date): CurrentSlotInfo => {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowSec = now.getSeconds();
  for (let i = 0; i < SCHEDULE.length; i++) {
    const s = SCHEDULE[i];
    const startMin = toMinutes(s.start);
    const endMin = toMinutes(s.end);
    if (nowMin >= startMin && nowMin < endMin) {
      const remaining = (endMin - nowMin - 1) * 60 + (59 - nowSec);
      const total = (endMin - startMin) * 60;
      return { slot: s, next: SCHEDULE[i + 1] ?? null, remainingSec: remaining, totalSec: total, progress: 1 - remaining / total, inBreak: s.kind === "break" };
    }
    const next = SCHEDULE[i + 1];
    if (next && nowMin >= endMin && nowMin < toMinutes(next.start)) {
      const ns = toMinutes(next.start);
      const remaining = (ns - nowMin - 1) * 60 + (59 - nowSec);
      return { slot: null, next, remainingSec: remaining, totalSec: (ns - endMin) * 60, progress: 0, inBreak: true };
    }
  }
  return { slot: null, next: SCHEDULE[0], remainingSec: 0, totalSec: 0, progress: 0, inBreak: false };
};

export const fmtCountdown = (sec: number) => {
  if (sec <= 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};
