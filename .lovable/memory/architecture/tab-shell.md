---
name: 8-Tab Bottom Navigation
description: Instructor app uses internal tab routing via ?tab= search param across one /instructor route
type: feature
---
- Single route `/instructor` renders `InstructorShell` which switches between 8 tab views via `?tab=` URL param.
- Tabs (left→right in nav): settings, control, widget, map, contacts, schedule, timer, radio.
- Default tab = `radio`. Tab key validated by `useActiveTab()` in `src/components/BottomNav.tsx`.
- The Radio tab embeds the legacy `InstructorRadio` page; its outer height was changed to `h-[calc(100dvh-72px)]` so the PTT button sits above the fixed glass nav.
- Other tabs are lazy-loaded from `src/components/tabs/`.
