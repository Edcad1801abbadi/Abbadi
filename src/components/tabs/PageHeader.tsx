interface Props { title: string; subtitle?: string }
const PageHeader = ({ title, subtitle }: Props) => (
  <div className="px-5 pt-6 pb-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-white/50 mt-1">{subtitle}</p>}
      </div>
      <div className="text-right">
        <div className="text-cyan-400 font-black text-base tracking-widest">EDC TOWER</div>
        <div className="text-[10px] text-white/40 mt-0.5">PTT · Driving Academy</div>
      </div>
    </div>
  </div>
);
export default PageHeader;
