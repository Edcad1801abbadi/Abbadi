import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Attendance = "present" | "absent" | "late";

export interface StudentSchedule {
  id: string;
  car_number: string;
  student_name: string;
  session_number: number | null;
  start_time: string | null;
  end_time: string | null;
  schedule_date: string;
  tower: string | null;
  md_rating: number | null;
  wk_rating: number | null;
  remark: string | null;
  signature_url: string | null;
  attendance: Attendance | null;
  languages: string[] | null;
}

const today = () => new Date().toISOString().slice(0, 10);

export const useStudentSchedules = (date?: string) => {
  const d = date ?? today();
  return useQuery({
    queryKey: ["student_schedules", d],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_schedules")
        .select("*")
        .eq("schedule_date", d)
        .order("start_time", { ascending: true });
      if (error) throw error;
      return (data ?? []) as StudentSchedule[];
    },
  });
};

export const useUpdateStudentSchedule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<StudentSchedule> }) => {
      const { error } = await supabase.from("student_schedules").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student_schedules"] }),
  });
};

export const findStudentForCar = (
  schedules: StudentSchedule[] | undefined,
  carNumber: string,
  nowMin?: number
): StudentSchedule | null => {
  if (!schedules) return null;
  const list = schedules.filter(s => s.car_number === carNumber);
  if (!list.length) return null;
  if (nowMin == null) return list[0];
  const inRange = list.find(s => {
    if (!s.start_time || !s.end_time) return false;
    const [sh, sm] = s.start_time.split(":").map(Number);
    const [eh, em] = s.end_time.split(":").map(Number);
    return nowMin >= sh * 60 + sm && nowMin < eh * 60 + em;
  });
  return inRange ?? list[0];
};
