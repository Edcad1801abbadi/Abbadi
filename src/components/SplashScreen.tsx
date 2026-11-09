import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import edcTowerLogo from "@/assets/edc-tower-logo-clean.png.asset.json";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [phase, setPhase] = useState<"logo" | "text" | "exit">("logo");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("text"), 800);
    const t2 = setTimeout(() => setPhase("exit"), 2400);
    const t3 = setTimeout(() => onComplete(), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== "exit" ? (
        <motion.div
          key="splash"
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center overflow-hidden"
        >
          <div className="absolute inset-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15 }}
              transition={{ duration: 1.5 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary blur-[120px]"
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.08 }}
              transition={{ duration: 2, delay: 0.5 }}
              className="absolute top-1/3 left-1/3 w-[300px] h-[300px] rounded-full bg-accent blur-[100px]"
            />
          </div>

          <motion.div
            initial={{ scale: 0, rotateY: -180 }}
            animate={{ scale: 1, rotateY: 0 }}
            transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
            className="relative mb-8"
            style={{ perspective: "800px" }}
          >
            <motion.div
              animate={{ rotateY: [0, 15, -15, 0], rotateX: [0, 5, -5, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformStyle: "preserve-3d" }}
              className="w-28 h-28 flex items-center justify-center"
            >
              <div
                className="logo-flow w-28 h-28"
                style={{
                  WebkitMaskImage: `url(${edcTowerLogo.url})`,
                  maskImage: `url(${edcTowerLogo.url})`,
                  transform: "translateZ(20px)",
                }}
                aria-label="EDC TOWER"
              />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40, rotateX: -20 }}
            animate={
              phase === "text" || phase === "logo"
                ? { opacity: 1, y: 0, rotateX: 0 }
                : {}
            }
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="text-center"
            style={{ perspective: "600px" }}
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="text-4xl font-black text-foreground tracking-tight mb-2"
            >
              EDC TOWER
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="text-muted-foreground text-sm"
            >
              Communications System
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6 }}
            className="mt-10 flex items-center gap-1.5"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-primary/60"
                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: 1.8 }}
            className="absolute bottom-6 text-[10px] text-muted-foreground"
          >
            Developed by ABDALLA ABBADI
          </motion.p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default SplashScreen;
