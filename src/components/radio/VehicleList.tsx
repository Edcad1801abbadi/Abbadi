import { Car } from "lucide-react";
import { useVehicles } from "@/hooks/useVehicles";

interface VehicleListProps {
  onSelect: (vehicle: string) => void;
}

const VehicleList = ({ onSelect }: VehicleListProps) => {
  const { data: vehicles = [], isLoading } = useVehicles();

  const autoVehicles = vehicles.filter((v) => v.type === "auto");
  const manualVehicles = vehicles.filter((v) => v.type === "manual");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
        <span className="w-4 h-4 animate-spin border-2 border-current border-t-transparent rounded-full" /> Loading...
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 p-6 text-center">
        <Car className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
        <p className="text-xs text-muted-foreground">No vehicles registered</p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-800/50 rounded-xl border border-neutral-700 max-h-56 overflow-y-auto">
      {autoVehicles.length > 0 && (
        <>
          <div className="sticky top-0 bg-neutral-800 px-3 py-1.5 text-xs font-bold text-primary border-b border-neutral-700 flex items-center gap-1.5">
            🚗 Automatic ({autoVehicles.length})
          </div>
          {autoVehicles.map((v) => (
            <VehicleButton key={v.car_number} carNumber={v.car_number} boxNumber={v.box_number} colorClass="text-primary" onSelect={onSelect} />
          ))}
        </>
      )}
      {manualVehicles.length > 0 && (
        <>
          <div className="sticky top-0 bg-neutral-800 px-3 py-1.5 text-xs font-bold text-orange-400 border-b border-neutral-700 flex items-center gap-1.5">
            🚘 Manual ({manualVehicles.length})
          </div>
          {manualVehicles.map((v) => (
            <VehicleButton key={v.car_number} carNumber={v.car_number} boxNumber={v.box_number} colorClass="text-orange-400" onSelect={onSelect} />
          ))}
        </>
      )}
    </div>
  );
};

const VehicleButton = ({ carNumber, boxNumber, colorClass, onSelect }: { carNumber: string; boxNumber: string; colorClass: string; onSelect: (v: string) => void }) => (
  <button
    onClick={() => onSelect(`Car ${carNumber}`)}
    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary/10 transition-colors border-b border-neutral-700/50 last:border-0"
  >
    <Car className={`w-4 h-4 ${colorClass}/70 flex-shrink-0`} />
    <span className={`font-mono text-sm ${colorClass} font-bold`} dir="ltr">{carNumber}</span>
    <span className="text-[10px] font-mono text-muted-foreground bg-neutral-700/50 px-1.5 py-0.5 rounded">BOX {boxNumber}</span>
  </button>
);

export default VehicleList;
