# -*- coding: utf-8 -*-
"""ساخت خودکار پوشه dist برای آپلود در Netlify Drop (یا هر هاست استاتیک).

کارهایی که انجام می‌دهد (به‌ترتیب):
  ۱) افزایش شماره کش سرویس‌ورکر در  www/sw.js  (bc-v3 → bc-v4 و...) تا گوشی‌های
     کاربران نسخه تازه را بگیرند
  ۲) کپی کامل  www/  →  dist/  (پاک‌سازی قبلی)
  ۳) بازگرداندن  DEPLOY-GUIDE.md  از docs/ به داخل dist
  ۴) بالا آوردن سرور محلی (برای تست واقعی با سرویس‌ورکر) و باز کردن مرورگر

استفاده:
  py tools/make_dist.py                 # همه کارها + سرور + مرورگر
  py tools/make_dist.py --no-serve      # فقط ساخت (بدون سرور)
  py tools/make_dist.py --no-open       # سرور بدون باز کردن مرورگر
  py tools/make_dist.py --no-bump       # بدون افزایش شماره کش
  py tools/make_dist.py --port 9000     # انتخاب پورت دستی
"""
import argparse, functools, io, os, re, shutil, socket, sys, threading, webbrowser
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

ROOT       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WWW        = os.path.join(ROOT, 'www')
DIST       = os.path.join(ROOT, 'dist')
SW_WWW     = os.path.join(WWW, 'sw.js')
GUIDE_SRC  = os.path.join(ROOT, 'docs', 'DEPLOY-GUIDE.md')
GUIDE_NAME = 'DEPLOY-GUIDE.md'


def bump_cache():
    """افزایش شماره کش سرویس‌ورکر در www/sw.js — منبع اصلی همیشه www است."""
    with open(SW_WWW, encoding='utf-8', newline='') as f:
        s = f.read()
    m = re.search(r"const CACHE = 'bc-v(\d+)'", s)
    if m:
        old, new = 'bc-v' + m.group(1), 'bc-v' + str(int(m.group(1)) + 1)
        s = s.replace("const CACHE = '" + old + "'", "const CACHE = '" + new + "'", 1)
    else:
        old, new = '؟', 'bc-v1'
        s = re.sub(r"const CACHE = '[^']*'", "const CACHE = 'bc-v1'", s, count=1)
    with open(SW_WWW, 'w', encoding='utf-8', newline='') as f:
        f.write(s)
    return old, new


def build_dist(bump=True):
    if not os.path.isdir(WWW):
        sys.exit('✗ پوشه www پیدا نشد — از ریشه پروژه (ball-countries) اجرا کن.')
    old = new = None
    if bump:
        old, new = bump_cache()  # اول شماره کش، تا کپی نسخه تازه را ببرد
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    shutil.copytree(WWW, DIST)  # شامل .well-known/assetlinks.json هم می‌شود
    if os.path.isfile(GUIDE_SRC):
        shutil.copy2(GUIDE_SRC, os.path.join(DIST, GUIDE_NAME))
    n = sum(len(f) for _, _, f in os.walk(DIST))
    print('✓ ساخت dist کامل شد')
    print(f'  • فایل‌ها: {n}')
    if old is not None:
        print(f'  • کش سرویس‌ورکر: {old} → {new}')
    print('  • راهنما: DEPLOY-GUIDE.md از docs/ بازگردانده شد')


def free_port(start):
    for p in range(start, start + 25):
        with socket.socket() as s:
            try:
                s.bind(('127.0.0.1', p)); return p
            except OSError:
                continue
    return None


def serve(port, open_browser):
    port = free_port(port)
    if port is None:
        print('✗ پورت آزاد پیدا نشد'); return
    handler = functools.partial(SimpleHTTPRequestHandler, directory=DIST)
    httpd = ThreadingHTTPServer(('127.0.0.1', port), handler)
    url = f'http://127.0.0.1:{port}/index.html'
    print(f'✓ سرور محلی: {url}  (توقف با Ctrl+C)')
    print('  💡 برای انتشار: پوشه dist را در https://app.netlify.com/drop رها کن')
    if open_browser:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n✓ سرور بسته شد')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description='ساخت خودکار dist')
    ap.add_argument('--no-serve', action='store_true', help='بدون سرور محلی')
    ap.add_argument('--no-open',  action='store_true', help='بدون باز کردن مرورگر')
    ap.add_argument('--no-bump',  action='store_true', help='بدون افزایش شماره کش')
    ap.add_argument('--port', type=int, default=8642)
    a = ap.parse_args()
    build_dist(bump=not a.no_bump)
    if not a.no_serve:
        serve(a.port, open_browser=not a.no_open)
