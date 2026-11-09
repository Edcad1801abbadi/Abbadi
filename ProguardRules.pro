# Proguard rules for Genie Craft

-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keep public class * extends java.lang.Exception

# Keep all activities, services, etc.
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Service
-keep public class * extends android.content.BroadcastReceiver
-keep public class * extends android.content.ContentProvider

# Keep model classes
-keep class com.geniecraft.models.** { *; }
-keep class com.geniecraft.data.** { *; }
