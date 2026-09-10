"""Confere a paleta da AA Montagens contra o WCAG 2.1 (AA).

Uso: python tools/contraste.py
Falha com codigo 1 se qualquer par cair abaixo do alvo.
"""
import sys

sys.stdout.reconfigure(encoding="utf-8")

PALETA = {
    # marca
    "acao": "#135885",
    "acao-forte": "#0D4166",
    "acao-fraca": "#E4EDF4",
    "tinta": "#1C1A17",
    "tinta-media": "#57514A",
    "tinta-fraca": "#736B63",
    # neutros
    "papel": "#FCFBF9",
    "fundo": "#F1EEE9",
    "linha-sutil": "#E2DCD3",
    "linha": "#948B81",
    "linha-forte": "#8E877D",
    # alerta
    "alerta": "#A33520",
    "alerta-fraca": "#F7E7E2",
    "branco": "#FFFFFF",
}

# (frente, fundo, descricao, alvo)  -- 4.5 texto normal, 3.0 texto grande e nao-texto
PARES = [
    ("tinta", "papel", "texto da tabela", 4.5),
    ("tinta", "fundo", "texto sobre o fundo", 4.5),
    ("tinta-media", "papel", "texto secundario", 4.5),
    ("tinta-fraca", "papel", "rotulo de campo", 4.5),
    ("tinta-fraca", "fundo", "rotulo sobre o fundo", 4.5),
    ("acao", "papel", "valor em destaque / link", 4.5),
    ("acao", "fundo", "link sobre o fundo", 4.5),
    ("tinta", "acao-fraca", "celula selecionada", 4.5),
    ("tinta-media", "acao-fraca", "rotulo na linha selecionada", 4.5),
    ("acao", "acao-fraca", "texto de acao na linha selecionada", 4.5),
    ("branco", "acao", "botao primario", 4.5),
    ("branco", "acao-forte", "botao primario em hover", 4.5),
    ("alerta", "papel", "aviso de reajuste e erro", 4.5),
    ("branco", "alerta", "botao destrutivo", 4.5),
    ("alerta", "alerta-fraca", "texto em faixa de erro", 4.5),
    ("linha", "papel", "borda de campo editavel", 3.0),
    ("linha-forte", "papel", "divisor estrutural", 3.0),
    ("linha-forte", "fundo", "divisor sobre o fundo", 3.0),
    ("acao", "papel", "anel de foco", 3.0),
    ("alerta", "papel", "marcador de status perdido", 3.0),
]

# Combinacoes proibidas por regra de uso, nao por acaso.
RESTRICOES = [
    ("tinta-fraca", "acao-fraca",
     "em linha selecionada, rotulo usa --cor-tinta-media"),
]


def _srgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def luminancia(h):
    def canal(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = map(canal, _srgb(h))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def razao(a, b):
    la, lb = luminancia(a), luminancia(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def main():
    falhas = []
    print("PALETA AA MONTAGENS — contraste WCAG 2.1\n")
    print(f"{'razao':>9}  {'nivel':<5}  par")
    for frente, fundo, desc, alvo in PARES:
        v = razao(PALETA[frente], PALETA[fundo])
        teto = 7.0 if alvo == 4.5 else 4.5
        nivel = "AAA" if v >= teto else ("AA" if v >= alvo else "FALHA")
        if v < alvo:
            falhas.append((frente, fundo, desc, round(v, 2), alvo))
        print(f"{v:8.2f}:1  {nivel:<5}  {frente} sobre {fundo} — {desc}")

    print("\nrestricoes de uso conhecidas:")
    for frente, fundo, nota in RESTRICOES:
        v = razao(PALETA[frente], PALETA[fundo])
        print(f"  {v:.2f}:1  {frente} sobre {fundo} — {nota}")

    if falhas:
        print(f"\n{len(falhas)} FALHA(S):")
        for f in falhas:
            print("  ", f)
        return 1
    print("\nnenhuma falha.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
