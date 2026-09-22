# -*- coding: utf-8 -*-
"""آیکون بازی «کشورهای توپی» — توپ سه‌بعدی با نورپردازی و نشان شیر و خورشید.
بدون کتابخانه خارجی (PNG خام). اجرا:  py tools/make_icons.py"""
import zlib, struct, math, os, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

def make_png(w, h, px):
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            raw += bytes(px(x, y))
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return (b'\x89PNG\r\n\x1a\n'
            + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(bytes(raw), 9))
            + chunk(b'IEND', b''))

def clamp(v, a, b): return max(a, min(b, v))
def smoothstep(a, b, x):
    t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3 - 2 * t)

# ---------- نورپردازی کروی ----------
Lx, Ly, Lz = -0.52, -0.62, 0.58  # جهت نور: بالا-چپ و رو به بیننده
ll = math.sqrt(Lx*Lx + Ly*Ly + Lz*Lz); Lx, Ly, Lz = Lx/ll, Ly/ll, Lz/ll

def shade(r, g, b, nx, ny, nz, specular=True):
    """سایه‌روشن لامبرتی + براقیت + نور بازتابی لبه"""
    diff = max(0.0, nx*Lx + ny*Ly + nz*Lz)
    amb  = 0.38
    f = amb + 0.72 * diff
    r, g, b = r*f, g*f, b*f
    if specular:
        # براقیت کوچک و درخشان
        hx, hy = -0.34, -0.40
        d2 = ((nx-hx)**2 + (ny-hy)**2)
        sp = math.exp(-d2 / (2*0.10**2)) * 0.85
        # هاله نرم‌تر بزرگ‌تر
        sp += math.exp(-d2 / (2*0.30**2)) * 0.18
        r, g, b = r + 255*sp, g + 255*sp, b + 255*sp
        # نور بازتابی لبه پایین-راست (رفلکس محیط آبی)
        if nz < 0.55:
            rim = (1 - nz/0.55)
            if (nx + ny) > 0.1:
                r += 90*rim*0.5; g += 150*rim*0.5; b += 255*rim*0.55
            else:
                r -= 25*rim; g -= 20*rim; b -= 10*rim
    return r, g, b

# ---------- نشان شیر و خورشید ----------
GOLD, GOLD2 = (236, 170, 32), (248, 204, 84)
LION = (172, 40, 30)

def in_sun(dx, dy):
    """خورشید: هسته + ۱۲ پرتو مثلثی"""
    rs_core, rs_out = 0.070, 0.108
    d = math.hypot(dx, dy)
    if d <= rs_core: return GOLD2
    if d <= rs_out:
        a = math.atan2(dy, dx)
        for k in range(12):
            ca = k * math.pi/6
            da = math.atan2(math.sin(a-ca), math.cos(a-ca))
            if abs(da) < 0.085: return GOLD
    return None

def in_lion(dx, dy):
    """شیر ساده: بدن، س	bg، سر، یال، پاها، دُم و شمشیر"""
    # بدن
    if (dx+0.055)**2/(0.13**2) + (dy-0.075)**2/(0.05**2) <= 1: return LION
    # س	ب (ران)
    if math.hypot(dx+0.15, dy-0.065) <= 0.055: return LION
    # سر + یال (حلقه دالبری)
    dh = math.hypot(dx-0.060, dy-0.015)
    if dh <= 0.042: return LION
    if 0.044 <= dh <= 0.070: return LION
    # پاها
    for lx in (-0.010, 0.050):
        if lx <= dx <= lx+0.017 and 0.110 <= dy <= 0.140: return LION
    # دُم (قطری)
    t = clamp(((dx+0.185)*(-0.015) + (dy-0.055)*(-0.10)) / ((-0.015)**2+(-0.10)**2 + 1e-9), 0, 1)
    px_, py_ = -0.185 + t*(-0.015), 0.055 + t*(-0.10)
    if math.hypot(dx-px_, dy-py_) <= 0.011: return LION
    # شمشیر
    t = clamp(((dx-0.085)*(0.05) + (dy-0.12)*(-0.21)) / (0.05**2+0.21**2), 0, 1)
    px_, py_ = 0.085 + t*0.05, 0.12 + t*(-0.21)
    if math.hypot(dx-px_, dy-py_) <= 0.009: return LION
    return None

def build(S, ballScale=1.0):
    c = S/2.0
    R = S*0.36*ballScale
    def px(x, y):
        # پس‌زمینه: هاله آبی تیره
        bd = math.hypot(x-c, y-c)/(S*0.72)
        bgf = smoothstep(0.05, 1.0, bd)
        px_out = (int(30-16*bgf), int(48-26*bgf), int(84-48*bgf), 255)
        # سایه افتاده زیر توپ
        sx, sy = x-(c+0.05*R), y-(c+1.06*R)
        sh = math.exp(-(sx**2/(2*(0.62*R)**2) + sy**2/(2*(0.13*R)**2)))
        if math.hypot(x-c, y-c) > R:
            k = 1 - 0.42*sh
            return (int(px_out[0]*k), int(px_out[1]*k), int(px_out[2]*k), 255)
        # روی توپ
        nx, ny = (x-c)/R, (y-c)/R
        nr = nx*nx + ny*ny
        if nr > 1.0: return px_out
        nz = math.sqrt(1-nr)
        # لبه تیره بیرونی
        if nr > 0.955: return (13, 19, 32, 255)
        # نوارهای پرچم (سفید کمی پهن‌تر برای جای نشان)
        fy = ny
        if fy < -0.36:   col = (35, 159, 64)
        elif fy <= 0.36: col = (246, 248, 252)
        else:            col = (218, 0, 0)
        # نشان شیر و خورشید (بین چشم‌ها)
        em = in_sun(nx-0.010, ny+0.045) or in_lion(nx, ny)
        if em: col = em
        # نورپردازی سه‌بعدی
        r, g, b = shade(col[0], col[1], col[2], nx, ny, nz)
        # چشم‌ها و دهان (روی نور)
        ex, ey_, rx, ry = 0.30*R, 0.055*R, 0.125*R, 0.175*R
        for sgn in (-1, 1):
            if ((x-(c+sgn*ex))/rx)**2 + ((y-(c-ey_))/ry)**2 <= 1:
                r, g, b = 252, 252, 255
            if ((x-(c+sgn*ex+0.18*rx))/(rx*0.52))**2 + ((y-(c-ey_+0.14*ry))/(ry*0.52))**2 <= 1:
                r, g, b = 24, 28, 36
        md = math.hypot(x-c, y-(c+0.30*R))
        if 0.28*R < md < 0.375*R and (x-c) < 0.15*R:
            r, g, b = 32, 36, 44
        return (clamp(int(r),0,255), clamp(int(g),0,255), clamp(int(b),0,255), 255)
    return px

os.makedirs('www/icons', exist_ok=True)
for size, name in [(512, 'icon-512.png'), (192, 'icon-192.png'), (64, 'icon-64.png')]:
    open('www/icons/'+name, 'wb').write(make_png(size, size, build(size)))
    print('OK', name)

# آیکون‌های maskable: پس‌زمینه کامل (بدون شفافیت) و توپ کوچک‌تر در ناحیه امن
for size, name in [(512, 'icon-512-maskable.png'), (192, 'icon-192-maskable.png')]:
    open('www/icons/'+name, 'wb').write(make_png(size, size, build(size, 0.72)))
    print('OK', name)

# آمار سریع برای صحت‌سنجی
px = build(512)
gold = lion = 0
for y in range(0, 512, 2):
    for x in range(0, 512, 2):
        e1 = in_sun((x-256)/512*2/0.72-0.010, (y-256)/512*2/0.72+0.045)
        if e1: gold += 1
print('sanity: sun pixels sampled =', gold)
