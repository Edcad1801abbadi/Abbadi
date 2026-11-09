import { Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import BottomNav, { useActiveTab } from "@/components/BottomNav";
import InstructorRadio from "./InstructorRadio";

const TimerTab = lazy(() => import("@/components/tabs/TimerTab"));
const ScheduleTab = lazy(() => import("@/components/tabs/ScheduleTab"));
const ContactsTab = lazy(() => import("@/components/tabs/ContactsTab"));
const MapTab = lazy(() => import("@/components/tabs/MapTab"));
const ControlTab = lazy(() => import("@/components/tabs/ControlTab"));
const WidgetTab = lazy(() => import("@/components/tabs/WidgetTab"));
const SettingsTab = lazy(() => import("@/components/tabs/SettingsTab"));

const InstructorShell = () => {
  const tab = useActiveTab();
  // Ensure ?tab=radio default
  const [params] = useSearchParams();
  if (!params.get("tab")) {
    // no-op, useActiveTab defaults to "radio"
  }

  const renderTab = () => {
    switch (tab) {
      case "radio": return <InstructorRadio />;
      case "timer": return <TimerTab />;
      case "schedule": return <ScheduleTab />;
      case "contacts": return <ContactsTab />;
      case "map": return <MapTab />;
      case "control": return <ControlTab />;
      case "widget": return <WidgetTab />;
      case "settings": return <SettingsTab />;
    }
  };

  return (
    <div className="h-[100dvh] glass-bg relative">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <div className="relative h-full">
        <Suspense fallback={<div className="h-full flex items-center justify-center text-white/40 text-sm">Loading…</div>}>
          {renderTab()}
        </Suspense>
      </div>

      <BottomNav />
    </div>
  );
};

export default InstructorShell;
