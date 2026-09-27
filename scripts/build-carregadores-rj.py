"""Gera artifacts/rio-flex/public/data/carregadores-rj.json a partir da base Carregados RJ (coleta Cavuca).

Uso:  python scripts/build-carregadores-rj.py [pasta_dados]
      (padrão: C:/Desenvolvimento/Hackathon/Cavuca/output/carregados_rj/dados)

Fonte: carregados.com.br (828 locais, 1.422 conectores, snapshot de 22/09/2026). Não é censo universal
nem verificação de operação real; preços são informados por comunidade/operador e não confirmados.
"""
import csv, json, sys, datetime
from collections import defaultdict
from pathlib import Path

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "C:/Desenvolvimento/Hackathon/Cavuca/output/carregados_rj/dados")
OUT = Path(__file__).resolve().parents[1] / "artifacts" / "rio-flex" / "public" / "data" / "carregadores-rj.json"
SMALL = {"de", "da", "do", "das", "dos", "e"}


def title(s: str) -> str:
    return " ".join(w if w in SMALL else w[:1].upper() + w[1:] for w in (s or "").lower().split())


def num(v: str):
    v = (v or "").strip()
    try:
        return float(v) if v else None
    except ValueError:
        return None


def flag(v: str) -> bool:
    return (v or "").strip().lower() == "true"


def rows(name: str):
    with open(SRC / name, encoding="utf-8-sig", newline="") as f:
        yield from csv.DictReader(f, delimiter=";")


conn = defaultdict(lambda: defaultdict(int))  # local -> (tipo, corrente, kW) -> n
for r in rows("conectores.csv"):
    conn[r["local_id"]][(r["tipo_nome"] or "?", r["corrente_inferida"] or "?", num(r["potencia_nominal_kW"]))] += 1

items = []
for r in rows("locais.csv"):
    lid = r["local_id"]
    cs = [{"t": t, "c": c, "k": k, "n": n} for (t, c, k), n in sorted(conn[lid].items(), key=lambda x: -(x[0][2] or 0))]
    dc = any(c["c"] == "DC" for c in cs)
    ac = any(c["c"] == "AC" for c in cs)
    price = num(r["preco_kWh_R"])
    items.append({
        "id": lid,
        "n": r["nome"].strip(),
        "m": title(r["cidade"]),
        "a": r["endereco"].strip(),
        "lat": round(float(r["latitude"]), 5),
        "lng": round(float(r["longitude"]), 5),
        "pub": flag(r["publico"]),
        "tipo": "DC" if dc else "AC" if ac else "?",
        "kw": num(r["potencia_max_conector_kW"]),
        "p": price,
        "taxa": num(r["taxa_ativacao_R"]),
        "gr": flag(r["rotulo_recarga_gratuita"]),
        "cf": flag(r["conflito_gratuito_pago"]) or flag(r["conflito_descricao_preco"]),
        "man": flag(r["manutencao_no_cartao"]) or flag(r["inativo"]) or flag(r["nome_indica_obra_ou_futuro"]),
        "rd": [x.strip() for x in (r["redes"] or "").split(",") if x.strip()],
        "tl": r["tipo_local"].strip(),
        "nc": int(num(r["n_conectores"]) or 0),
        "cs": cs,
        "hr": (r["horario"] or "").strip() or None,
        "up": (r["cadastro_atualizado_em"] or "")[:10] or None,
        "url": r["url"].strip(),
    })

OUT.parent.mkdir(parents=True, exist_ok=True)
doc = {
    "fonte": "Carregados (carregados.com.br) · coleta Cavuca",
    "snapshot": "2026-09-22",
    "aviso": "Base coletada de páginas públicas; não é censo universal nem confirma operação real. Preços são informados por comunidade/operador e não foram confirmados.",
    "total": len(items),
    "locais": items,
}
OUT.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"{len(items)} locais -> {OUT} ({OUT.stat().st_size/1024:.0f} KB)")
