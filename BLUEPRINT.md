# Emirates Mobility — Blueprint كامل لإعادة البناء

> نسخة مرجعية شاملة من كل قطعة في التطبيق. يمكن بناء نسخة طبق الأصل باتباع هذا الملف فقط.

---

## 1. هوية التطبيق

| المعلومة | القيمة |
|---|---|
| الاسم | Emirates Mobility |
| App ID | `com.emiratesmobility.app` |
| Package (npm) | `vite_react_shadcn_ts` |
| الإصدار | 1.0 (versionCode=1) |
| Min SDK | 24 (Android 7.0) |
| Target SDK | 36 (Android 15) |
| منفذ Dev | 8080 |
| المنطقتان التدريبيتان | Tower 2 · Tower 3 |
| موظفو VIP | ID: 1 (Mubarak Omar Salem Omar) · ID: 1801 (Abdallah Mohammad Abdallah Abbadi) |

---

## 2. بنية المجلدات

```
android-genie-craft/
├── src/
│   ├── pages/             # 8 صفحات
│   ├── components/
│   │   ├── radio/         # 4 مكونات راديو
│   │   └── ui/            # 58 مكون shadcn
│   ├── hooks/             # 9 hooks
│   ├── lib/               # 4 ملفات مساعدة
│   ├── integrations/supabase/
│   ├── constants/
│   └── assets/
├── android/               # Capacitor + Gradle
├── supabase/
│   ├── migrations/        # 12 ملف SQL
│   └── functions/         # 4 Deno Edge Functions
├── public/
│   └── instructors/       # صور المدربين
└── .github/workflows/     # CI/CD
```

---

## 3. متغيرات البيئة المطلوبة

```env
# ملف .env.local (Frontend)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_GATE_PIN_HASH=<sha256 of the PIN>

# متغيرات Supabase Edge Functions (في لوحة Supabase)
METERED_API_KEY=         # مفتاح TURN من metered.ca
GOOGLE_API_KEY=          # Gemini 2.5 Flash
ELEVENLABS_API_KEY=      # ElevenLabs TTS
```

---

## 4. تهيئة المشروع من الصفر

```bash
# 1. إنشاء مشروع Vite + React + TypeScript
npm create vite@latest emirates-mobility -- --template react-ts
cd emirates-mobility

# 2. تثبيت كل الاعتمادات
npm install \
  @supabase/supabase-js \
  @tanstack/react-query \
  react-router-dom \
  react-hook-form \
  @hookform/resolvers \
  zod \
  framer-motion \
  sonner \
  recharts \
  date-fns \
  lucide-react \
  clsx \
  tailwind-merge \
  class-variance-authority \
  tailwindcss-animate

# Radix UI (shadcn primitives)
npm install \
  @radix-ui/react-accordion \
  @radix-ui/react-alert-dialog \
  @radix-ui/react-avatar \
  @radix-ui/react-checkbox \
  @radix-ui/react-dialog \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-label \
  @radix-ui/react-popover \
  @radix-ui/react-progress \
  @radix-ui/react-scroll-area \
  @radix-ui/react-select \
  @radix-ui/react-separator \
  @radix-ui/react-slider \
  @radix-ui/react-slot \
  @radix-ui/react-switch \
  @radix-ui/react-tabs \
  @radix-ui/react-toast \
  @radix-ui/react-tooltip

# Capacitor (Android)
npm install @capacitor/core @capacitor/android @capacitor/cli

# Dev deps
npm install -D \
  tailwindcss \
  autoprefixer \
  postcss \
  @vitejs/plugin-react-swc \
  vitest \
  @testing-library/react \
  @playwright/test

# 3. shadcn/ui init
npx shadcn@latest init
```

---

## 5. الإعدادات الأساسية

### vite.config.ts
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
    dedupe: ["react", "react-dom"],
  },
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
});
```

### capacitor.config.ts
```typescript
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.emiratesmobility.app",
  appName: "Emirates Mobility",
  webDir: "dist",
  android: {
    allowMixedContent: false,
  },
};
export default config;
```

### tailwind.config.ts (ألوان النظام)
```typescript
// Dark mode: class-based
// ألوان HSL كـ CSS variables في globals.css
// تفعيل plugin: tailwindcss-animate
```

### tsconfig.app.json (الإعدادات الجوهرية)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "jsx": "react-jsx",
    "strict": false,
    "moduleDetection": "force",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

---

## 6. قاعدة البيانات — Supabase

### الجداول الأربعة

```sql
-- جدول المركبات
CREATE TABLE vehicles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_number TEXT UNIQUE NOT NULL,   -- "1098"
  box_number TEXT NOT NULL,          -- "01"
  type       TEXT CHECK (type IN ('auto', 'manual')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- جدول المدربين
CREATE TABLE instructors (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number    INT UNIQUE NOT NULL,
  employee_id      INT UNIQUE NOT NULL,   -- يُستخدم في نظام VIP
  name             TEXT NOT NULL,
  position         TEXT DEFAULT 'Trainer',
  photo_url        TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- جدول الغرف (مناطق التدريب)
CREATE TABLE rooms (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  TEXT UNIQUE NOT NULL,   -- "Tower 2" أو "Tower 3"
  instructor_name       TEXT NOT NULL,
  instructor_employee_id INT NOT NULL,
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- جدول المشاركين في الغرفة
CREATE TABLE room_participants (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id                     UUID REFERENCES rooms(id) ON DELETE CASCADE,
  student_name                TEXT NOT NULL,
  car_number                  TEXT NOT NULL,
  peer_type                   TEXT CHECK (peer_type IN ('instructor', 'car')),
  peer_id                     TEXT NOT NULL,
  is_active                   BOOLEAN DEFAULT true,
  call_id                     TEXT,                   -- معرف المكالمة الفردية
  assigned_instructor_peer_id TEXT,                   -- ربط المدرب بالمركبة
  joined_at                   TIMESTAMPTZ DEFAULT now()
);
```

### RLS (Row Level Security)
```sql
-- تفعيل RLS على كل الجداول
ALTER TABLE vehicles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms              ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants  ENABLE ROW LEVEL SECURITY;

-- سياسة مفتوحة للقراءة والكتابة (internal app)
CREATE POLICY "open_all" ON vehicles           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON instructors        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON rooms              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON room_participants  FOR ALL USING (true) WITH CHECK (true);
```

### دوال قاعدة البيانات
```sql
-- تنظيف المشاركين الغائبين (35 ثانية)
CREATE OR REPLACE FUNCTION cleanup_stale_participants()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE room_participants
  SET is_active = false
  WHERE is_active = true
    AND joined_at < now() - INTERVAL '35 seconds';
END;
$$;

-- إعادة تعيين حالة الغرفة
CREATE OR REPLACE FUNCTION reset_room_state()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM room_participants;
END;
$$;

-- trigger لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 7. قنوات Supabase Realtime

| القناة | النوع | الرسائل |
|---|---|---|
| `room-{roomCode}` | broadcast | `offer`, `answer`, `ice-candidate` |
| `room-{roomCode}` | presence | `peerId` |
| `call-{callId}` | broadcast | `signal` (offer/answer/ice) |
| `room_participants` | postgres_changes | تحديثات الصفوف |

---

## 8. Edge Functions (Deno)

### 8.1 get-turn-credentials
```typescript
// GET /functions/v1/get-turn-credentials
// يجلب credentials من Metered API
const response = await fetch(
  `https://android-genie-craft.metered.live/api/v1/turn/credentials?apiKey=${METERED_API_KEY}`
);
// يُرجع: [{ urls, username, credential }]
// عند الفشل: يُرجع [] (الـ client يستخدم STUN بدلاً)
```

### 8.2 instructor-assistant
```typescript
// POST /functions/v1/instructor-assistant
// النموذج: google/gemini-2.5-flash (عبر Lovable AI gateway)
// اللغة: عربي دائماً
// Context المُرسَل:
{
  instructorName: string,
  employeeId: number,
  trainingArea: string,
  connectedCars: string[],
  selectedCar: string | null,
  message: string
}
```

### 8.3 car-assistant
```typescript
// POST /functions/v1/car-assistant
// النموذج: google/gemini-2.5-flash
// اللغات المدعومة: عربي، إنجليزي، أردو، باشتو، مليالامية
// Context المُرسَل:
{
  carNumber: string,
  trainingArea: string,
  sessionTime: string,      // "الحصة 3"
  ramadanDay: number | null,
  shift: "morning" | "evening",
  language: "ar" | "en" | "ur" | "ps" | "ml",
  message: string
}
```

### 8.4 elevenlabs-tts
```typescript
// POST /functions/v1/elevenlabs-tts
// يُرجع: Binary MP3 audio stream
const config = {
  voice_id: "onwK4e9ZLuTAKqWW03F9",  // Daniel (male)
  model_id: "eleven_multilingual_v2",
  voice_settings: {
    stability: 0.6,
    similarity_boost: 0.8,
    style: 0.3,
    speed: 0.95
  }
};
// الحد الأقصى للنص: 500 حرف
// الصوت: MP3، 44100 Hz، 128 kbps
```

---

## 9. الصفحات الثماني

### 9.1 Login.tsx
- حقل اسم المستخدم
- اختيار النوع: instructor أو car
- اختيار منطقة التدريب (Tower 2 / Tower 3)
- رسالة خطأ عربية عند فشل الاتصال
- يُوجَّه إلى InstructorRadio أو StudentCarScreen

### 9.2 InstructorRadio.tsx
**الميزات:**
- LCDScreen: الوقت الحالي + رقم الحصة
- VehicleList: قائمة المركبات المتصلة
- NumPad: لوحة أرقام للاتصال المباشر
- AudioLevelIndicator: مؤشر مستوى الصوت VU
- زر PTT (Push To Talk) — يُفعَّل بالضغط فقط
- زر الطوارئ VIP
- زر المساعد الصوتي (Gemini + ElevenLabs)
- Hooks المستخدمة: useWebRTC، useCallAssignment، useRoomParticipants، useVehicles، useInstructors

### 9.3 StudentCarScreen.tsx
**الميزات:**
- عرض رقم المركبة + اسم المنطقة
- مؤقت الحصة (countup)
- مؤشر الاتصال بالمدرب
- زر الطوارئ
- مساعد صوتي متعدد اللغات (VoiceAssistant.tsx)
- صورة المدرب المتصل (InstructorPhoto مكوّن React آمن — لا innerHTML)
- Hooks المستخدمة: useWebRTCAudio، useCallAssignment، useRoomParticipants

### 9.4 AudioTest.tsx
- صفحة debug لاختبار WebRTC
- عرض حالة ICE، نوع المسار (host/stun/turn)
- أزرار: connect، disconnect، send test tone

### 9.5–9.8 باقي الصفحات
- **InstructorPhotos.tsx**: معرض صور المدربين مع اسم الوظيفة
- **DesignPreview.tsx**: عرض نظام التصميم
- **Index.tsx**: الصفحة الرئيسية / التوجيه
- **NotFound.tsx**: صفحة 404

---

## 10. الـ Hooks التسعة

### useWebRTC.ts — Mesh Broadcast
```typescript
// بنية peer ID: "{type}-{employeeId}-{deviceId8chars}"
// مثال: "instructor-1801-a1b2c3d4" أو "car-1098-f3e2d1c0"
// ICE candidate pool: 10
// Audio bitrate: 64 kbps (setParameters)
// ICE restart: تلقائي عند حالة "failed"
// Selective mute: mute remote إذا privatePeerId !== remotePeerId
```

### useWebRTCAudio.ts — Direct Call
```typescript
// ICE candidate pool: 4
// قناة: call-{callId}
// اتجاه: instructor → car (مدرب يبدأ، مركبة تستقبل)
// callId format: "{area}:{carNumber}:{timestamp}"
```

### useCallAssignment.ts
```typescript
// يُراقب room_participants لتحديثات: call_id + assigned_instructor_peer_id
// يُحدَّث عبر Supabase Realtime (postgres_changes)
```

### useRoomParticipants.ts
```typescript
// يُسجِّل المشارك عند الانضمام
// heartbeat كل 10 ثوانٍ (يُحدِّث joined_at)
// يُلغي التسجيل عند الخروج (cleanup)
// يُشغِّل cleanup_stale_participants() دورياً
```

### useVehicles.ts / useInstructors.ts
```typescript
// TanStack Query: staleTime: 5 دقائق
// fetchVehicles() / fetchInstructors() من Supabase
```

### useNotificationSounds.ts
```typescript
// Web Audio API (AudioContext) — توليد نغمات برمجياً
// playJoinSound()       : نغمتان صاعدتان (600Hz → 900Hz)
// playLeaveSound()      : نغمتان هابطتان (700Hz → 400Hz)
// playPTTClick()        : نقرة قصيرة (1200Hz, 50ms, square)
// playChannelSwitchSound(): صوت ضبط راديو (1400→800→1100Hz)
// playIncomingCallSound() : رنين مكالمة (800↔1000Hz × 4)
// playEmergencySound()  : تنبيه طوارئ (سلسلة 3 رنات عاجلة)
```

---

## 11. المكونات الجوهرية

### GateScreen.tsx
```typescript
// حاجز PIN — يحجب التطبيق حتى إدخال الرمز الصحيح
// التحقق: SHA-256(PIN) === VITE_GATE_PIN_HASH
// عند النجاح: localStorage.setItem("gate_passed", "1")
// الخاصية: لا تُحتسب مجدداً إذا gate_passed=1
```

### SplashScreen.tsx
```typescript
// شاشة splash متحركة (Framer Motion)
// مدة العرض: 2.5 ثانية
// تُعرض مرة واحدة عند أول تشغيل
```

### VoiceAssistant.tsx (مركبة)
```typescript
// زر تفعيل الاستماع (Web Speech API / getUserMedia)
// إرسال إلى /functions/v1/car-assistant
// استقبال النص → إرسال لـ /functions/v1/elevenlabs-tts
// تشغيل MP3 عبر Audio element
// دعم 5 لغات: ar, en, ur, ps, ml
```

### InstructorVoiceAssistant.tsx (مدرب)
```typescript
// نفس البنية لكن يرسل إلى /functions/v1/instructor-assistant
// عربي فقط
// context إضافي: قائمة المركبات المتصلة + المركبة المختارة
```

### مكونات radio/
```typescript
// LCDScreen.tsx        : الوقت الحالي + رقم الحصة (14 حصة يومياً)
// NumPad.tsx           : لوحة أرقام 0-9 + * + #
// AudioLevelIndicator.tsx : AnalyserNode FFT → عرض VU meter
// VehicleList.tsx      : قائمة المركبات مع حالة الاتصال
```

---

## 12. ملفات lib/

### turnCredentials.ts
```typescript
export async function fetchTurnCredentials() {
  // timeout: 5 ثوانٍ
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await supabase.functions.invoke("get-turn-credentials", {
      signal: controller.signal,
    });
    return res.data ?? [];
  } catch {
    return []; // fallback to STUN
  } finally {
    clearTimeout(timeout);
  }
}
// STUN fallback:
// stun:stun.l.google.com:19302
// stun:stun1.l.google.com:19302
```

### deviceId.ts
```typescript
// يُولِّد UUID عشوائي عبر crypto.randomUUID()
// يُخزَّن في localStorage["device_id"]
// Fallback (Private Mode / iOS): متغير في الذاكرة
// يُستخدم: أول 8 أحرف hex في peer ID
```

### vip.ts
```typescript
const VIP_EMPLOYEES = [1, 1801];
// فئات CSS لـ VIP:
// "vip-name"   : تدرج ذهبي على الاسم
// "vip-border" : حدود متحركة ذهبية
// يُفحص via: extractEmployeeId(peerId) → VIP_EMPLOYEES.includes(id)
```

---

## 13. جدول الحصص (14 حصة يومياً)

```typescript
// صباحاً (7 حصص)
"06:10–06:55", "07:00–07:45", "07:50–08:35",
"08:40–09:25", "09:30–10:15", "10:20–11:05", "11:10–11:55"

// مساءً (7 حصص)
"12:05–12:50", "12:55–13:40", "13:45–14:30",
"14:35–15:20", "15:25–16:10", "16:15–17:00", "17:05–17:50"

// كل حصة: 45 دقيقة + 5 دقائق استراحة
// رمضان: تعديل خاص على التوقيت
```

---

## 14. Android — الملفات الأساسية

### AndroidManifest.xml
```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
<uses-permission android:name="android.permission.CHANGE_NETWORK_STATE"/>
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS"/>
<uses-permission android:name="android.permission.BLUETOOTH"/>
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT"/>
<uses-permission android:name="android.permission.WAKE_LOCK"/>

<!-- منع النسخ الاحتياطي -->
<application android:allowBackup="false"
             android:usesCleartextTraffic="false"
             android:networkSecurityConfig="@xml/network_security_config">

<!-- متطلب: ميكروفون -->
<uses-feature android:name="android.hardware.microphone" android:required="true"/>
```

### network_security_config.xml
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system"/>
    </trust-anchors>
  </base-config>
</network-security-config>
```

### android/app/build.gradle
```groovy
android {
    namespace "com.emiratesmobility.app"
    compileSdkVersion 36
    defaultConfig {
        applicationId "com.emiratesmobility.app"
        minSdkVersion 24
        targetSdkVersion 36
        versionCode 1
        versionName "1.0"
    }
    buildTypes {
        debug { applicationIdSuffix ".debug" }
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt')
        }
    }
}
```

### android/variables.gradle
```groovy
ext {
    minSdkVersion     = 24
    compileSdkVersion = 36
    targetSdkVersion  = 36
}
```

---

## 15. index.html — CSP وPWA

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <meta name="theme-color" content="#09090b"/>
  <link rel="manifest" href="/manifest.webmanifest"/>

  <!-- Content Security Policy -->
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    media-src 'self' mediastream: blob: data:;
    connect-src 'self'
      https://*.supabase.co
      wss://*.supabase.co
      stun:stun.l.google.com:19302
      stun:stun1.l.google.com:19302;
    img-src 'self' data: blob: https:;
  "/>
  <meta http-equiv="X-Content-Type-Options" content="nosniff"/>
  <meta name="referrer" content="no-referrer"/>

  <title>Emirates Mobility</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

### manifest.webmanifest
```json
{
  "name": "Emirates Mobility",
  "short_name": "EmiratesMobility",
  "display": "standalone",
  "background_color": "#09090b",
  "theme_color": "#09090b",
  "start_url": "/",
  "icons": [...]
}
```

---

## 16. GitHub Actions — بناء APK

```yaml
# .github/workflows/build-apk.yml
name: Build Android APK
on:
  push:
    branches: [main, claude/build-application-fGmEq]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
          VITE_GATE_PIN_HASH: ${{ secrets.VITE_GATE_PIN_HASH }}
      - uses: actions/setup-java@v4
        with: { distribution: 'temurin', java-version: '21' }
      - uses: android-actions/setup-android@v3
      - run: npx cap sync android
      - run: chmod +x android/gradlew
      - run: cd android && ./gradlew assembleDebug --no-daemon
      - uses: actions/upload-artifact@v4
        with:
          name: emirates-mobility-debug
          path: android/app/build/outputs/apk/debug/app-debug.apk
          retention-days: 30
```

**الأسرار المطلوبة في GitHub Secrets:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_GATE_PIN_HASH`

---

## 17. تسلسل بناء APK يدوياً

```bash
# 1. بناء الويب
npm run build

# 2. مزامنة Capacitor
npx cap sync android

# 3. بناء APK (يحتاج Android SDK + Java 21)
cd android
./gradlew assembleDebug

# مسار APK:
# android/app/build/outputs/apk/debug/app-debug.apk

# 4. تثبيت مباشر (اختياري)
adb install app/build/outputs/apk/debug/app-debug.apk
```

---

## 18. معمارية WebRTC الكاملة

```
┌─────────────────────────────────────────────────────────┐
│                    Supabase Realtime                      │
│  channel: "room-Tower2"     channel: "call-{id}"          │
│  type: broadcast            type: broadcast               │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
    ┌──────▼──────┐            ┌──────▼──────┐
    │  useWebRTC  │            │useWebRTCAudio│
    │  (Mesh)     │            │(Direct Call) │
    │             │            │              │
    │ offer/answer│            │ 1-on-1       │
    │ ice-candidate            │ instructor→car│
    │ ALL peers   │            │              │
    └──────┬──────┘            └──────┬──────┘
           │                          │
    ┌──────▼──────────────────────────▼──────┐
    │         RTCPeerConnection               │
    │  iceServers: TURN (Metered) + STUN      │
    │  audioBitrate: max 64 kbps              │
    │  iceCandidatePoolSize: 10 (mesh), 4(call)│
    └─────────────────────────────────────────┘

تدفق الإشارات:
1. المدرب يفتح التطبيق → ينضم لـ room-Tower2
2. مركبة تنضم → تستقبل offer من المدرب
3. مركبة ترد بـ answer → تبادل ICE candidates
4. اتصال صوتي جماعي مؤسَّس
5. المدرب يختار مركبة → useCallAssignment يُنشئ call_id
6. useWebRTCAudio يفتح قناة call-{callId}
7. اتصال مباشر 1:1 بين المدرب والمركبة
8. صوت باقي المركبات يُكتَّم (privatePeerId check)
```

---

## 19. المتغيرات الثابتة في الكود

```typescript
// src/constants/trainingAreas.ts
export const TRAINING_AREAS = ["Tower 2", "Tower 3"];

// src/lib/vip.ts
const VIP_EMPLOYEE_IDS = [1, 1801];

// useWebRTC.ts
const AUDIO_BITRATE_KBPS = 64;
const ICE_POOL_MESH = 10;
const ICE_POOL_CALL = 4;
const STALE_TIMEOUT_SECONDS = 35;
const HEARTBEAT_INTERVAL_MS = 10_000;

// elevenlabs-tts
const VOICE_ID = "onwK4e9ZLuTAKqWW03F9"; // Daniel
const MAX_TEXT_LENGTH = 500;

// capacitor
const APP_ID = "com.emiratesmobility.app";
const MIN_SDK = 24;
const TARGET_SDK = 36;
```

---

## 20. قائمة فحص الإطلاق

```
□ متغيرات البيئة الثلاثة مضبوطة في .env.local
□ الأسرار الثلاثة مضافة في GitHub Secrets
□ METERED_API_KEY مضبوط في Supabase Edge Functions
□ GOOGLE_API_KEY (Gemini) مضبوط في Supabase Edge Functions
□ ELEVENLABS_API_KEY مضبوط في Supabase Edge Functions
□ الجداول الأربعة مُنشأة في Supabase
□ RLS مُفعَّل على كل الجداول
□ الدوال الثلاث مُضافة (cleanup, reset, trigger)
□ Edge Functions الأربع مُنشورة
□ npm ci يمر بدون خطأ
□ npm run build يُنتج dist/
□ npx cap sync android يمر بدون خطأ
□ GitHub Actions workflow يبني APK بنجاح
□ APK يُثبَّت ويفتح على Android 7.0+
```

---

*آخر تحديث: يونيو 2026 — يغطي كل commit حتى `0827518`*
