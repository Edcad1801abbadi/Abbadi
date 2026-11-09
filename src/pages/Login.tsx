import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wifi, Car, ChevronDown, User, Loader2, MapPin, AlertTriangle, CheckCircle2 } from "lucide-react";
import companyLogo from "@/assets/company-logo.png";
import { motion, AnimatePresence } from "framer-motion";
import { useVehicles } from "@/hooks/useVehicles";
import { useInstructors } from "@/hooks/useInstructors";
import { TRAINING_AREAS } from "@/constants/trainingAreas";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<"instructor" | "student">("instructor");
  const [name, setName] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [showAreaList, setShowAreaList] = useState(false);
  const [selectedCar, setSelectedCar] = useState("");
  const [showCarList, setShowCarList] = useState(false);
  const [selectedInstructorId, setSelectedInstructorId] = useState<number | null>(null);
  
  const [instructorSearch, setInstructorSearch] = useState("");

  const { data: vehicles = [], isLoading: vehiclesLoading } = useVehicles();
  const { data: instructors = [], isLoading: instructorsLoading } = useInstructors();

  const selectedVehicle = vehicles.find((v) => v.car_number === selectedCar);
  const selectedInstructor = instructors.find((i) => i.employee_id === selectedInstructorId);

  const filteredInstructors = instructors.filter((i) =>
    i.name.toLowerCase().includes(instructorSearch.toLowerCase()) ||
    i.employee_id.toString().includes(instructorSearch)
  );

  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const handleJoin = async () => {
    setIsJoining(true);
    setJoinError("");

    try {
      if (role === "student") {
        const { data: activeCar } = await supabase
          .from("room_participants")
          .select("id, room_id")
          .eq("peer_id", `car-${selectedCar}`)
          .eq("is_active", true)
          .maybeSingle();

        if (activeCar) {
          setJoinError(`Car ${selectedCar} is already connected in ${activeCar.room_id}`);
          toast.error(`Car ${selectedCar} is already connected!`, {
            description: `This car is currently active in ${activeCar.room_id}`,
          });
          setIsJoining(false);
          return;
        }

        navigate("/student", {
          state: {
            name: `Car ${selectedCar}`,
            role,
            roomCode: selectedArea || TRAINING_AREAS[0],
            carNumber: selectedCar,
            boxNumber: selectedVehicle?.box_number || "01",
            vehicleType: selectedVehicle?.type || "auto",
          },
        });
      } else {
        const { data: activeInstructor } = await supabase
          .from("room_participants")
          .select("id, room_id")
          .eq("peer_id", `instructor-${selectedInstructorId}`)
          .eq("is_active", true)
          .maybeSingle();

        if (activeInstructor) {
          setJoinError(`Instructor is already connected in ${activeInstructor.room_id}`);
          toast.error("Instructor is already connected!", {
            description: `This instructor is currently active in ${activeInstructor.room_id}`,
          });
          setIsJoining(false);
          return;
        }

        const joinName = selectedInstructor?.name || name;
        if (joinName.trim()) {
          navigate("/instructor", {
            state: {
              name: joinName,
              role,
              roomCode: selectedArea || TRAINING_AREAS[0],
              carNumber: "----",
              employeeId: selectedInstructorId,
            },
          });
        }
      }
    } catch (err) {
      console.error("Join error:", err);
      const msg = "حدث خطأ أثناء الاتصال. حاول مرة أخرى.";
      setJoinError(msg);
      toast.error(msg);
    } finally {
      setIsJoining(false);
    }
  };

  const canJoin = role === "instructor"
    ? (selectedInstructorId !== null || name.trim()) && selectedArea
    : (selectedCar && selectedArea);

  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(145,70%,45%,0.08),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(35,90%,55%,0.05),transparent_60%)]" />
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-10" style={{ perspective: "1000px" }}>
          <motion.div
            initial={{ scale: 0, rotateY: -180 }}
            animate={{ scale: 1, rotateY: 0 }}
            transition={{ type: "spring", stiffness: 80, damping: 14, delay: 0.2 }}
            className="relative mb-5"
          >
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.9, 1.1, 0.9] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-3xl bg-primary/20 blur-2xl"
              style={{ transform: "translateZ(-30px)" }}
            />
            <motion.div
              animate={{ rotateY: [0, 12, -12, 0], rotateX: [0, 5, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformStyle: "preserve-3d" }}
              className="relative"
            >
              <div className="absolute inset-0 rounded-3xl bg-primary/10" style={{ transform: "translateZ(-15px)", filter: "blur(8px)" }} />
              <div
                className="w-28 h-28 rounded-3xl bg-card border-2 border-primary/30 flex items-center justify-center backdrop-blur-sm overflow-hidden"
                style={{ transform: "translateZ(25px)", boxShadow: "0 25px 50px -12px hsl(var(--primary) / 0.35), 0 0 30px -5px hsl(var(--primary) / 0.15), inset 0 1px 0 hsl(var(--primary) / 0.15)" }}
              >
                <img src={companyLogo} alt="Emirates Mobility" className="w-20 h-20 object-contain" style={{ filter: "drop-shadow(3px 6px 10px rgba(0,0,0,0.4))", transform: "translateZ(10px)" }} />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-20 h-3 rounded-full bg-primary/15 blur-md" style={{ transform: "translateZ(-5px) rotateX(90deg)" }} />
            </motion.div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }} className="text-4xl font-black tracking-tight mb-1" style={{ color: "white", textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
            Emirates Mobility
          </motion.h1>
          <motion.p initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7, duration: 0.5 }} className="text-muted-foreground text-sm flex items-center gap-1.5">
            <motion.span animate={{ opacity: [0.3, 1, 0.3], scale: [0.95, 1.1, 0.95] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
              <Wifi className="w-3.5 h-3.5" style={{ color: 'hsl(210, 90%, 60%)' }} />
            </motion.span>
            Communications System
          </motion.p>
        </div>

        {/* Role Toggle */}
        <div className="flex bg-card rounded-xl p-1 mb-6 border border-border">
          <button onClick={() => setRole("student")} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${role === "student" ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "text-muted-foreground hover:text-foreground"}`}>
            Training Car
          </button>
          <button onClick={() => setRole("instructor")} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${role === "instructor" ? "bg-accent text-accent-foreground shadow-lg shadow-accent/25" : "text-muted-foreground hover:text-foreground"}`}>
            Instructor
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Instructor Selection */}
          <AnimatePresence>
            {role === "instructor" && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Search Instructor</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <Input
                    value={instructorSearch}
                    onChange={(e) => {
                      setInstructorSearch(e.target.value);
                      setSelectedInstructorId(null);
                      setName("");
                    }}
                    placeholder="Type name or ID..."
                    className={`w-full h-12 rounded-xl bg-card border pl-11 pr-10 text-base ${selectedInstructorId !== null ? "border-primary" : "border-border"}`}
                    dir="ltr"
                  />
                  {selectedInstructorId !== null && (
                    <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary z-10" />
                  )}
                </div>

                <AnimatePresence>
                  {instructorSearch.trim().length > 0 && selectedInstructorId === null && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="mt-2 bg-card border border-border rounded-xl max-h-48 overflow-y-auto">
                        {filteredInstructors.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground text-center">No results</div>
                        ) : (
                          filteredInstructors.map((inst) => (
                            <button key={inst.employee_id} onClick={() => { setSelectedInstructorId(inst.employee_id); setName(inst.name); setInstructorSearch(inst.name); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm border-b border-border/50 last:border-0 transition-colors hover:bg-secondary`}>
                              <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded flex-shrink-0">{inst.employee_id}</span>
                              <div className="flex-1 min-w-0 text-left" dir="ltr">
                                <span className="font-medium text-foreground truncate block">{inst.name}</span>
                                <span className={`text-[10px] ${inst.position === 'Trainer' ? 'text-muted-foreground' : 'text-primary font-bold'}`}>{inst.position}</span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Training Area Selection */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Training Area</Label>
            <button type="button" onClick={() => setShowAreaList(!showAreaList)} className={`w-full h-12 rounded-xl bg-card border px-4 flex items-center justify-between text-base ${selectedArea ? "border-primary" : "border-border"}`}>
              <MapPin className="w-4 h-4 text-muted-foreground" />
              {selectedArea ? (
                <span className="font-bold text-foreground text-sm">{selectedArea}</span>
              ) : (
                <span className="text-muted-foreground">Select training area</span>
              )}
              {selectedArea ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showAreaList ? "rotate-180" : ""}`} />}
            </button>

            <AnimatePresence>
              {showAreaList && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="mt-2 bg-card border border-border rounded-xl max-h-48 overflow-y-auto">
                    {TRAINING_AREAS.map((area) => (
                      <button key={area} onClick={() => { setSelectedArea(area); setShowAreaList(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm border-b border-border/50 last:border-0 transition-colors ${selectedArea === area ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-secondary"}`}>
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span>{area}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Car Selection */}
          <AnimatePresence>
            {role === "student" && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Car Number</Label>
                <button type="button" onClick={() => setShowCarList(!showCarList)} className={`w-full h-12 rounded-xl bg-card border px-4 flex items-center justify-between text-base ${selectedVehicle ? "border-primary" : "border-border"}`}>
                  <Car className="w-4 h-4 text-muted-foreground" />
                  {vehiclesLoading ? (
                    <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</span>
                  ) : selectedVehicle ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground" dir="ltr">{selectedVehicle.car_number}</span>
                      <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">BOX {selectedVehicle.box_number}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${selectedVehicle.type === "auto" ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"}`}>
                        {selectedVehicle.type === "auto" ? "Auto" : "Manual"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Select your car</span>
                  )}
                  {selectedVehicle ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showCarList ? "rotate-180" : ""}`} />}
                </button>

                <AnimatePresence>
                  {showCarList && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="mt-2 bg-card border border-border rounded-xl max-h-48 overflow-y-auto">
                        <div className="sticky top-0 bg-card px-3 py-1.5 text-xs font-bold text-primary border-b border-border">🚗 Automatic</div>
                        {vehicles.filter(v => v.type === "auto").map((v) => (
                          <button key={v.car_number} onClick={() => { setSelectedCar(v.car_number); setShowCarList(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm border-b border-border/50 last:border-0 transition-colors ${selectedCar === v.car_number ? "bg-primary/10" : "hover:bg-secondary"}`}>
                            <span className="font-mono font-bold text-foreground" dir="ltr">{v.car_number}</span>
                            <span className="text-[10px] text-muted-foreground">BOX {v.box_number}</span>
                          </button>
                        ))}
                        <div className="sticky top-0 bg-card px-3 py-1.5 text-xs font-bold text-accent border-b border-border">🚘 Manual</div>
                        {vehicles.filter(v => v.type === "manual").map((v) => (
                          <button key={v.car_number} onClick={() => { setSelectedCar(v.car_number); setShowCarList(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm border-b border-border/50 last:border-0 transition-colors ${selectedCar === v.car_number ? "bg-accent/10" : "hover:bg-secondary"}`}>
                            <span className="font-mono font-bold text-foreground" dir="ltr">{v.car_number}</span>
                            <span className="text-[10px] text-muted-foreground">BOX {v.box_number}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message */}
          <AnimatePresence>
            {joinError && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <span className="text-destructive text-sm font-bold">{joinError}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Button onClick={handleJoin} disabled={!canJoin || isJoining} className="w-full h-12 rounded-xl text-base font-bold mt-2 shadow-lg shadow-primary/20">
            {isJoining ? (
              <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</span>
            ) : role === "instructor" ? "Sign In" : "Join"}
          </Button>
        </div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ delay: 0.8 }} className="mt-8 text-[10px] text-muted-foreground text-center">
          Developed by ABDALLA ABBADI
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Login;
