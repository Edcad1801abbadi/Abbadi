# Emirates Mobility — نظام الاتصالات الصوتية

<div align="center">

![Emirates Mobility](public/favicon.ico)

**منظومة اتصالات لاسلكية فورية لمدارس تعليم القيادة**

[![Build APK](https://github.com/aalabadi87/android-genie-craft/actions/workflows/build-apk.yml/badge.svg)](https://github.com/aalabadi87/android-genie-craft/actions/workflows/build-apk.yml)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime-3FCF8E?logo=supabase)](https://supabase.com)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P-orange)](https://webrtc.org)

</div>

---

## 📋 نظرة عامة

**Emirates Mobility** هو تطبيق اتصالات صوتية مخصص لمدارس تعليم القيادة في أبوظبي. يتيح التواصل الفوري بين المدربين وسيارات التدريب عبر تقنية WebRTC مع دعم وضعي البث العام والمكالمات الخاصة.

---

## ✨ المميزات الرئيسية

### 🎙️ الاتصال الصوتي
| الميزة | الوصف |
|--------|-------|
| **Push-to-Talk (PTT)** | بث صوتي فوري بضغطة واحدة |
| **البث العام** | يصل لجميع المتصلين في نفس المنطقة |
| **المكالمة الخاصة** | اتصال مباشر بين المدرب وسيارة محددة |
| **كتم انتقائي** | عزل الأطراف الأخرى أثناء المكالمة الخاصة |
| **Mesh Network** | اتصال P2P مباشر بين الأجهزة |

### 🚗 شاشة السيارة (Student)
- لوحة ترخيص أبوظبي بتصميم واقعي
- عداد الجلسة التدريبية مع شريط التقدم
- التاريخ والوقت بالعربية مع دعم رمضان
- زر الطوارئ لاستدعاء المدرب فوراً
- مؤشر المدرب المتصل مع صورته
- مساعد ذكي (AI Voice Assistant)

### 📻 شاشة المدرب (Instructor)
- واجهة راديو لاسلكي احترافية
- قائمة السيارات المتصلة في الوقت الفعلي
- قائمة المدربين المتصلين في نفس المنطقة
- لوحة اتصال رقمية (Dial Pad)
- تنبيهات طوارئ مرئية وصوتية
- تبديل مناطق التدريب بدون انقطاع
- مساعد ذكي (AI Voice Assistant)

### 🔧 تقنيات الاتصال
- **TURN/STUN** للاتصال خلف NAT وجدران الحماية
- **ICE Candidate Queueing** لتجنب حالات السباق
- **ICE Restart** التلقائي عند انقطاع الاتصال
- **Audio Unlock** لحل مشكلة Autoplay على الجوال
- مؤشر نوع الاتصال (HOST / STUN / TURN)

---

## 🏗️ هيكل المشروع

```
android-genie-craft/
├── src/
│   ├── pages/
│   │   ├── Login.tsx              # صفحة تسجيل الدخول
│   │   ├── InstructorRadio.tsx    # شاشة المدرب
│   │   ├── StudentCarScreen.tsx   # شاشة السيارة
│   │   ├── AudioTest.tsx          # صفحة اختبار الصوت
│   │   └── InstructorPhotos.tsx   # صور المدربين
│   ├── hooks/
│   │   ├── useWebRTC.ts           # إدارة اتصالات WebRTC
│   │   ├── useWebRTCAudio.ts      # مسار الصوت الخاص
│   │   ├── useCallAssignment.ts   # نظام تعيين المكالمات
│   │   ├── useRoomParticipants.ts # تتبع المتصلين
│   │   ├── useVehicles.ts         # قائمة السيارات
│   │   └── useInstructors.ts      # قائمة المدربين
│   ├── components/
│   │   ├── GateScreen.tsx         # شاشة PIN الأمني
│   │   ├── SplashScreen.tsx       # شاشة البداية
│   │   ├── VoiceAssistant.tsx     # مساعد ذكي للسيارة
│   │   ├── InstructorVoiceAssistant.tsx  # مساعد ذكي للمدرب
│   │   └── radio/                 # مكونات واجهة الراديو
│   ├── lib/
│   │   ├── turnCredentials.ts     # إدارة TURN credentials
│   │   ├── deviceId.ts            # معرف الجهاز الفريد
│   │   └── vip.ts                 # نظام المستخدمين المميزين
│   ├── constants/
│   │   └── trainingAreas.ts       # مناطق التدريب
│   └── integrations/
│       └── supabase/              # عميل Supabase والأنواع
├── android/                       # مشروع Android (Capacitor)
├── supabase/
│   └── migrations/                # ترحيلات قاعدة البيانات
├── public/
│   └── instructors/               # صور المدربين
└── .github/
    └── workflows/
        └── build-apk.yml          # بناء APK تلقائياً
```

---

## 🗃️ قاعدة البيانات (Supabase)

```sql
vehicles          -- السيارات (رقم، صندوق، نوع: auto/manual)
instructors       -- المدربون (الرقم الوظيفي، الاسم، المنصب، الصورة)
rooms             -- غرف التدريب
room_participants  -- المتصلون النشطون في الوقت الفعلي
call_assignments  -- تعيينات المكالمات الخاصة
```

---

## 🚀 تشغيل المشروع

### المتطلبات
- Node.js 18+
- حساب Supabase

### التثبيت

```bash
# استنساخ المستودع
git clone https://github.com/aalabadi87/android-genie-craft.git
cd android-genie-craft

# تثبيت التبعيات
npm install

# إعداد متغيرات البيئة
cp .env.example .env
# أضف VITE_SUPABASE_URL و VITE_SUPABASE_PUBLISHABLE_KEY

# تشغيل بيئة التطوير
npm run dev
```

### الأوامر المتاحة

```bash
npm run dev        # تشغيل بيئة التطوير
npm run build      # بناء للإنتاج
npm run preview    # معاينة البناء
npm run test       # تشغيل الاختبارات
npm run lint       # فحص الكود
```

---

## 📱 بناء APK

### تلقائياً عبر GitHub Actions

1. افتح المستودع على GitHub
2. اذهب إلى **Actions** → **Build Android APK**
3. اضغط **Run workflow**
4. بعد اكتمال البناء (5-10 دقائق) حمّل الـ APK من **Artifacts**

### يدوياً على جهازك

```bash
# تثبيت Android Studio أولاً، ثم:
npm run build
npx cap sync android
npx cap open android
# ثم Build → Generate APK من Android Studio
```

---

## 🔐 نظام الأمان

| الطبقة | الوصف |
|--------|-------|
| **Gate PIN** | رمز سري عند أول تشغيل |
| **WebRTC Filtering** | قبول الإشارات من الأجهزة المصرح بها فقط |
| **Row Level Security** | حماية بيانات Supabase على مستوى الصف |
| **TURN Credentials** | بيانات اعتماد مؤقتة لخوادم الترحيل |
| **VIP System** | صلاحيات مميزة للمطور والمدير |

---

## 🗺️ مناطق التدريب

| الرمز | المنطقة |
|-------|---------|
| `Tower 2` | برج 2 |
| `Tower 3` | برج 3 |

---

## 🛠️ التقنيات المستخدمة

| التقنية | الاستخدام |
|---------|----------|
| **React 18** | واجهة المستخدم |
| **TypeScript 5** | الأمان البرمجي |
| **Vite** | بيئة البناء |
| **Tailwind CSS** | التنسيق |
| **shadcn/ui** | مكونات UI |
| **Framer Motion** | الحركة والتأثيرات |
| **Supabase** | قاعدة البيانات والـ Realtime |
| **WebRTC** | الاتصال الصوتي P2P |
| **Capacitor** | تحويل لـ Android APK |
| **React Query** | إدارة حالة الخادم |
| **React Router** | التنقل بين الصفحات |

---

## 📞 جدول الجلسات

| الجلسة | البداية | النهاية | الفترة |
|--------|---------|---------|--------|
| 1–7 | 06:10 | 11:55 | صباحية |
| 8–14 | 12:05 | 17:50 | مسائية |

---

## 👤 المطور

**Abdallah Mohammad Abbadi**

---

## 📄 الترخيص

هذا المشروع خاص بـ Emirates Mobility. جميع الحقوق محفوظة.
