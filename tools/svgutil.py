"""Serializacao e conferencia de paths com M/L/A/Z."""
import math, re
import numpy as np
from PIL import Image, ImageDraw


def fmt(v):
    v = round(float(v), 1)
    return ("%d" % v) if v == int(v) else ("%.1f" % v)


def d_from(start, segs, tx=lambda p: p):
    p = tx(start)
    out = ["M%s %s" % (fmt(p[0]), fmt(p[1]))]
    for s in segs:
        if s[0] == "L":
            q = tx(s[1])
            out.append("L%s %s" % (fmt(q[0]), fmt(q[1])))
        elif s[0] == "A":
            _, r, large, sweep, p2 = s
            q = tx(p2)
            out.append("A%s %s 0 %d %d %s %s" % (fmt(r), fmt(r), large, sweep,
                                                 fmt(q[0]), fmt(q[1])))
        else:
            a, b, c = tx(s[1]), tx(s[2]), tx(s[3])
            out.append("C%s %s %s %s %s %s" % (fmt(a[0]), fmt(a[1]), fmt(b[0]),
                                               fmt(b[1]), fmt(c[0]), fmt(c[1])))
    out.append("Z")
    return "".join(out)


def arc_points(p0, r, large, sweep, p1, steps=None):
    """Endpoint -> centro (spec SVG F.6.5), amostrado."""
    x0, y0 = p0; x1, y1 = p1
    if abs(x1 - x0) < 1e-9 and abs(y1 - y0) < 1e-9:
        return []
    dx2, dy2 = (x0 - x1) / 2.0, (y0 - y1) / 2.0
    rx = ry = abs(r)
    lam = dx2 * dx2 / (rx * rx) + dy2 * dy2 / (ry * ry)
    if lam > 1:
        s = math.sqrt(lam)
        rx *= s; ry *= s
    num = rx * rx * ry * ry - rx * rx * dy2 * dy2 - ry * ry * dx2 * dx2
    den = rx * rx * dy2 * dy2 + ry * ry * dx2 * dx2
    co = math.sqrt(max(0.0, num / den)) if den else 0.0
    if large == sweep:
        co = -co
    cxp, cyp = co * rx * dy2 / ry, -co * ry * dx2 / rx
    cx, cy = cxp + (x0 + x1) / 2.0, cyp + (y0 + y1) / 2.0
    def ang(ux, uy, vx, vy):
        n = math.hypot(ux, uy) * math.hypot(vx, vy)
        if n == 0:
            return 0.0
        c = max(-1.0, min(1.0, (ux * vx + uy * vy) / n))
        a = math.acos(c)
        return -a if ux * vy - uy * vx < 0 else a
    t0 = ang(1, 0, (dx2 - cxp) / rx, (dy2 - cyp) / ry)
    dt = ang((dx2 - cxp) / rx, (dy2 - cyp) / ry, (-dx2 - cxp) / rx, (-dy2 - cyp) / ry)
    if not sweep and dt > 0:
        dt -= 2 * math.pi
    elif sweep and dt < 0:
        dt += 2 * math.pi
    if steps is None:
        steps = max(4, int(abs(dt) * max(rx, ry) / 1.5))
    return [(cx + rx * math.cos(t0 + dt * i / steps),
             cy + ry * math.sin(t0 + dt * i / steps)) for i in range(1, steps + 1)]


TOK = re.compile(r"[MLACZHV]|-?\d*\.?\d+(?:[eE][-+]?\d+)?", re.I)


def flatten(dstr):
    """Aceita M/L/H/V/C/A/Z absolutos e a repeticao implicita de argumentos.

    So absoluto: os SVGs deste projeto sao gerados assim de proposito.
    """
    polys, cur, pos = [], [], (0.0, 0.0)
    t = TOK.findall(dstr)
    i = 0
    cmd = None
    while i < len(t):
        if re.match(r"^[A-Za-z]$", t[i]):
            cmd = t[i]; i += 1
            if cmd in ("Z", "z"):
                if cur:
                    polys.append(cur); cur = []
                continue
        elif cmd is None:
            i += 1; continue
        elif cmd == "M":
            cmd = "L"          # M seguido de mais pares vira L, como manda a spec
        c = cmd
        if c == "M":
            if cur:
                polys.append(cur)
            pos = (float(t[i]), float(t[i + 1])); cur = [pos]; i += 2
        elif c == "L":
            pos = (float(t[i]), float(t[i + 1])); cur.append(pos); i += 2
        elif c == "H":
            pos = (float(t[i]), pos[1]); cur.append(pos); i += 1
        elif c == "V":
            pos = (pos[0], float(t[i])); cur.append(pos); i += 1
        elif c == "A":
            # A rx ry rot large sweep x y  -> 7 argumentos
            r = float(t[i]); large = int(float(t[i + 3])); sweep = int(float(t[i + 4]))
            p1 = (float(t[i + 5]), float(t[i + 6]))
            cur += arc_points(pos, r, large, sweep, p1)
            pos = p1; i += 7
        elif c == "C":
            c1 = (float(t[i]), float(t[i + 1])); c2 = (float(t[i + 2]), float(t[i + 3]))
            p1 = (float(t[i + 4]), float(t[i + 5])); p0 = pos
            for s in range(1, 17):
                u = s / 16.0; v = 1 - u
                cur.append((v**3*p0[0] + 3*v*v*u*c1[0] + 3*v*u*u*c2[0] + u**3*p1[0],
                            v**3*p0[1] + 3*v*v*u*c1[1] + 3*v*u*u*c2[1] + u**3*p1[1]))
            pos = p1; i += 6
        else:
            i += 1
    if cur:
        polys.append(cur)
    return polys


def sarea(p):
    s = 0.0
    for i in range(len(p)):
        x0, y0 = p[i]; x1, y1 = p[(i + 1) % len(p)]
        s += x0 * y1 - x1 * y0
    return s / 2.0


def rasterize(dlist, size=1024, scale=1.0):
    img = Image.new("1", (int(size * scale), int(size * scale)), 0)
    dr = ImageDraw.Draw(img)
    polys = []
    for d in dlist:
        polys += flatten(d)
    for p in sorted(polys, key=lambda q: -abs(sarea(q))):
        if len(p) < 3:
            continue
        q = [(x * scale, y * scale) for x, y in p]
        dr.polygon(q, fill=1 if sarea(p) > 0 else 0)
    return np.asarray(img, bool)


def iou(a, b):
    u = (a | b).sum()
    return (a & b).sum() / u if u else 1.0
