import { useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SplashScreen from "./components/SplashScreen";
import GateScreen from "./components/GateScreen";
import Login from "./pages/Login";
import Auth from "./pages/Auth";
import RequireAuth from "./components/RequireAuth";
import InstructorShell from "./pages/InstructorShell";
import StudentCarScreen from "./pages/StudentCarScreen";
import AudioTest from "./pages/AudioTest";
import InstructorPhotos from "./pages/InstructorPhotos";
import NotFound from "./pages/NotFound";
import DesignPreview from "./pages/DesignPreview";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [showGate, setShowGate] = useState(() => !localStorage.getItem("gate_passed"));
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);
  const handleGateSuccess = useCallback(() => {
    localStorage.setItem("gate_passed", "1");
    setShowGate(false);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {showGate && <GateScreen onSuccess={handleGateSuccess} />}
        {!showGate && showSplash && <SplashScreen onComplete={handleSplashComplete} />}
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/instructor" element={<RequireAuth><InstructorShell /></RequireAuth>} />
            <Route path="/student" element={<RequireAuth><StudentCarScreen /></RequireAuth>} />
            <Route path="/audio-test" element={<AudioTest />} />
            <Route path="/instructor-photos" element={<RequireAuth><InstructorPhotos /></RequireAuth>} />
            <Route path="/designs" element={<DesignPreview />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
