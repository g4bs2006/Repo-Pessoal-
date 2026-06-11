# -*- coding: utf-8 -*-
"""
Automacao: transfere cards das colunas finais do painel Prime Odontocenter
para o painel novo (Agendamentos), em duas rotas:

  - "Cliente Compareceu"          -> step "Compareceu e nao Fechou"
  - "Cliente Compareceu e Fechou" -> step "Compareceu e Fechou"

Etiquetas aplicadas em cada card:
  - Meta ou Organico conforme as tags do CONTATO
  - "Agendado pela IA" quando o contato tiver tag de agendamento pela IA
    (Agendou IA / Tag Agendou #1..#5 - Usada pela IA)
  - Sem tag Meta/Organico -> card criado sem ela e listado no relatorio final

Preserva a ordem das posicoes do painel antigo (por rota).
Originais ficam intactos. Idempotente via metadata.sourceCardId.

Uso:
    python automacao_transferencia_compareceu.py                # dry-run (so mostra)
    python automacao_transferencia_compareceu.py --executar     # cria de fato
    python automacao_transferencia_compareceu.py --executar --limite 1   # teste com 1
"""
import sys
import time
import json
import urllib.request
import urllib.parse

TOKEN = "***REMOVIDO***"
BASE_CARD = "https://api.wts.chat/crm/v1/panel/card"
BASE_CONTACT = "https://api.wts.chat/core/v1/contact"

PAINEL_ORIGEM = "fd4df083-7422-4171-9ee2-1c098e799798"
PAINEL_DESTINO = "9ad6a4e7-69c8-4a55-8a68-f6b0bb28ce78"

STEP_COMPARECEU_NAO_FECHOU = "7590a9a3-a465-49c0-9c36-d817f30ce000"
STEP_COMPARECEU_FECHOU = "d524d45c-04c9-457c-acb1-2f4101ebb44c"

# Etiquetas (tags) do PAINEL destino
TAG_PANEL_META = "43d016e0-ac2f-491d-bfe3-f3339eed640d"      # Meta
TAG_PANEL_ORGANICO = "d64d7f33-c735-4c7b-83d3-c70b14dc1bd3"  # Organico
TAG_PANEL_IA = "18b8f717-2a64-478f-93d9-1da7d23adef2"        # Agendado pela IA

# Etiquetas do CONTATO (core)
TAG_CONTATO_META = "d1ca3e78-76e1-4258-998c-c91f37a2aee9"      # Meta
TAG_CONTATO_ORGANICO = "185e5e5f-3923-4463-ad61-3d4459f3b4af"  # Organico
TAGS_CONTATO_AGENDOU_IA = {
    "ca1d6b70-bc7b-4fea-a09e-c88160749976",  # Agendou IA -  Usada pela IA
    "4800bb4d-98d2-4f0e-aff5-7ae78442adcb",  # Tag Agendou #1 - Usada pela IA
    "16875071-3839-486d-85e3-8bec0c3e39af",  # Tag Agendou #2 - Usada pela IA
    "1447bed3-e71a-404f-be58-7803ab10e613",  # Tag Agendou #3 - Usada pela IA
    "56395e27-7f63-438a-a1ef-6cd8286a217f",  # Tag Agendou #4 - Usada pela IA
    "057e37c0-a4e8-4ce6-8f59-177b9407f6d3",  # Tag Agendou #5 - Usada pela IA
}

# Rotas: step de origem -> step de destino
ROTAS = [
    {"nome": "Cliente Compareceu -> Compareceu e nao Fechou",
     "stepOrigem": "1fbd8745-1aee-4721-8c53-1cdc534c3a87",
     "stepDestino": STEP_COMPARECEU_NAO_FECHOU},
    {"nome": "Cliente Compareceu e Fechou -> Compareceu e Fechou",
     "stepOrigem": "9e21a624-5287-4c56-8e18-1ccc31ee0f99",
     "stepDestino": STEP_COMPARECEU_FECHOU},
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
    itens, pagina = [], 1
    while True:
        params = {"PanelId": panel_id, "PageSize": 100, "PageNumber": pagina,
                  "OrderBy": "position", "OrderDirection": "ASCENDING"}
        if step_id:
            params["StepId"] = step_id
        d = api("GET", f"{BASE_CARD}?{urllib.parse.urlencode(params)}")
        itens.extend(d["items"])
        if not d.get("hasMorePages"):
            return itens
        pagina += 1


_cache_contato = {}

def tags_do_contato(contact_id):
    if contact_id not in _cache_contato:
        try:
            c = api("GET", f"{BASE_CONTACT}/{contact_id}")
            _cache_contato[contact_id] = c.get("tagIds") or []
        except Exception as e:
            print(f"  AVISO: falha ao buscar contato {contact_id}: {e}")
            _cache_contato[contact_id] = []
        time.sleep(0.1)
    return _cache_contato[contact_id]


def main():
    executar = "--executar" in sys.argv
    limite = None
    if "--limite" in sys.argv:
        limite = int(sys.argv[sys.argv.index("--limite") + 1])

    criados, pulados, erros = 0, 0, 0
    sem_tag_meta_org = []
    parar = False

    for rota in ROTAS:
        if parar:
            break
        print(f"=== Rota: {rota['nome']} ===")

        # Dedup por step de destino
        existentes = listar_todos(PAINEL_DESTINO, rota["stepDestino"])
        ja_transferidos = set()
        for c in existentes:
            md = c.get("metadata") or {}
            if md.get("sourceCardId"):
                ja_transferidos.add(md["sourceCardId"])
        print(f"  Destino ja tem {len(existentes)} cards ({len(ja_transferidos)} com origem registrada).")

        cards = listar_todos(PAINEL_ORIGEM, rota["stepOrigem"])
        print(f"  {len(cards)} cards na origem.")
        posicao = 1.0

        for card in cards:
            if card["id"] in ja_transferidos:
                pulados += 1
                posicao += 1
                continue
            if limite is not None and criados >= limite:
                print(f"  Limite de {limite} atingido, parando.")
                parar = True
                break

            # Etiquetas conforme tags do contato
            tag_ids = []
            contact_ids = card.get("contactIds") or []
            if contact_ids:
                ctags = set(tags_do_contato(contact_ids[0]))
                if TAG_CONTATO_META in ctags:
                    tag_ids.append(TAG_PANEL_META)
                elif TAG_CONTATO_ORGANICO in ctags:
                    tag_ids.append(TAG_PANEL_ORGANICO)
                if ctags & TAGS_CONTATO_AGENDOU_IA:
                    tag_ids.append(TAG_PANEL_IA)
            if TAG_PANEL_META not in tag_ids and TAG_PANEL_ORGANICO not in tag_ids:
                sem_tag_meta_org.append(f"{card.get('key')} - {card['title']}")

            body = {
                "stepId": rota["stepDestino"],
                "title": card["title"],
                "description": card.get("description"),
                "position": posicao,
                "tagIds": tag_ids,
                "contactIds": contact_ids,
                "metadata": {
                    "sourceCardId": card["id"],
                    "sourceStep": rota["nome"],
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
                    api("POST", BASE_CARD, body)
                    criados += 1
                    if criados % 25 == 0:
                        print(f"  ... {criados} criados")
                    time.sleep(0.15)
                except Exception as e:
                    erros += 1
                    print(f"  ERRO no card {card.get('key')} ({card['title']}): {e}")
            else:
                criados += 1
            posicao += 1

    modo = "CRIADOS" if executar else "SERIAM CRIADOS (dry-run)"
    print(f"\nResumo: {criados} {modo} | {pulados} pulados (ja transferidos) | {erros} erros")
    if sem_tag_meta_org:
        print(f"\nCards cujo contato NAO tinha tag Meta/Organico ({len(sem_tag_meta_org)}):")
        for s in sem_tag_meta_org:
            print(f"  - {s}")


if __name__ == "__main__":
    main()
