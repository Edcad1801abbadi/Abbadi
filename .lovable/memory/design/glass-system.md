---
name: Glass Design System
description: Glassmorphic UI tokens — backdrop-blur cards on dark gradient, cyan-400 brand
type: design
---
- Background: `glass-bg` utility (radial cyan + purple blobs over deep navy gradient #0a0f1a → #050810).
- Cards: `glass-card` (`rgba(255,255,255,0.04)` + `backdrop-blur(20px)` + 1px white/8 border + soft shadow). Strong variant: `glass-strong`.
- Bottom nav: `glass-nav` (rgba(10,15,26,0.7) + blur 24px). Active tab = cyan-400 with subtle glow on icon only.
- All tabs scroll internally with `pb-24` to clear the fixed bottom nav.
- Brand text: `text-cyan-400 font-black tracking-widest "EMIRATES MOBILITY"`.
- Borders prefer `white/8`–`white/15` over solid borders.
