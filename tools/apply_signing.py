# -*- coding: utf-8 -*-
"""اعمال پیکربندی امضای release و نسخه‌بندی روی پروژه اندروید Capacitor.
قبل از اجرا: پروژه android/ باید ساخته شده باشد (npx cap add android)
و keystore با tools/make_keystore.py ساخته شده باشد."""
import io, os, re, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AND  = os.path.join(ROOT, 'android')
APP_GRADLE = os.path.join(AND, 'app', 'build.gradle')
PKG   = 'ir.ballcountries.game'
VPF   = os.path.join(AND, 'version.properties')

if not os.path.exists(APP_GRADLE):
    print('پروژه android/ پیدا نشد. اول: npm install && npx cap add android'); sys.exit(1)
if not os.path.exists(os.path.join(ROOT, 'keystore', 'keystore.properties')):
    print('keystore پیدا نشد. اول: py tools/make_keystore.py'); sys.exit(1)

g = open(APP_GRADLE, encoding='utf-8').read()

if 'keystore.properties' not in g:
    # تزریق نسخه‌بندی از version.properties
    g = g.replace('apply plugin: \'com.android.application\'',
        "apply plugin: 'com.android.application'\n\n"
        "// --- نسخه‌بندی بازی (توسط tools/bump-version.py مدیریت می‌شود) ---\n"
        "def versionProps = new Properties()\n"
        "def vpFile = file('../version.properties')\n"
        "if (vpFile.exists()) { versionProps.load(new FileInputStream(vpFile)) }\n"
        "def vCode = (versionProps['versionCode'] ?: '1') as Integer\n"
        "def vName = versionProps['versionName'] ?: '1.0.0'")
    # بلوک امضا و android{}
    g = re.sub(r'android \{',
        "// --- امضای release (keystore خارجی، محرمانه) ---\n"
        "def keystoreProps = new Properties()\n"
        "def ksFile = file('../../keystore/keystore.properties')\n"
        "if (ksFile.exists()) { keystoreProps.load(new FileInputStream(ksFile)) }\n\n"
        "android {", g, count=1)
    g = re.sub(r'(android \{\n)',
        r'''\1    namespace 'ir.ballcountries.game'
    compileSdk rootProject.ext.compileSdkVersion
    defaultConfig {
        applicationId "ir.ballcountries.game"
        versionCode vCode
        versionName vName
    }
    signingConfigs {
        release {
            if (ksFile.exists()) {
                storeFile file(keystoreProps['storeFile'])
                storePassword keystoreProps['storePassword']
                keyAlias keystoreProps['keyAlias']
                keyPassword keystoreProps['keyPassword']
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            shrinkResources false
        }
    }
''', g, count=1)
    open(APP_GRADLE, 'w', encoding='utf-8').write(g)
    print('پیکربندی امضا و نسخه‌بندی به build.gradle اضافه شد')
else:
    print('امضای release از قبل اعمال شده است')

# version.properties اولیه
if not os.path.exists(VPF):
    os.makedirs(AND, exist_ok=True)
    open(VPF, 'w').write('versionCode=1\nversionName=1.0.0\n')
    print('version.properties ساخته شد (versionCode=1, versionName=1.0.0)')
else:
    print('version.properties موجود است')

print('انجام شد — برای ساخت خروجی استور: cd android && gradlew.bat bundleRelease  (AAB)')
print('یا APK release:  gradlew.bat assembleRelease')
