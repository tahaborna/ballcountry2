# 📱 ساخت فایل نصبی APK «کشورهای توپی»

سه راه برای رسیدن به فایل APK روی گوشی — به‌ترتیب سادگی:

---

## ✅ راه ۱ — Netlify Drop + PWABuilder (بدون نصب هیچ ابزاری، ~۱۰ دقیقه)

این ساده‌ترین راه است و در پایان **APK امضاشده** می‌گیری:

1. پوشه **`dist`** را در سایت **app.netlify.com/drop** با موس بکش و رها کن
   → بعد از چند ثانیه یک لینک HTTPS رایگان می‌گیری (مثل `https://random-name.netlify.app`)
2. لینک را در کروم گوشی باز کن → منوی ⋮ → **«افزودن به صفحه اصلی»**
   → همین حالا بازی مثل اپ نصب می‌شود، تمام‌صفحه و آفلاین!
3. برای فایل APK واقعی: برو به **pwabuilder.com**، لینک Netlify را وارد کن
   → **Package for stores → Android**
   - Package ID: `ir.ballcountries.game`
   - دیپ‌لینک‌ها را از `dist/manifest.webmanifest` (فیلد shortcuts) کپی کن
   → دانلود ZIP شامل **`app-release-signed.apk`** (نصب مستقیم) و **`app-release-bundle.aab`** (گوگل‌پلی)
4. فایل APK را به گوشی بفرست (تلگرام/کابل) و لمسش کن → «نصب از منابع ناشناس» را تأیید کن

---

## ⚙️ راه ۲ — ساخت ابری با GitHub Actions (APK رسمی Capacitor، بدون نصب ابزار)

این روش همان نسخه Capacitor را در سرور گیت‌هاب می‌سازد. فایل `.github/workflows/build-apk.yml` در پروژه آماده است:

1. در **github.com** حساب بساز (رایگان) و یک Repository جدید بساز (Public یا Private)
2. در صفحه ساخت، گزینه **«uploading an existing file»** را بزن و کل محتویات پوشه `ball-countries` را بکش و رها کن (پوشه‌های تودرتو خودش می‌فهمد) → **Commit**
3. برو به تب **Actions** → workflow «ساخت APK اندروید» خودکار اجرا می‌شود
4. بعد از ~۵ دقیقه، داخل اجرا پایین صفحه بخش **Artifacts** → دانلود **`countries-balls-apk`** → داخلش فایل APK است
5. (اختیاری، برای خروجی release امضاشده) در ریپو:
   **Settings → Secrets and variables → Actions → New repository secret** و دو Secret بساز:
   - `KEYSTORE_B64` → خروجی دستور زیر در CMD ویندوز:
     ```
     certutil -encode ballcountries.keystore ks.txt
     ```
     محتوای فایل `ks.txt` (خطوط BEGIN/END را حذف کن) را در Secret بگذار
   - `KEYSTORE_PASS` → مقدار `storePassword` در فایل `keystore/keystore.properties` (روی سیستم خودت موجود است)
   حالا workflow خروجی **app-release.apk امضاشده** می‌دهد — آماده انتشار در استور

⚠️ هرگز پوشه `keystore` را در ریپو آپلود نکن — فقط از طریق Secrets.

---

## 🖥️ راه ۳ — ساخت روی کامپیوتر خودت (اگر Node.js + Android Studio داری)

دابل‌کلیک روی **`build-apk.bat`** — خودش همه مراحل (نصب، ساخت پروژه، امضا، gradle) را انجام می‌دهد و مسیر APK را نشان می‌دهد:
```
android\app\build\outputs\apk\release\app-release.apk
```

---

## 🔎 نصب APK روی گوشی (همه راه‌ها)

- فایل را به گوشی بفرست (تلگرامِ Saved Messages راحت‌ترین راه است)
- روی فایل لمس کن → اگر پرسید، اجازه «نصب از این منبع» را بده
- بعد از نصب، آیکون بازی با توپ پرچم‌دار روی صفحه اصلی ظاهر می‌شود 🎉
