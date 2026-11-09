import { motion } from "framer-motion";

interface AudioLevelIndicatorProps {
  level: number; // 0-1
  isTalking: boolean;
}

const AudioLevelIndicator = ({ level, isTalking }: AudioLevelIndicatorProps) => {
  if (!isTalking) return null;

  const bars = 12;

  return (
    <div className="flex items-end justify-center gap-[2px] h-6">
      {Array.from({ length: bars }).map((_, i) => {
        const barLevel = (i + 1) / bars;
        const isActive = level >= barLevel;
        const color = barLevel < 0.5 ? "bg-emerald-400" : barLevel < 0.8 ? "bg-yellow-400" : "bg-red-400";
        return (
          <motion.div
            key={i}
            className={`w-[3px] rounded-full ${isActive ? color : "bg-neutral-700"}`}
            animate={{ height: isActive ? `${8 + i * 1.5}px` : "4px" }}
            transition={{ duration: 0.05 }}
          />
        );
      })}
    </div>
  );
};

export default AudioLevelIndicator;
