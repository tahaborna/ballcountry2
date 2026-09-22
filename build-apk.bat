@echo off
chcp 65001 >nul
title ساخت APK بازی کشورهای توپی
echo ============================================
echo   ساخت APK بازی «کشورهای توپی»
echo ============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [خطا] Node.js نصب نیست.
  echo این فایل را دانلود و نصب کنید ^(نسخه LTS^): https://nodejs.org
  echo بعد از نصب، این فایل را دوباره اجرا کنید.
  pause
  exit /b 1
)
echo [۱/۵] Node.js پیدا شد.

where java >nul 2>&1
java -version 2>&1 | findstr /i "17." >nul
if errorlevel 1 (
  echo [هشدار] JDK 17 پیدا نشد. Capacitor 6 به JDK 17 نیاز دارد.
  echo لینک دانلود: https://adoptium.net/temurin/releases/?version=17
  echo اگر Android Studio را نصب کنید، JDK و SDK هر دو با هم نصب می‌شوند.
  echo.
  choice /c YN /m "ادامه می‌دهید؟ Y=بله N=نه"
  if errorlevel 2 exit /b 1
)
echo [۲/۵] بررسی JDK انجام شد.

if not exist node_modules (
  echo [۳/۵] نصب Capacitor... چند دقیقه طول می‌کشد.
  call npm install
  if errorlevel 1 ( echo [خطا] نصب npm ناموفق بود. & pause & exit /b 1 )
) else (
  echo [۳/۵] Capacitor از قبل نصب است.
)

if not exist android (
  echo [۴/۵] ساخت پروژه اندروید...
  call npx cap add android
)
echo همگام‌سازی فایل‌های بازی...
call npx cap sync android
if errorlevel 1 ( echo [خطا] sync ناموفق بود. & pause & exit /b 1 )

REM امضای release و نسخه‌بندی
if not exist keystore\keystore.properties (
  py tools\make_keystore.py
)
py tools\apply_signing.py

echo.
echo انتخاب نوع خروجی:
echo   [1] APK عیب‌یابی ^(debug^) برای نصب روی گوشی خودتان
echo   [2] APK امضاشده release برای انتشار
choice /c 12 /n /m "انتخاب: "
if errorlevel 2 goto release
cd android
call gradlew.bat assembleDebug
if errorlevel 1 ( echo [خطا] ساخت ناموفق بود. & cd .. & pause & exit /b 1 )
cd ..
echo.
echo ============================================
echo   APK عیب‌یابی ساخته شد:
echo   %cd%\android\app\build\outputs\apk\debug\app-debug.apk
echo   نصب روی گوشی: اجازه «نصب از منابع ناشناس» را بدهید
echo ============================================
pause
exit /b 0

:release
cd android
call gradlew.bat assembleRelease
if errorlevel 1 ( echo [خطا] ساخت release ناموفق بود. & cd .. & pause & exit /b 1 )
cd ..
echo.
echo ============================================
echo   ✅ APK امضاشده release ساخته شد:
echo   %cd%\android\app\build\outputs\apk\release\app-release.apk
echo.
echo   برای انتشار در گوگل‌پلی به‌جای آن از AAB استفاده کنید:
echo   cd android ^&^& gradlew.bat bundleRelease
echo   خروجی: android\app\build\outputs\bundle\release\app-release.aab
echo ============================================
pause
