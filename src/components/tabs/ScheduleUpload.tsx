import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Trash2, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface ParsedRow {
  car_number: string;
  student_name: string;
  session_number: number | null;
  start_time: string | null;
  end_time: string | null;
  schedule_date: string;
  tower: string | null;
  languages: string[];
}

const COL_ALIASES: Record<string, string[]> = {
  car_number: ["car number", "car", "car_no", "car no", "رقم السيارة", "السيارة", "plate"],
  student_name: ["student", "student name", "name", "اسم الطالب", "الطالب"],
  session_number: ["session", "session number", "حصة", "الحصة"],
  start_time: ["start", "start time", "from", "وقت البداية", "البداية"],
  end_time: ["end", "end time", "to", "وقت النهاية", "النهاية"],
  schedule_date: ["date", "schedule date", "التاريخ"],
  tower: ["tower", "برج", "البرج", "area"],
  languages: ["languages", "language", "lang", "اللغات", "اللغة"],
};

const today = () => new Date().toISOString().slice(0, 10);

const findCol = (headers: string[], aliases: string[]) => {
  const lower = headers.map(h => String(h ?? "").trim().toLowerCase());
  for (const a of aliases) {
    const i = lower.indexOf(a.toLowerCase());
    if (i >= 0) return i;
  }
  return -1;
};

const fmtTime = (v: unknown): string | null => {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    // Excel time fraction
    const totalMin = Math.round(v * 24 * 60);
    const h = Math.floor(totalMin / 60) % 24;
    const m = totalMin % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }
  const s = String(v).trim();
  const m = s.match(/(\d{1,2})[:.](\d{2})/);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  return s;
};

const fmtDate = (v: unknown): string => {
  if (!v) return today();
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  const m = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return today();
};

const ScheduleUpload = () => {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const parse = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
    if (!data.length) { toast.error("File is empty"); return; }
    const headers = (data[0] as unknown[]).map(h => String(h ?? ""));
    const idx = {
      car_number: findCol(headers, COL_ALIASES.car_number),
      student_name: findCol(headers, COL_ALIASES.student_name),
      session_number: findCol(headers, COL_ALIASES.session_number),
      start_time: findCol(headers, COL_ALIASES.start_time),
      end_time: findCol(headers, COL_ALIASES.end_time),
      schedule_date: findCol(headers, COL_ALIASES.schedule_date),
      tower: findCol(headers, COL_ALIASES.tower),
      languages: findCol(headers, COL_ALIASES.languages),
    };
    if (idx.car_number < 0 || idx.student_name < 0) {
      toast.error("Required columns missing: Car Number, Student Name");
      return;
    }
    const normTower = (v: unknown): string | null => {
      const s = String(v ?? "").trim();
      if (!s) return null;
      const m = s.match(/([2-9])/);
      return m ? `Tower ${m[1]}` : s;
    };
    const parsed: ParsedRow[] = [];
    for (let i = 1; i < data.length; i++) {
      const r = data[i] as unknown[];
      if (!r || !r.length) continue;
      const car = String(r[idx.car_number] ?? "").trim();
      const name = String(r[idx.student_name] ?? "").trim();
      if (!car || !name) continue;
      parsed.push({
        car_number: car,
        student_name: name,
        session_number: idx.session_number >= 0 ? Number(r[idx.session_number]) || null : null,
        start_time: idx.start_time >= 0 ? fmtTime(r[idx.start_time]) : null,
        end_time: idx.end_time >= 0 ? fmtTime(r[idx.end_time]) : null,
        schedule_date: idx.schedule_date >= 0 ? fmtDate(r[idx.schedule_date]) : today(),
        tower: idx.tower >= 0 ? normTower(r[idx.tower]) : null,
        languages: idx.languages >= 0
          ? String(r[idx.languages] ?? "").split(/[,،\/|]/).map(s => s.trim()).filter(Boolean).slice(0, 5)
          : [],
      });
    }
    setRows(parsed);
    setFileName(file.name);
    toast.success(`Parsed ${parsed.length} rows`);
  };

  const save = async () => {
    if (!rows.length) return;
    setSaving(true);
    const { error } = await supabase.from("student_schedules").insert(rows);
    setSaving(false);
    if (error) { toast.error(`Save failed: ${error.message}`); return; }
    qc.invalidateQueries({ queryKey: ["student_schedules"] });
    toast.success(`Saved ${rows.length} schedule entries`);
    setRows([]);
    setFileName("");
  };

  const clearToday = async () => {
    if (!confirm("Delete today's schedules?")) return;
    const { error } = await supabase.from("student_schedules").delete().eq("schedule_date", today());
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["student_schedules"] });
    toast.success("Today's schedules cleared");
  };

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
        <h3 className="text-sm font-bold text-white">Student Schedule Upload</h3>
      </div>
      <p className="text-[11px] text-white/55 leading-relaxed">
        Upload an Excel file with columns: <span className="text-cyan-400">Car Number</span>, <span className="text-cyan-400">Student Name</span>, Session, Start Time, End Time, Date. Arabic headers also supported.
      </p>

      <label className="flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/20 bg-white/5 cursor-pointer hover:bg-white/10 transition">
        <Upload className="w-4 h-4 text-cyan-400" />
        <span className="text-sm text-white/80">{fileName || "Choose .xlsx file"}</span>
        <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => e.target.files?.[0] && parse(e.target.files[0])} />
      </label>

      {rows.length > 0 && (
        <>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> {rows.length} rows ready · preview below
          </div>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-white/10">
            <table className="w-full text-[11px]">
              <thead className="bg-white/5 text-white/60 sticky top-0">
                <tr><th className="p-1.5 text-left">Car</th><th className="p-1.5 text-left">Student</th><th className="p-1.5">Session</th><th className="p-1.5">Time</th><th className="p-1.5">Date</th></tr>
              </thead>
              <tbody className="text-white/80">
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="p-1.5">{r.car_number}</td>
                    <td className="p-1.5">{r.student_name}</td>
                    <td className="p-1.5 text-center">{r.session_number ?? "—"}</td>
                    <td className="p-1.5 text-center font-mono">{r.start_time}–{r.end_time}</td>
                    <td className="p-1.5 text-center font-mono">{r.schedule_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={save} disabled={saving} className="w-full py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-sm disabled:opacity-50">
            {saving ? "Saving..." : `Save ${rows.length} entries`}
          </button>
        </>
      )}

      <button onClick={clearToday} className="w-full py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-bold flex items-center justify-center gap-1.5">
        <Trash2 className="w-3.5 h-3.5" /> Clear today's schedules
      </button>
    </div>
  );
};
export default ScheduleUpload;
