"""Extrai contornos limpos de mascaras de cor.

Crack following (bordas entre pixels on/off) -> RDP -> paths SVG.
Orientacao consistente: solido a direita, entao contorno externo e horario
e buraco e anti-horario (fill-rule nonzero funciona sem gambiarra).
"""
import sys, math, json
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
SRC = "xlsx/xl/media/image1.png"


def load_masks():
    im = np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    r, g, b = im[:, :, 0], im[:, :, 1], im[:, :, 2]
    blue = (b > r + 35) & (b > 80) & (g < b - 15)
    black = (r < 105) & (g < 105) & (b < 105)
    return blue, black


def clean(mask, min_area=60):
    """Remove ilhas e buracos minusculos (ruido de textura do papel)."""
    from collections import deque
    H, W = mask.shape
    out = mask.copy()
    for target in (True, False):
        seen = np.zeros((H, W), bool)
        for y in range(H):
            for x in range(W):
                if seen[y, x] or out[y, x] != target:
                    continue
                q = deque([(y, x)])
                seen[y, x] = True
                cells = []
                touches_border = False
                while q:
                    cy, cx = q.popleft()
                    cells.append((cy, cx))
                    if cy in (0, H - 1) or cx in (0, W - 1):
                        touches_border = True
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < H and 0 <= nx < W and not seen[ny, nx] and out[ny, nx] == target:
                            seen[ny, nx] = True
                            q.append((ny, nx))
                if len(cells) < min_area and not (target is False and touches_border):
                    for cy, cx in cells:
                        out[cy, cx] = not target
    return out


def crack_contours(mask):
    """Devolve poligonos fechados percorrendo as bordas entre pixels."""
    H, W = mask.shape
    m = np.zeros((H + 2, W + 2), bool)
    m[1:-1, 1:-1] = mask

    edges = {}          # ponto inicial -> lista de pontos finais
    def add(a, b):
        edges.setdefault(a, []).append(b)

    ys, xs = np.nonzero(m)
    for y, x in zip(ys.tolist(), xs.tolist()):
        if not m[y - 1, x]:
            add((x, y), (x + 1, y))            # topo: ->
        if not m[y, x + 1]:
            add((x + 1, y), (x + 1, y + 1))    # direita: v
        if not m[y + 1, x]:
            add((x + 1, y + 1), (x, y + 1))    # base: <-
        if not m[y, x - 1]:
            add((x, y + 1), (x, y))            # esquerda: ^

    polys = []
    while edges:
        start = next(iter(edges))
        poly = [start]
        cur = start
        prev_dir = None
        while True:
            outs = edges.get(cur)
            if not outs:
                break
            if len(outs) == 1:
                nxt = outs.pop()
            else:
                # ambiguidade em toque diagonal: escolhe a curva mais fechada
                # a esquerda para manter 4-conectividade do solido
                px, py = prev_dir if prev_dir else (1, 0)
                def score(p):
                    dx, dy = p[0] - cur[0], p[1] - cur[1]
                    # angulo de giro de prev_dir para (dx,dy); prefere menor giro a esquerda
                    cross = px * dy - py * dx
                    dot = px * dx + py * dy
                    return math.atan2(cross, dot)
                nxt = min(outs, key=score)
                outs.remove(nxt)
            if not edges[cur]:
                del edges[cur]
            prev_dir = (nxt[0] - cur[0], nxt[1] - cur[1])
            if nxt == start:
                break
            poly.append(nxt)
            cur = nxt
        if len(poly) >= 4:
            polys.append(poly)
    return polys


def rdp(pts, eps):
    stack = [(0, len(pts) - 1)]
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    while stack:
        i, j = stack.pop()
        if j <= i + 1:
            continue
        x0, y0 = pts[i]
        x1, y1 = pts[j]
        dx, dy = x1 - x0, y1 - y0
        n = math.hypot(dx, dy)
        best, bi = -1.0, i
        for k in range(i + 1, j):
            px, py = pts[k]
            d = (abs(dy * px - dx * py + x1 * y0 - y1 * x0) / n) if n else math.hypot(px - x0, py - y0)
            if d > best:
                best, bi = d, k
        if best > eps:
            keep[bi] = True
            stack.append((i, bi))
            stack.append((bi, j))
    return [p for p, k in zip(pts, keep) if k]


def rdp_closed(pts, eps):
    if len(pts) < 4:
        return pts
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    k = max(range(len(pts)), key=lambda i: (pts[i][0] - cx) ** 2 + (pts[i][1] - cy) ** 2)
    r = pts[k:] + pts[:k]
    out = rdp(r + [r[0]], eps)
    return out[:-1]


def area(pts):
    s = 0.0
    for i in range(len(pts)):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % len(pts)]
        s += x0 * y1 - x1 * y0
    return s / 2.0


def fmt(v):
    v = round(v, 1)
    return str(int(v)) if v == int(v) else str(v)


def to_path(pts):
    d = ["M", fmt(pts[0][0]), fmt(pts[0][1])]
    for x, y in pts[1:]:
        d += ["L", fmt(x), fmt(y)]
    d.append("Z")
    return " ".join(d)


if __name__ == "__main__":
    eps = float(sys.argv[1]) if len(sys.argv) > 1 else 1.4
    blue, black = load_masks()
    out = {}
    for name, mask in (("blue", blue), ("black", black)):
        mask = clean(mask, 80)
        ps = crack_contours(mask)
        keep = []
        for p in ps:
            if abs(area(p)) < 100:
                continue
            s = rdp_closed(p, eps)
            if len(s) >= 3:
                keep.append(s)
        keep.sort(key=lambda p: -abs(area(p)))
        out[name] = keep
        print(f"{name}: {len(keep)} contornos, {sum(len(p) for p in keep)} nos")
        for p in keep:
            xs = [q[0] for q in p]; ys = [q[1] for q in p]
            kind = "externo" if area(p) > 0 else "buraco "
            print(f"   {kind} nos={len(p):4d} area={abs(area(p)):9.0f} bbox=({min(xs)},{min(ys)})-({max(xs)},{max(ys)})")
    json.dump({k: [[[float(a), float(b)] for a, b in p] for p in v] for k, v in out.items()},
              open("contours.json", "w"))
    print("-> contours.json")
