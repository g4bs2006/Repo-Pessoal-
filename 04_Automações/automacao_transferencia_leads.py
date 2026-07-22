# -*- coding: utf-8 -*-
"""
Automacao: transfere cards das colunas "Nao Agendados / Meta" e "Nao Agendados / Organico"
do painel Prime Odontocenter para o step "Leads" do painel de Agendamento,
aplicando a etiqueta META ou ORGANICO conforme a origem.

Idempotente: grava metadata.sourceCardId em cada card criado e pula os ja transferidos.
Uso:
    python automacao_transferencia_leads.py            # dry-run (so mostra o que faria)
    python automacao_transferencia_leads.py --executar  # cria os cards de fato
    python automacao_transferencia_leads.py --executar --limite 1  # testa com 1 card
"""
import sys
import time
import json
import urllib.request
import urllib.parse

TOKEN = "pn_22zvaOtn9H6mmwNKktsuKd91F8UDdLnuu085N5bw"
BASE = "https://api.wts.chat/crm/v1/panel/card"

PAINEL_ORIGEM = "fd4df083-7422-4171-9ee2-1c098e799798"
PAINEL_DESTINO = "9ad6a4e7-69c8-4a55-8a68-f6b0bb28ce78"
STEP_LEADS = "2a61ca71-431e-468c-8072-cb39e4db2382"

ORIGENS = [
    {"nome": "Nao Agendados / Meta",     "stepId": "57d98384-2435-44ef-ac72-a6ce13ea8843", "tagId": "43d016e0-ac2f-491d-bfe3-f3339eed640d"},  # META
    {"nome": "Nao Agendados / Organico", "stepId": "481c3384-26e5-4a9e-9235-eeccfd506ad5", "tagId": "d64d7f33-c735-4c7b-83d3-c70b14dc1bd3"},  # ORGANICO
]

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/json",
    "Content-Type": "application/json",
}


def api(method, url, body=None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    for tentativa in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            corpo = e.read().decode("utf-8", errors="replace")
            if e.code >= 500 and tentativa < 2:
                time.sleep(2 * (tentativa + 1))
                continue
            raise RuntimeError(f"HTTP {e.code}: {corpo}")
        except urllib.error.URLError:
            if tentativa < 2:
                time.sleep(2 * (tentativa + 1))
                continue
            raise


def listar_todos(panel_id, step_id=None):
    """Lista todos os cards de um painel/step, paginando."""
    itens, pagina = [], 1
    while True:
        params = {"PanelId": panel_id, "PageSize": 100, "PageNumber": pagina}
        if step_id:
            params["StepId"] = step_id
        d = api("GET", f"{BASE}?{urllib.parse.urlencode(params)}")
        itens.extend(d["items"])
        if not d.get("hasMorePages"):
            return itens
        pagina += 1


def main():
    executar = "--executar" in sys.argv
    limite = None
    if "--limite" in sys.argv:
        limite = int(sys.argv[sys.argv.index("--limite") + 1])

    # 1. Cards ja existentes no destino (para dedup via metadata.sourceCardId)
    print("Listando cards existentes no step Leads do painel destino...")
    existentes = listar_todos(PAINEL_DESTINO, STEP_LEADS)
    ja_transferidos = set()
    for c in existentes:
        md = c.get("metadata") or {}
        if md.get("sourceCardId"):
            ja_transferidos.add(md["sourceCardId"])
    print(f"  {len(existentes)} cards no destino, {len(ja_transferidos)} com origem registrada.\n")

    criados, pulados, erros = 0, 0, 0
    for origem in ORIGENS:
        print(f"=== Origem: {origem['nome']} ===")
        cards = listar_todos(PAINEL_ORIGEM, origem["stepId"])
        print(f"  {len(cards)} cards encontrados.")
        for card in cards:
            if card["id"] in ja_transferidos:
                pulados += 1
                continue
            if limite is not None and criados >= limite:
                print(f"  Limite de {limite} atingido, parando.")
                break
            body = {
                "stepId": STEP_LEADS,
                "title": card["title"],
                "description": card.get("description"),
                "tagIds": [origem["tagId"]],
                "contactIds": card.get("contactIds") or [],
                "metadata": {
                    "sourceCardId": card["id"],
                    "sourceStep": origem["nome"],
                    "sourceKey": card.get("key"),
                },
            }
            if card.get("sessionId"):
                body["sessionId"] = card["sessionId"]
            if card.get("responsibleUserId"):
                body["responsibleUserId"] = card["responsibleUserId"]
            if card.get("monetaryAmount") is not None:
                body["monetaryAmount"] = card["monetaryAmount"]

            if executar:
                try:
                    api("POST", BASE, body)
                    criados += 1
                    if criados % 25 == 0:
                        print(f"  ... {criados} criados")
                    time.sleep(0.15)  # respeitar rate limit
                except Exception as e:
                    erros += 1
                    print(f"  ERRO no card {card.get('key')} ({card['title']}): {e}")
            else:
                criados += 1  # contagem do dry-run
        else:
            continue
        break  # limite atingido

    modo = "CRIADOS" if executar else "SERIAM CRIADOS (dry-run)"
    print(f"\nResumo: {criados} {modo} | {pulados} pulados (ja transferidos) | {erros} erros")


if __name__ == "__main__":
    main()
