# دليل بناء مشروع Genie Craft في Android Studio

## المتطلبات الأساسية:
1. ✅ Android Studio (أحدث إصدار)
2. ✅ Java Development Kit (JDK 11 أو أعلى)
3. ✅ Android SDK (API 35)
4. ✅ Gradle

## خطوات التثبيت والإعداد:

### 1️⃣ نسخ المشروع محليًا:
```bash
git clone https://github.com/aalabadi87/android-genie-craft.git
cd android-genie-craft
git checkout android-migration
```

### 2️⃣ فتح المشروع في Android Studio:
- افتح Android Studio
- اختر **File → Open**
- اختر مجلد `android-genie-craft/android`
- انتظر تحميل Gradle

### 3️⃣ تثبيت المتطلبات:
```bash
# تحديث Gradle
./gradlew --version

# تحميل جميع الـ dependencies
./gradlew build
```

### 4️⃣ تشغيل التطبيق:
```bash
# على محاكي الأندرويد أو جهاز فعلي
./gradlew installDebug
```

## هيكل المشروع:
```
android/
├── app/
│   ├── build.gradle (إعدادات البناء)
│   └── src/
│       ├── main/
│       │   ├── AndroidManifest.xml
│       │   ├── java/com/geniecraft/
│       │   │   └── MainActivity.java
│       │   └── res/
│       │       ├── layout/ (واجهات XML)
│       │       ├── values/ (الألوان والنصوص)
│       │       └── drawable/ (الصور)
├── build.gradle
├── settings.gradle
└── gradle.properties
```

## المزايا المضافة:
✨ دعم كامل لـ Material Design
✨ واجهة عربية
✨ دعم الأذونات (الكاميرا، التخزين، الموقع)
✨ جاهزية للتطوير

## التطوير الإضافي:

### إضافة Widgets:
```xml
<!-- في res/layout/activity_main.xml -->
<Button
    android:id="@+id/button_id"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:text="زر جديد" />
```

### ربط Firebase أو Supabase:
1. أضف dependency في `build.gradle`:
```gradle
dependencies {
    implementation 'com.firebase:firebase-bom:32.0.0'
    implementation 'com.firebase:firebase-database'
    implementation 'com.supabase:supabase-kt:1.4.0'
}
```

### تجميع التطبيق للإطلاق:
```bash
./gradlew assembleRelease
```

## استكشاف الأخطاء:
- إذا واجهت مشكلة في الـ Gradle، استخدم: `./gradlew clean build`
- تأكد من تثبيت Android SDK 35
- تحقق من متطلبات Java

## موارد مفيدة:
- [Android Developer Docs](https://developer.android.com/)
- [Material Design Guide](https://material.io/design/)
- [Android Studio Setup](https://developer.android.com/studio)

---
**آخر تحديث:** 2026
