# -*- coding: utf-8 -*-
"""افزایش نسخه بازی: py tools/bump-version.py [patch|minor|major]  (پیش‌فرض patch)"""
import io, os, re, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VP   = os.path.join(ROOT, 'android', 'version.properties')
kind = (sys.argv[1] if len(sys.argv) > 1 else 'patch').lower()

if not os.path.exists(VP):
    os.makedirs(os.path.dirname(VP), exist_ok=True)
    code, name = 1, '1.0.0'
else:
    txt = open(VP).read()
    code = int(re.search(r'versionCode=(\d+)', txt).group(1)) + 1
    maj, mi, pa = map(int, re.search(r'versionName=(\d+)\.(\d+)\.(\d+)', txt).groups())
    if kind == 'major':   maj, mi, pa = maj+1, 0, 0
    elif kind == 'minor': mi, pa = mi+1, 0
    else:                 pa += 1
    name = f'{maj}.{mi}.{pa}'

open(VP, 'w').write(f'versionCode={code}\nversionName={name}\n')
print(f'نسخه جدید: code={code}  name={name}')
