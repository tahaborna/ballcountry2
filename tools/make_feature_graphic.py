# -*- coding: utf-8 -*-
"""گرافیک ویژه گوگل‌پلی ۱۰۲۴×۵۰۰ — بدون کتابخانه خارجی (PNG خام).
استفاده: py tools/make_feature_graphic.py
خروجی: store-assets/feature-graphic-1024x500.png"""
import io, math, os, struct, sys, zlib
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT  = os.path.join(ROOT, 'store-assets')
W, H = 1024, 500

# ---------- PNG ----------
def make_png(w, h, px):
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            raw += bytes(px(x, y)) + b'\xff'  # RGB → RGBA
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr)
            + chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b''))

def mix(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * max(0.0, min(1.0, t))) for i in range(3))

def shade(c, f):
    return tuple(max(0, min(255, int(v * f))) for v in c)

# ---------- رنگ‌ها ----------
NAVY1 = (14, 22, 38); NAVY2 = (28, 52, 92)
GOLD  = (242, 182, 50); GOLD_D = (196, 138, 26)
TRI   = (233, 74, 74); TRI_D  = (150, 35, 40)
WHITE = (255, 255, 255); OFF  = (248, 250, 252)
GRN   = (35, 130, 80)

def ball_pixel(cx, cy, r, base, on, dark):
    """توپ سه‌بعدی: پایه + نوار افقی + نورپردازی کروی. dark = تابع تک‌آرگومانی تیره‌کننده."""
    def pix(x, y):
        dx = x - cx; dy = y - cy
        d2 = dx*dx + dy*dy
        if d2 > r*r:
            return None
        # الگوی افقی سه‌نواره (پرچم سبک ایران)
        rel = (y - (cy - r)) / (2*r)
        col = base
        if rel < 0.34: col = GRN
        elif rel > 0.66: col = TRI
        # سایه‌روشن کروی (نور از بالا-چپ)
        z = math.sqrt(max(0.0, r*r - d2))
        lx, ly, lz = -0.45, -0.55, 0.70
        nx, ny, nz = dx/r, dy/r, z/r
        lam = max(0.0, nx*lx + ny*ly + nz*lz)
        col = mix(dark(col), col, 0.25 + 0.75*lam)
        # براقیت
        sx, sy = dx + 0.42*r, dy + 0.48*r
        spec = max(0.0, 1 - (sx*sx + sy*sy)/(0.10*r*r))**2
        col = mix(col, WHITE, 0.75*spec)
        # نور لبه
        rim = max(0.0, (1 - nz)) ** 3
        col = mix(col, (90, 130, 190), 0.35*rim)
        return col
    return pix

def embl(x, y, cx, cy, s):
    """نشان ساده شیر و خورشید طلایی در مرکز؛ s = مقیاس."""
    dx, dy = x - cx, (y - cy) * 0.9
    r = math.hypot(dx, dy) / s
    a = math.degrees(math.atan2(-dy, dx)) % 360
    # خورشید
    if r < 0.55 and (int(a // 30) % 2 == 0 or r < 0.30):
        return GOLD if r < 0.30 else GOLD_D
    # شیر: بدن + سر + دم (شکل‌های ساده)
    if -0.45 < r < 1.0:
        ux, uy = dx / (r*s + 1e-6), dy / (r*s + 1e-6)
        if abs(uy - 0.25) < 0.14 and -0.4 < ux < 0.55:  # بدن
            return TRI_D
        if math.hypot(ux + 0.35, uy + 0.05) < 0.24:      # سر
            return TRI_D
        if 0.55 < ux < 0.75 and abs(uy - 0.05) < 0.05:   # دم
            return TRI_D
    return None

def render():
    # پس‌زمینه: گرادیان شعاعی + وینیت
    def bg(x, y):
        d = math.hypot(x - W/2, y - H/2) / (W*0.62)
        return mix(NAVY2, NAVY1, d)
    # ستاره‌های ثابت
    stars = [(118,86,1.9),(260,52,1.3),(438,38,2.2),(700,60,1.5),(880,44,2.0),
             (952,150,1.2),(80,320,1.6),(960,300,1.8),(150,430,1.4),(560,450,1.2),
             (840,420,1.6),(360,420,1.1),(508,120,1.0),(652,200,0.9)]
    def pixel(x, y):
        col = bg(x, y)
        for sx, sy, sr in stars:
            if (x-sx)**2 + (y-sy)**2 <= sr*sr:
                col = (215, 228, 246); break
        # سه توپ: بزرگ وسط، دو کوچک طرفین
        for (cx, cy, r, base) in ((512, 262, 118, GOLD), (300, 300, 64, OFF), (724, 300, 64, OFF)):
            ball = ball_pixel(cx, cy, r, base, None, lambda c: shade(c, 0.45))
            c = ball(x, y) if ball else None
            if c:
                col = c
                if (cx, cy, r) == (512, 262, 118):
                    e = embl(x, y, cx, cy, 56)
                    if e: col = e
                continue
            # چشم‌ها
            if (cx, cy, r) == (512, 262, 118):
                for ex in (cx-40, cx+40):
                    if (x-ex)**2*1.0 + ((y-(cy-18))*1.6)**2 < 14**2:
                        col = WHITE if ((y-(cy-18))*1.6)**2 + (x-ex)**2 < 14**2 else col
                        col = (255,255,255)
                        if (x-ex)**2 + ((y-(cy-16))*1.6)**2 < 7**2: col = (24,32,44)
                if (x-cx)**2 + ((y-(cy+46))*1.5)**2 < 26**2:   # لبخند
                    col = (150, 60, 70)
            else:
                for ex in (cx-22, cx+22):
                    if (x-ex)**2 + ((y-(cy-10))*1.6)**2 < 8**2: col = (255,255,255)
                    if (x-ex)**2 + ((y-(cy-9))*1.6)**2 < 4**2:  col = (24,32,44)
                if (x-cx)**2 + ((y-(cy+26))*1.5)**2 < 14**2:   col = (150, 60, 70)
        # جلوه سایه زیر توپ‌ها
        for (cx, cy, r) in ((512, 262, 118), (300, 300, 64), (724, 300, 64)):
            sy2 = cy + r*0.94
            sd = math.hypot((x-cx)*1.0, (y-sy2)*2.6)
            if sd < r*1.15 and y > sy2:
                col = mix(col, (0,0,0), 0.30*(1 - sd/(r*1.15)))
        return col
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, 'feature-graphic-1024x500.png')
    with open(path, 'wb') as f:
        f.write(make_png(W, H, pixel))
    print('OK', path)

if __name__ == '__main__':
    render()
