# Emirates Mobility — Design System

> مرجع كامل لنظام التصميم: الألوان، الخطوط، الرموز، المكونات، والحركات.

---

## 1. الهوية البصرية

| العنصر | القيمة |
|---|---|
| اسم التطبيق | Emirates Mobility |
| الاسم المختصر | EM Radio |
| الوصف | Emirates Mobility PTT Communications System |
| ثيم النظام | Dark-only (لا يوجد light mode) |
| اتجاه الصفحة | RTL (عربي أولاً) |
| لون الثيم | `#09090b` |
| لون الخلفية PWA | `#09090b` |
| Display PWA | standalone |
| Orientation | portrait |

---

## 2. الخطوط (Typography)

### الخط الرئيسي
```css
/* استيراد من Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');

font-family: 'Inter', sans-serif;
```

| الوزن | الاستخدام |
|---|---|
| 400 | نص عادي، محتوى |
| 600 | عناوين فرعية |
| 700 | عناوين رئيسية |
| 800 | بطاقات PTT، LCD |
| 900 | أرقام كبيرة، حالات طوارئ |

### نظام الأحجام (Tailwind)
```
text-xs   → 12px   (تسميات صغيرة)
text-sm   → 14px   (نص ثانوي)
text-base → 16px   (نص أساسي)
text-lg   → 18px   (عناوين فرعية)
text-xl   → 20px   (عناوين)
text-2xl  → 24px   (أرقام مركبات)
text-3xl  → 30px   (أرقام LCD)
text-4xl  → 36px   (شاشة الطوارئ)
```

---

## 3. نظام الألوان (Color Tokens)

### متغيرات CSS — كاملة

```css
:root {
  /* ═══════════════════════════════════
     الخلفيات
  ═══════════════════════════════════ */
  --background:          220 20% 7%;    /* #0d1117 — خلفية رئيسية */
  --foreground:          210 20% 95%;   /* #EEF2F7 — نص رئيسي */

  --card:                220 18% 12%;   /* #171D26 — بطاقات */
  --card-foreground:     210 20% 95%;
  --popover:             220 18% 12%;
  --popover-foreground:  210 20% 95%;

  /* ═══════════════════════════════════
     الأساسي — أخضر (لون العلامة التجارية)
  ═══════════════════════════════════ */
  --primary:             145 70% 45%;   /* #1DB954 — الأخضر الرئيسي */
  --primary-foreground:  220 20% 7%;

  /* ═══════════════════════════════════
     الثانوي
  ═══════════════════════════════════ */
  --secondary:           220 15% 18%;   /* #242C38 */
  --secondary-foreground:210 20% 85%;

  /* ═══════════════════════════════════
     المميز — ذهبي/برتقالي
  ═══════════════════════════════════ */
  --accent:              35 90% 55%;    /* #F59E0B — ذهبي */
  --accent-foreground:   220 20% 7%;

  /* ═══════════════════════════════════
     الحالات
  ═══════════════════════════════════ */
  --destructive:         0 72% 55%;     /* #E53E3E — خطأ/حذف */
  --destructive-foreground: 210 40% 98%;
  --muted:               220 15% 15%;   /* #1A2030 */
  --muted-foreground:    215 15% 55%;   /* #7A8599 */
  --info:                210 90% 60%;   /* #3B82F6 — معلومات */

  /* ═══════════════════════════════════
     حدود وحقول
  ═══════════════════════════════════ */
  --border:              220 15% 20%;   /* #2A3344 */
  --input:               220 15% 20%;
  --ring:                145 70% 45%;   /* أخضر — حلقة التركيز */

  /* ═══════════════════════════════════
     PTT المخصصة
  ═══════════════════════════════════ */
  --ptt-glow:            145 70% 45%;   /* أخضر لامع */
  --ptt-active:          0 72% 55%;     /* أحمر عند الضغط */
  --wave:                145 70% 45%;   /* موجة الصوت */

  /* ═══════════════════════════════════
     الشريط الجانبي
  ═══════════════════════════════════ */
  --sidebar-background:  220 18% 10%;
  --sidebar-foreground:  210 20% 90%;
  --sidebar-primary:     145 70% 45%;
  --sidebar-primary-foreground: 220 20% 7%;
  --sidebar-accent:      220 15% 18%;
  --sidebar-accent-foreground:  210 20% 90%;
  --sidebar-border:      220 15% 20%;
  --sidebar-ring:        145 70% 45%;

  /* ═══════════════════════════════════
     الحواف الدائرية
  ═══════════════════════════════════ */
  --radius: 1rem;  /* 16px */
}
```

### لوحة الألوان الرئيسية

| الاسم | HEX | HSL | الاستخدام |
|---|---|---|---|
| Primary Green | `#1DB954` | 145 70% 45% | PTT، تأكيد، اتصال |
| Accent Gold | `#F59E0B` | 35 90% 55% | VIP، تحذير، مميز |
| Destructive Red | `#E53E3E` | 0 72% 55% | طوارئ، خطأ، قطع |
| Info Blue | `#3B82F6` | 210 90% 60% | معلومات، LCD |
| Background | `#0d1117` | 220 20% 7% | خلفية رئيسية |
| Card | `#171D26` | 220 18% 12% | بطاقات |
| Border | `#2A3344` | 220 15% 20% | حدود |
| Muted Text | `#7A8599` | 215 15% 55% | نص ثانوي |

### ألوان VIP (تدرج ذهبي)

```css
.vip-name {
  background: linear-gradient(
    90deg,
    #c9a227 0%,
    #f7e98e 35%,
    #d4a82f 60%,
    #a67c00 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: vip-shimmer 3s linear infinite;
}

.vip-border {
  border: 2px solid;
  border-image: conic-gradient(
    from var(--vip-angle),
    #c9a227, #f7e98e, #d4a82f, #a67c00, #c9a227
  ) 1;
  animation: vip-border-rotate 4s linear infinite;
}
```

---

## 4. الثيمات الخمسة (من DesignPreview)

| # | الاسم | اللون الرئيسي | خلفية الشاشة | الشعار |
|---|---|---|---|---|
| 1 | Tactical Radio — لاسلكي عسكري | `#7ecf3a` | `#0b1508` | قوي واحترافي |
| 2 | Aviation Cockpit — كوكبيت طائرة | `#4a9eff` | `#060c1a` | تقني وأنيق |
| 3 | UAE Premium Gold — هوية إماراتية | `#d4a020` | `#0e0c08` | ذهبي فاخر |
| 4 | Neon Cyber — مستقبلي نيون | `#a050ff` | `#080618` | عصري وجريء |
| 5 | Industrial Pro — صناعي | `#ff6018` | `#080808` | برتقالي ناري |

---

## 5. الحواف الدائرية (Border Radius)

```css
--radius: 1rem;                           /* 16px — قاعدة */
--radius-lg: var(--radius);               /* 16px */
--radius-md: calc(var(--radius) - 2px);   /* 14px */
--radius-sm: calc(var(--radius) - 4px);   /* 12px */
```

---

## 6. الحركات (Animations)

### Tailwind Accordion
```css
@keyframes accordion-down {
  from { height: 0 }
  to   { height: var(--radix-accordion-content-height) }
}
@keyframes accordion-up {
  from { height: var(--radix-accordion-content-height) }
  to   { height: 0 }
}
/* duration: 0.2s ease-out */
```

### Gate Screen Animations
```css
@keyframes gateGradientMove {
  0%   { background-position: 0% 0% }
  25%  { background-position: 100% 0% }
  50%  { background-position: 100% 100% }
  75%  { background-position: 0% 100% }
  100% { background-position: 0% 0% }
}

@keyframes gateShine {
  from { transform: translateX(-120%) }
  to   { transform: translateX(140%) }
}

@keyframes gatePulse {
  0%   { transform: scale(1);    opacity: 1 }
  100% { transform: scale(1.35); opacity: 0.7 }
}

@keyframes gateSpin {
  from { transform: rotate(0deg) }
  to   { transform: rotate(360deg) }
}

@keyframes gateFadeInUp {
  from { opacity: 0; transform: translateY(14px) }
  to   { opacity: 1; transform: translateY(0) }
}

@keyframes gateShake {
  0%, 100% { transform: translateX(0) }
  20%      { transform: translateX(-10px) }
  40%      { transform: translateX(10px) }
  60%      { transform: translateX(-8px) }
  80%      { transform: translateX(8px) }
}
```

### VIP Animations
```css
@keyframes vip-shimmer {
  0%   { background-position: -200% }
  100% { background-position:  200% }
}
/* duration: 3s linear infinite */

@keyframes vip-border-rotate {
  to { --vip-angle: 360deg }
}
/* duration: 4s linear infinite */
```

### PTT / Audio Animations
```css
@keyframes pulse-ring {
  0%   { transform: scale(1);   opacity: 0.6 }
  100% { transform: scale(1.8); opacity: 0 }
}

@keyframes wave-bar {
  0%, 100% { height: 8px }
  50%       { height: 28px }
}
```

---

## 7. مكونات shadcn/ui (47 مكوناً)

### النماذج (Forms)
```
accordion     checkbox    form          input
input-otp     label       radio-group   select
slider        switch      textarea      toggle
toggle-group
```

### التخطيط (Layout)
```
aspect-ratio  card        collapsible   pagination
scroll-area   separator   sidebar       table
```

### التنقل (Navigation)
```
breadcrumb    context-menu    dropdown-menu
menubar       navigation-menu
```

### الحوارات (Dialogs)
```
alert-dialog  dialog    drawer    popover    sheet
```

### عرض البيانات (Data Display)
```
alert    avatar    badge      calendar    chart
command  hover-card progress  skeleton    tabs    tooltip
```

### التغذية الراجعة (Feedback)
```
toast    sonner    use-toast (hook)
```

### أخرى
```
resizable
```

---

## 8. المكونات المخصصة

### radio/ (مكونات راديو)

#### LCDScreen.tsx
- عرض الوقت الحالي (HH:MM:SS)
- رقم الحصة الحالية (من 14 حصة)
- خلفية: تدرج أخضر داكن
- خط: monospace، وزن 800

#### NumPad.tsx
- لوحة أرقام 3×4
- أرقام 1-9 + `*` + 0 + `#`
- كل زر: دائري، حافة خضراء
- حالة: hover/active مع glow

#### AudioLevelIndicator.tsx
- 10 أشرطة عمودية
- ارتفاع متحرك بناءً على AnalyserNode FFT
- لون: أخضر → أصفر → أحمر حسب المستوى
- تحديث: ~60fps

#### VehicleList.tsx
- قائمة scrollable
- كل عنصر: رقم المركبة + حالة الاتصال + اسم الطالب
- حالة اتصال: ● أخضر / ○ رمادي
- زر اختيار: يُطلق useCallAssignment

### core/

#### GateScreen.tsx (17.8 KB)
```
التدفق:
┌─ عرض خلفية متحركة (gateGradientMove)
├─ 4 حقول OTP (InputOTP)
├─ SHA-256(input) === VITE_GATE_PIN_HASH ?
│    ✓ → localStorage["gate_passed"] = "1" → تابع
│    ✗ → gateShake + رسالة خطأ
└─ Shine animation على الإطار
```

#### SplashScreen.tsx
- مدة: 2.5 ثانية
- Framer Motion: fadeIn + scale
- شعار الشركة (company-logo.png)
- لون خلفية: `#09090b`

---

## 9. الأصول (Assets)

### الشعار
```
src/assets/company-logo.png          ← شعار Emirates Mobility الرئيسي
public/favicon.ico                   ← 48×48px favicon
```

### أيقونات Android (5 كثافات)
```
android/app/src/main/res/
├── mipmap-mdpi/      48×48px    (ic_launcher, ic_launcher_round, ic_launcher_foreground)
├── mipmap-hdpi/      72×72px
├── mipmap-xhdpi/     96×96px
├── mipmap-xxhdpi/    144×144px
├── mipmap-xxxhdpi/   192×192px
└── mipmap-anydpi-v26/ (adaptive icon XML — vector)
```

### صور المدربين
```
public/instructors/
└── mubarak-omar.png    ← صورة المدرب VIP
```

### Placeholder
```
public/placeholder.svg   ← صورة بديلة عند عدم وجود صورة مدرب
```

---

## 10. الأيقونات (Lucide React)

الأيقونات من مكتبة `lucide-react@0.462.0`:

| الأيقونة | الاستخدام |
|---|---|
| `Mic`, `MicOff` | PTT / كتم الصوت |
| `Phone`, `PhoneOff` | بدء / إنهاء مكالمة |
| `Radio` | واجهة الراديو |
| `Car` | رمز المركبة |
| `AlertTriangle` | تنبيه طوارئ |
| `Wifi`, `WifiOff` | حالة الاتصال |
| `Volume2`, `VolumeX` | التحكم بالصوت |
| `User`, `Users` | المدرب / قائمة |
| `Shield` | أمان / VIP |
| `Star` | VIP مميز |
| `ChevronDown/Up/Left/Right` | التنقل |
| `X`, `Check` | إلغاء / تأكيد |
| `Settings` | الإعدادات |
| `LogOut` | تسجيل الخروج |
| `Zap` | طاقة / تفعيل |

---

## 11. مواصفات المكونات الأساسية

### زر PTT (Push To Talk)
```css
/* حالة عادية */
background: linear-gradient(145deg, hsl(145 70% 45%), hsl(145 70% 35%));
border-radius: 50%;
width: 120px; height: 120px;
box-shadow:
  0 0 20px hsl(145 70% 45% / 0.4),
  0 0 60px hsl(145 70% 45% / 0.1),
  inset 0 2px 4px rgba(255,255,255,0.15);

/* حالة ضغط (active) */
background: linear-gradient(145deg, hsl(0 72% 55%), hsl(0 72% 45%));
box-shadow: 0 0 30px hsl(0 72% 55% / 0.6);
transform: scale(0.96);

/* حالة إرسال — نبض */
animation: pulse-ring 1s infinite;
```

### شاشة LCD
```css
background: linear-gradient(135deg, #0a1a08, #0d2010, #071508);
border: 1px solid hsl(145 70% 45% / 0.3);
border-radius: 12px;
font-family: 'Courier New', monospace;
color: hsl(145 70% 65%);
text-shadow: 0 0 10px hsl(145 70% 45% / 0.8);
padding: 12px 16px;
```

### بطاقة المركبة
```css
background: hsl(220 18% 12%);
border: 1px solid hsl(220 15% 20%);
border-radius: 14px;
/* عند الاتصال: */
border-color: hsl(145 70% 45% / 0.5);
box-shadow: 0 0 12px hsl(145 70% 45% / 0.15);
```

### مؤشر مستوى الصوت (VU Meter)
```css
/* الشريط */
width: 6px;
border-radius: 3px;
background: linear-gradient(
  to top,
  hsl(145 70% 45%),   /* أخضر - منخفض */
  hsl(60 90% 50%),    /* أصفر - متوسط */
  hsl(0 72% 55%)      /* أحمر - عالي */
);
animation: wave-bar 0.3s ease-in-out infinite;
animation-delay: calc(var(--i) * 0.05s);
```

---

## 12. تخطيط الصفحات

### InstructorRadio (مدرب)
```
┌─────────────────────────────────┐
│  Header: اسم المدرب + منطقة   │
├──────────────┬──────────────────┤
│  LCDScreen   │  VehicleList     │
│  (وقت+حصة)  │  (قائمة مركبات) │
├──────────────┴──────────────────┤
│        AudioLevelIndicator       │
├─────────────────────────────────┤
│  NumPad     │  PTT Button       │
│  (طلب رقم) │  (120px دائري)   │
├─────────────────────────────────┤
│      VoiceAssistant Button      │
└─────────────────────────────────┘
```

### StudentCarScreen (طالب)
```
┌─────────────────────────────────┐
│  Header: رقم المركبة + منطقة   │
├─────────────────────────────────┤
│  صورة المدرب المتصل             │
│  + اسمه + حالة الاتصال         │
├─────────────────────────────────┤
│  مؤقت الحصة (countup)           │
├─────────────────────────────────┤
│  زر الطوارئ    │  VoiceAssistant│
└─────────────────────────────────┘
```

### GateScreen (شاشة الأمان)
```
┌─────────────────────────────────┐
│  خلفية متحركة (gradient)        │
│                                  │
│    شعار Emirates Mobility        │
│                                  │
│    ◻ ◻ ◻ ◻   (OTP Input)       │
│                                  │
│    [   دخول   ]                  │
│                                  │
│    ← shine animation             │
└─────────────────────────────────┘
```

---

## 13. CSS المفيد للداشبورد (لإعادة الاستخدام)

```css
/* بطاقة حالة المركبة */
.vehicle-card-active {
  border-color: hsl(145 70% 45% / 0.5);
  box-shadow: 0 0 12px hsl(145 70% 45% / 0.15);
}

/* شارة الحالة */
.status-connected {
  background: hsl(145 70% 45% / 0.15);
  color: hsl(145 70% 65%);
  border: 1px solid hsl(145 70% 45% / 0.3);
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 12px;
}

/* نبض الإشارة */
.signal-pulse::before {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: hsl(145 70% 45% / 0.4);
  animation: pulse-ring 1.5s ease-out infinite;
}

/* تدرج خلفية الداشبورد */
.dashboard-bg {
  background: radial-gradient(
    ellipse at top left,
    hsl(145 70% 45% / 0.05) 0%,
    hsl(220 20% 7%) 60%
  );
}
```

---

## 14. Manifest PWA الكامل

```json
{
  "name": "Emirates Mobility",
  "short_name": "EM Radio",
  "description": "Emirates Mobility PTT Communications System",
  "theme_color": "#09090b",
  "background_color": "#09090b",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "categories": ["business", "communication"],
  "icons": [
    { "src": "/favicon.ico", "sizes": "48x48", "type": "image/x-icon" }
  ]
}
```

---

## 15. Tailwind Config الكامل

```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        primary: {
          DEFAULT:     "hsl(var(--primary))",
          foreground:  "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:     "hsl(var(--secondary))",
          foreground:  "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT:     "hsl(var(--accent))",
          foreground:  "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT:     "hsl(var(--destructive))",
          foreground:  "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:     "hsl(var(--muted))",
          foreground:  "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT:     "hsl(var(--card))",
          foreground:  "hsl(var(--card-foreground))",
        },
        border:      "hsl(var(--border))",
        input:       "hsl(var(--input))",
        ring:        "hsl(var(--ring))",
        info:        "hsl(var(--info))",
        sidebar: {
          DEFAULT:             "hsl(var(--sidebar-background))",
          foreground:          "hsl(var(--sidebar-foreground))",
          primary:             "hsl(var(--sidebar-primary))",
          "primary-foreground":"hsl(var(--sidebar-foreground))",
          accent:              "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border:              "hsl(var(--sidebar-border))",
          ring:                "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

---

*آخر تحديث: يونيو 2026 — يغطي كل commit حتى `2948b36`*
