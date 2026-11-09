import { useState } from "react";
import PageHeader from "./PageHeader";
import { useInstructors } from "@/hooks/useInstructors";
import { Satellite } from "lucide-react";
import { cn } from "@/lib/utils";

const ContactsTab = () => {
  const { data: instructors = [] } = useInstructors();
  const [filter, setFilter] = useState<"active" | "all">("active");
  // No real online presence outside the radio session — show instructors directory.
  const list = instructors;

  return (
    <div className="h-full overflow-y-auto pb-24">
      <PageHeader title="Contacts" subtitle={`${list.length} instructors`} />
      <div className="px-5 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setFilter("active")} className={cn("glass-card py-2.5 text-sm font-bold transition", filter === "active" ? "bg-cyan-400/20 text-cyan-300 border-cyan-400/40" : "text-white/70")}>
            Active ({list.length})
          </button>
          <button onClick={() => setFilter("all")} className={cn("glass-card py-2.5 text-sm font-bold transition", filter === "all" ? "bg-cyan-400/20 text-cyan-300 border-cyan-400/40" : "text-white/70")}>
            All ({list.length})
          </button>
        </div>

        {list.map((p) => (
          <div key={p.employee_id} className="glass-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center text-white font-black text-lg overflow-hidden">
                {p.photo_url ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" /> : p.name.charAt(0)}
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  {p.name}
                </div>
                <div className="text-[11px] text-white/50">{p.position} · ID: {p.employee_id}</div>
                <div className="text-[11px] text-cyan-400 flex items-center gap-1 mt-0.5">
                  <Satellite className="w-3 h-3" /> Main
                </div>
              </div>
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/15 border border-emerald-400/30 px-2 py-1 rounded-md">Online</span>
          </div>
        ))}

        {!list.length && (
          <div className="glass-card p-8 text-center text-white/50 text-sm">No contacts yet</div>
        )}
      </div>
    </div>
  );
};
export default ContactsTab;
