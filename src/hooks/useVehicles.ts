import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Vehicle {
  car_number: string;
  box_number: string;
  type: string;
}

export const useVehicles = () => {
  return useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("car_number, box_number, type")
        .order("type")
        .order("box_number");
      if (error) throw error;
      return (data ?? []) as Vehicle[];
    },
  });
};
