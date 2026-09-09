"""Converte assets/logo/logo-full.svg no componente vetorial do @react-pdf.

Gerar por script, e nao transcrever a mao, evita erro de digitacao em 489 nos.

Uso: python tools/gerar_logo_pdf.py
Saida: src/pdf/LogoPdf.tsx
"""
import io
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

NS = "{http://www.w3.org/2000/svg}"
RAIZ = Path(__file__).resolve().parent.parent
ENTRADA = RAIZ / "assets" / "logo" / "logo-full.svg"
SAIDA = RAIZ / "src" / "pdf" / "LogoPdf.tsx"


def main():
    raiz = ET.parse(ENTRADA).getroot()
    viewbox = raiz.get("viewBox")
    if not viewbox:
        raise SystemExit(f"{ENTRADA} nao tem viewBox")
    largura_vb, altura_vb = (float(v) for v in viewbox.split()[2:4])
    caminhos = [(p.get("id"), p.get("fill"), p.get("d")) for p in raiz.iter(NS + "path")]

    linhas = [
        "/* GERADO por tools/gerar_logo_pdf.py — nao edite a mao.",
        " * Fonte: assets/logo/logo-full.svg (Fase 1).",
        " * Vetorial no PDF: sem raster, sem <image>, forma selecionavel e leve. */",
        "import { Path, Svg } from '@react-pdf/renderer';",
        "",
        "/** Logo completa da AA Montagens, em vetor. */",
        "export function LogoPdf({ largura }: { largura: number }) {",
        f"  const altura = (largura * {altura_vb}) / {largura_vb};",
        "  return (",
        f'    <Svg width={{largura}} height={{altura}} viewBox="{viewbox}">',
    ]
    for identificador, preenchimento, dados in caminhos:
        linhas.append(f'      {{/* {identificador} */}}')
        linhas.append(f'      <Path fill="{preenchimento}" d="{dados}" />')
    linhas += ["    </Svg>", "  );", "}", ""]

    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    io.open(SAIDA, "w", encoding="utf-8", newline="\n").write("\n".join(linhas))
    print(f"viewBox {viewbox} | {len(caminhos)} paths")
    print(f"-> {SAIDA.relative_to(RAIZ)}  ({SAIDA.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
