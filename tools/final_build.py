"""Monta os SVGs finais da marca AA MONTAGENS a partir dos contornos medidos."""
import sys, math, json
import trace as T
import svgutil as S

sys.stdout.reconfigure(encoding="utf-8")

AZUL = "#135885"
PRETO = "#1C1A17"
EPS = 1.2


def bbox(pts):
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def union_bbox(groups):
    b = [1e9, 1e9, -1e9, -1e9]
    for g in groups:
        for p in g:
            x0, y0, x1, y1 = bbox(p)
            b[0] = min(b[0], x0); b[1] = min(b[1], y0)
            b[2] = max(b[2], x1); b[3] = max(b[3], y1)
    return b


def collect():
    blue, black = T.load_masks()
    blue = T.clean(blue, 80)
    black = T.clean(black, 80)
    out = {}
    for name, mask in (("blue", blue), ("black", black)):
        cs = []
        for p in T.crack_contours(mask):
            if abs(T.area(p)) < 100:
                continue
            s = T.rdp_closed(p, EPS)
            if len(s) >= 3:
                cs.append(s)
        out[name] = cs
    return out


def classify(cs):
    """Separa por posicao medida no raster 1024x1024."""
    blue, black = cs["blue"], cs["black"]
    g = {k: [] for k in ("mono", "word_a", "welder", "visor", "torch", "sparks", "letters")}
    for p in blue:
        x0, y0, x1, y1 = bbox(p)
        g["mono" if y1 < 600 else "word_a"].append(p)
    for p in black:
        x0, y0, x1, y1 = bbox(p)
        a = abs(T.area(p))
        if y0 > 600:
            g["letters"].append(p)
        elif 610 <= x0 and x1 <= 670 and y1 < 340:
            g["visor"].append(p)
        elif a > 15000:
            g["welder"].append(p)
        elif a > 5000:
            g["torch"].append(p)
        else:
            g["sparks"].append(p)
    return g


def split_glyphs(paths, labels):
    """Agrupa contorno externo + buracos por letra, da esquerda para a direita."""
    outer = sorted([p for p in paths if T.area(p) > 0], key=lambda p: bbox(p)[0])
    holes = [p for p in paths if T.area(p) < 0]
    out = []
    for i, o in enumerate(outer):
        ox0, oy0, ox1, oy1 = bbox(o)
        grp = [o]
        for h in holes:
            hx0, hy0, hx1, hy1 = bbox(h)
            if hx0 >= ox0 - 1 and hx1 <= ox1 + 1 and hy0 >= oy0 - 1 and hy1 <= oy1 + 1:
                grp.append(h)
        out.append((labels[i] if i < len(labels) else "glifo-%d" % (i + 1), grp))
    return out


def mk_tx(box, target_w=None, target_h=None, pad=0.0, square=False):
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    if square:
        side = max(w, h)
        cx, cy = (x0 + x1) / 2.0, (y0 + y1) / 2.0
        x0, y0 = cx - side / 2.0, cy - side / 2.0
        w = h = side
    s = (target_w / w) if target_w else (target_h / h)
    def tx(p):
        return ((p[0] - x0) * s + pad, (p[1] - y0) * s + pad)
    return tx, (w * s + 2 * pad, h * s + 2 * pad)


def path_el(name, contours, tx, fill=None, indent="    "):
    d = "".join(S.d_from(p[0], [("L", q) for q in p[1:]], tx) for p in contours)
    f = ' fill="%s"' % fill if fill else ""
    return '%s<path id="%s"%s d="%s"/>' % (indent, name, f, d)


LETRAS = ["m", "o", "n", "t", "a", "g", "e", "n2", "s"]


def build(g, which):
    parts = []
    if which == "simbolo":
        box = union_bbox([g["mono"], g["welder"], g["visor"], g["torch"], g["sparks"]])
        tx, (w, h) = mk_tx(box, target_w=512, square=True)
        vb = "0 0 %s %s" % (S.fmt(w), S.fmt(h))
    else:
        box = union_bbox([g[k] for k in g])
        tx, (w, h) = mk_tx(box, target_w=1000)
        vb = "0 0 %s %s" % (S.fmt(w), S.fmt(h))

    mono_c = ' fill="currentColor"' if which == "mono" else ""
    az = None if which == "mono" else AZUL
    pr = None if which == "mono" else PRETO

    parts.append('  <g id="simbolo">')
    parts.append(path_el("monograma-aa", g["mono"], tx, az, "    "))
    parts.append(path_el("soldador", g["welder"] + g["visor"], tx, pr, "    "))
    parts.append(path_el("tocha", g["torch"], tx, pr, "    "))
    parts.append(path_el("faiscas", g["sparks"], tx, pr, "    "))
    parts.append("  </g>")

    if which != "simbolo":
        parts.append('  <g id="logotipo">')
        for nm, grp in split_glyphs(g["word_a"], ["a1", "a2"]):
            parts.append(path_el("letra-" + nm, grp, tx, az, "    "))
        for nm, grp in split_glyphs(g["letters"], LETRAS):
            parts.append(path_el("letra-" + nm, grp, tx, pr, "    "))
        parts.append("  </g>")

    titulo = {"full": "AA Montagens", "mono": "AA Montagens (monocromatico)",
              "simbolo": "AA Montagens (simbolo)"}[which]
    head = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s" role="img" '
            'aria-label="AA Montagens"%s>' % (vb, mono_c))
    return "\n".join([head, "  <title>%s</title>" % titulo] + parts + ["</svg>", ""])


if __name__ == "__main__":
    cs = collect()
    g = classify(cs)
    print("contornos por grupo:", {k: len(v) for k, v in g.items()})
    print("nos por grupo:", {k: sum(len(p) for p in v) for k, v in g.items()})
    import os
    os.makedirs("out", exist_ok=True)
    for which in ("full", "mono", "simbolo"):
        svg = build(g, which)
        fn = "out/logo-%s.svg" % ("full" if which == "full" else which)
        open(fn, "w", encoding="utf-8").write(svg)
        print(fn, len(svg), "bytes")
