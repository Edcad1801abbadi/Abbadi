# 🎨 تطبيق Genie Craft للأندرويد

## نظرة عامة:
تطبيق أندرويد متقدم مع مزايا احترافية وواجهة عربية كاملة.

## المزايا:
✅ تصميم Material Design
✅ دعم العربية
✅ سهولة التطوير
✅ دعم Firebase و Supabase
✅ Widgets قابلة للتخصيص
✅ الأداء العالي

## البدء السريع:

### 1. تثبيت Android Studio:
- اذهب إلى [android.com](https://developer.android.com/studio)
- حمل وثبت Android Studio
- ثبت Android SDK 35+

### 2. استنساخ المشروع:
```bash
git clone https://github.com/aalabadi87/android-genie-craft.git
cd android-genie-craft
git checkout android-migration
```

### 3. فتح في Android Studio:
- افتح `File > Open`
- اختر مجلد `android/`
- انتظر تحميل Gradle

### 4. التشغيل:
```bash
cd android
./gradlew installDebug
```

## الملفات الرئيسية:
- `MainActivity.java` - النشاط الرئيسي
- `activity_main.xml` - واجهة المستخدم
- `build.gradle` - إعدادات البناء
- `AndroidManifest.xml` - بيانات التطبيق

## اضافة مزايا جديدة:

### إضافة غاية (Activity) جديدة:
```java
public class NewActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_new);
    }
}
```

### إضافة Fragment:
```java
public class MyFragment extends Fragment {
    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                           Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_my, container, false);
    }
}
```

## التعاون والمساهمة:
1. Fork المستودع
2. أنشئ فرع جديد: `git checkout -b feature/your-feature`
3. اعمل على الميزة
4. Push التغييرات: `git push origin feature/your-feature`
5. أنشئ Pull Request

## الدعم:
للمساعدة والدعم، يرجى فتح Issue في المستودع.

---
**تم التطوير بـ ❤️ من قبل aalabadi87**
