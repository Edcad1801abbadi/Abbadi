import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Instructor {
  employee_id: number;
  name: string;
  photo_url: string | null;
  position: string;
}

export const useInstructors = () => {
  return useQuery({
    queryKey: ["instructors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("instructors")
        .select("employee_id, name, photo_url, position")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Instructor[];
    },
  });
};
