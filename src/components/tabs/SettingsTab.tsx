import PageHeader from "./PageHeader";
import ScheduleUpload from "./ScheduleUpload";
import { useNavigate } from "react-router-dom";
import { LogOut, Headphones, Image as ImageIcon } from "lucide-react";

const SettingsTab = () => {
  const navigate = useNavigate();
  return (
    <div className="h-full overflow-y-auto pb-24">
      <PageHeader title="Settings" subtitle="App configuration & uploads" />
      <div className="px-5 space-y-3">
        <ScheduleUpload />

        <div className="glass-card p-4 space-y-2">
          <h3 className="text-sm font-bold text-white">Diagnostics</h3>
          <button onClick={() => navigate("/audio-test")} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm hover:bg-white/10">
            <Headphones className="w-4 h-4 text-cyan-400" /> Audio Test Page
          </button>
          <button onClick={() => navigate("/instructor-photos")} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/80 text-sm hover:bg-white/10">
            <ImageIcon className="w-4 h-4 text-cyan-400" /> Instructor Photos
          </button>
        </div>

        <button onClick={() => { localStorage.removeItem("gate_passed"); navigate("/"); }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-sm hover:bg-rose-500/25">
          <LogOut className="w-4 h-4" /> Sign out
        </button>

        <div className="text-center text-[10px] text-white/30 pt-2">EDC TOWER · v2.0 · Glass Edition</div>
      </div>
    </div>
  );
};
export default SettingsTab;
