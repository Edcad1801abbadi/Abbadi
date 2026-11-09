
# Glassmorphic Redesign + Full 8-Tab App

## Scope
Convert the entire app to a **light glassmorphic** style (English LTR, daytime mode, transparent glass cards with `backdrop-blur`, on a dark gradient background — per user's "خلفية داكنة + زجاج خفيف backdrop-blur"). Keep current logic (WebRTC PTT, Supabase, auth gate). Add 8 bottom-nav tabs matching the screenshots. Add an XLSX student-schedule upload feature.

## Design system changes (`src/index.css` + `tailwind.config.ts`)
- New glass tokens: `--glass-bg: rgba(255,255,255,0.06)`, `--glass-border: rgba(255,255,255,0.12)`, `--glass-blur: 20px`.
- Dark gradient background: deep navy → near-black, with a subtle ambient blob.
- Utility class `.glass-card` → `bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]`.
- Keep cyan-400 brand, Inter font, English LTR (per memory).

## Bottom Navigation (`src/components/BottomNav.tsx` — new)
Fixed glass bar, 8 tabs in this order (English labels, but keep Arabic content where it already exists):
`Settings · Control · Widget · Map · Contacts · Schedule · Timer · Radio`

Active tab = cyan icon + label, inactive = white/40. Renders only on instructor route.

## Routes & pages
Consolidate inside `/instructor` using internal tab state (don't add new top-level routes — respects "consolidated routes" memory). The existing radio screen becomes the **Radio** tab.

New tab views (all glass cards, full functionality):
1. **Radio** — existing `InstructorRadio` content (LCD + PTT) wrapped in glass.
2. **Timer** (`src/components/tabs/TimerTab.tsx`) — large circular countdown for current schedule slot, start/end times, % progress. Driven by existing `SCHEDULE` from `LCDScreen`.
3. **Schedule** (`src/components/tabs/ScheduleTab.tsx`) — full list of slots grouped by Overtime / Morning / Evening, current slot highlighted.
4. **Contacts** (`src/components/tabs/ContactsTab.tsx`) — Active/All toggle, list from `useRoomParticipants` + `useInstructors`, glass rows with avatar.
5. **Map** (`src/components/tabs/MapTab.tsx`) — vehicle list with car number, model, instructor, student, speed (mock speed), status filter chips. Real data from `useVehicles` + `useRoomParticipants`; speed/location are mocked since we have no GPS source.
6. **Control** (`src/components/tabs/ControlTab.tsx`) — channel-assignment grid, "Reset all to Main" button (calls existing `reset_room_state` RPC), per-user channel buttons (Admin / Aria 2 / Main / Connect / Disconnect). Channels stored in local state + `room_participants.assigned_instructor_peer_id` reuse — pure client model since no channels table exists.
7. **Widget** (`src/components/tabs/WidgetTab.tsx`) — informational page with two preview cards (1×2 small, 2×4 medium) showing current session and remaining time. Pure UI (no native widget on web).
8. **Settings** (`src/components/tabs/SettingsTab.tsx`) — existing diagnostics + new **Student Schedule Upload** section.

## XLSX Student Schedule Upload
- New table `student_schedules` (Lovable Cloud) — see SQL below.
- Settings tab → `<input type="file" accept=".xlsx,.xls">` → parse client-side with `xlsx` library (`bun add xlsx`).
- Expected columns (case-insensitive): `Car Number`, `Student Name`, `Session`, `Start Time`, `End Time`, `Date` (or Arabic equivalents). Show preview table, then "Save" inserts rows into `student_schedules` via supabase client.
- Map tab and Radio LCD pull today's student schedule by car number to show current student.

### SQL migration
```sql
CREATE TABLE public.student_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_number text NOT NULL,
  student_name text NOT NULL,
  session_number int,
  start_time text,
  end_time text,
  schedule_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.student_schedules TO anon, authenticated;
GRANT INSERT, DELETE ON public.student_schedules TO authenticated;
GRANT ALL ON public.student_schedules TO service_role;
ALTER TABLE public.student_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read schedules" ON public.student_schedules FOR SELECT USING (true);
CREATE POLICY "Anyone can upload schedules" ON public.student_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can clear schedules" ON public.student_schedules FOR DELETE USING (true);
```

(Permissive policies match the rest of this anon-only app — already documented in security memory.)

## Files
**New:** `BottomNav.tsx`, `tabs/{Radio,Timer,Schedule,Contacts,Map,Control,Widget,Settings}Tab.tsx`, `tabs/ScheduleUpload.tsx`, `hooks/useStudentSchedules.ts`, `lib/glass.ts`, migration SQL.
**Modified:** `index.css` (glass tokens + dark gradient), `tailwind.config.ts` (glass utilities), `pages/InstructorRadio.tsx` (becomes tab host), `LCDScreen.tsx` (glass treatment, pull student from schedule).
**Deps:** `bun add xlsx`.

## Out of scope (deferred)
- Student-side screen (`/student`) gets only the glass background — not the full 8-tab UI.
- Native iOS/Android home-screen widgets (Web only — Widget tab is preview UI).
- Real GPS for Map tab (mock speeds, "Live" badge UI only).

## Caveats / memory conflicts
- Adds light bottom-nav scroll inside tabs that exceed 100dvh (Schedule, Map, Contacts, Control). I'll keep the radio tab single-viewport, but the new content tabs need internal scroll — please confirm this is OK; otherwise everything must fit 100dvh and Map/Schedule will be cramped.
