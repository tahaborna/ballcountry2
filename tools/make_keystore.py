# -*- coding: utf-8 -*-
"""ساخت keystore امضای بازی با رمز تصادفی — فقط یک بار اجرا شود.
خروجی: keystore/ballcountries.keystore + keystore/keystore.properties
⚠️ این دو فایل را هرگز گم نکنید و هرگز عمومی نکنید؛ بدون آن‌ها نمی‌توانید آپدیت منتشر کنید."""
import secrets, subprocess, sys, os, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KS_DIR = os.path.join(ROOT, 'keystore')
KS = os.path.join(KS_DIR, 'ballcountries.keystore')
PROPS = os.path.join(KS_DIR, 'keystore.properties')

def find_keytool():
    from shutil import which
    k = which('keytool')
    if k: return k
    # مسیرهای رایج جاوا در ویندوز
    for base in [r'C:\Program Files\Java', r'C:\Program Files (x86)\Java']:
        if os.path.isdir(base):
            for d in sorted(os.listdir(base), reverse=True):
                p = os.path.join(base, d, 'bin', 'keytool.exe')
                if os.path.exists(p): return p
    return None

if os.path.exists(KS):
    print('⚠️  keystore از قبل وجود دارد:', KS)
    print('   برای امنیت، دوباره ساخته نشد. اگر می‌خواهی از نو ساخته شود، فایل را حذف کن.')
    sys.exit(0)

kt = find_keytool()
if not kt:
    print('❌ keytool پیدا نشد. Java (JDK) را نصب کنید: https://adoptium.net')
    sys.exit(1)

password = secrets.token_hex(12)  # رمز قوی تصادفی
os.makedirs(KS_DIR, exist_ok=True)
cmd = [kt, '-genkeypair', '-v',
       '-keystore', KS, '-storetype', 'PKCS12',
       '-alias', 'ballcountries',
       '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10950',
       '-storepass', password, '-keypass', password,
       '-dname', 'CN=Amirali Borna, OU=Games, O=BornaStudio, L=Tehran, C=IR']
r = subprocess.run(cmd, capture_output=True, text=True)
if r.returncode != 0:
    print('❌ خطای keytool:', r.stderr or r.stdout); sys.exit(1)

with open(PROPS, 'w', encoding='utf-8') as f:
    f.write('# ⚠️ محرمانه — هرگز commit/اشتراک نکنید. نسخه پشتیبان امن نگه دارید.\n')
    f.write('storeFile=../../keystore/ballcountries.keystore\n')
    f.write('storePassword=' + password + '\n')
    f.write('keyAlias=ballcountries\n')
    f.write('keyPassword=' + password + '\n')

print('✅ keystore ساخته شد:', KS)
print('✅ مشخصات امضا (محرمانه):', PROPS)
print('⚠️ پشتیبان امن از هر دو فایل بگیرید (فلش/ایمیل شخصی). بدون آن انتشار آپدیت ممکن نیست.')
