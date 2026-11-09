import { Phone, Delete } from "lucide-react";

interface NumPadProps {
  onPress: (digit: string) => void;
  dialNumber: string;
}

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["CLR", "0", "CALL"],
];

const NumPad = ({ onPress, dialNumber }: NumPadProps) => {
  return (
    <div className="space-y-2">
      <div className="bg-neutral-800 rounded-lg px-4 py-2 text-center border border-neutral-700">
        <span className="text-xs text-muted-foreground block mb-0.5">
          رقم السيارة أو رقم المدرب
        </span>
        <span className="font-mono text-xl text-foreground tracking-widest" dir="ltr">
          {dialNumber || "_ _ _ _"}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.flat().map((key) => (
          <button
            key={key}
            onClick={() => onPress(key)}
            className={`py-3 rounded-xl font-bold text-sm transition-all active:scale-95 border ${
              key === "CALL"
                ? "bg-primary/20 text-primary border-primary/30 hover:bg-primary/30"
                : key === "CLR"
                ? "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                : "bg-neutral-800 text-foreground border-neutral-700 hover:bg-neutral-700"
            }`}
          >
            {key === "CALL" ? (
              <span className="flex items-center justify-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                اتصال
              </span>
            ) : key === "CLR" ? (
              <span className="flex items-center justify-center gap-1">
                <Delete className="w-3.5 h-3.5" />
                مسح
              </span>
            ) : (
              key
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default NumPad;
