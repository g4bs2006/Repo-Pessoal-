# -*- coding: utf-8 -*-
"""
Automacao: transfere cards da coluna "Cliente Faltou" do painel Prime Odontocenter
para o step "Faltou" do painel novo (Agendamentos), aplicando a etiqueta
Meta ou Organico conforme as tags do CONTATO vinculado ao card.
(Se o contato nao tiver nenhuma das duas, o card entra sem etiqueta
e aparece no relatorio final.)

Preserva a ordem das posicoes do painel antigo.
Originais ficam intactos. Idempotente via metadata.sourceCardId.

Uso:
    python automacao_transferencia_faltou.py                # dry-run (so mostra)
    python automacao_transferencia_faltou.py --executar     # cria de fato
    python automacao_transferencia_faltou.py --executar --limite 1   # teste com 1
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
STEP_FALTOU = "efe26a3f-8947-4004-a8f3-32bc87d85075"

# Etiquetas (tags) do PAINEL destino
TAG_PANEL_META = "43d016e0-ac2f-491d-bfe3-f3339eed640d"      # Meta
TAG_PANEL_ORGANICO = "d64d7f33-c735-4c7b-83d3-c70b14dc1bd3"  # Organico

# Etiquetas do CONTATO (core) que indicam a origem do lead
TAG_CONTATO_META = "d1ca3e78-76e1-4258-998c-c91f37a2aee9"      # Meta
TAG_CONTATO_ORGANICO = "185e5e5f-3923-4463-ad61-3d4459f3b4af"  # Organico

# Steps de origem, na ordem em que serao inseridos no Faltou
ORIGENS = [
    {"nome": "Cliente Faltou", "stepId": "f8747dd2-f9a8-4cf2-8205-35a7f1453dff"},
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
    """Retorna os tagIds do contato (com cache)."""
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

    print("Listando cards existentes no step Faltou do painel destino...")
    existentes = listar_todos(PAINEL_DESTINO, STEP_FALTOU)
    ja_transferidos = set()
    for c in existentes:
        md = c.get("metadata") or {}
        if md.get("sourceCardId"):
            ja_transferidos.add(md["sourceCardId"])
    print(f"  {len(existentes)} cards no destino, {len(ja_transferidos)} com origem registrada.\n")

    criados, pulados, erros = 0, 0, 0
    sem_tag_meta_org = []
    posicao = 1.0
    parar = False

    for origem in ORIGENS:
        if parar:
            break
        print(f"=== Origem: {origem['nome']} ===")
        cards = listar_todos(PAINEL_ORIGEM, origem["stepId"])
        print(f"  {len(cards)} cards encontrados.")
        for card in cards:
            if card["id"] in ja_transferidos:
                pulados += 1
                posicao += 1
                continue
            if limite is not None and criados >= limite:
                print(f"  Limite de {limite} atingido, parando.")
                parar = True
                break

            # Descobre Meta/Organico pelas tags do contato
            tag_lead = None
            contact_ids = card.get("contactIds") or []
            if contact_ids:
                ctags = tags_do_contato(contact_ids[0])
                if TAG_CONTATO_META in ctags:
                    tag_lead = TAG_PANEL_META
                elif TAG_CONTATO_ORGANICO in ctags:
                    tag_lead = TAG_PANEL_ORGANICO
            if tag_lead is None:
                sem_tag_meta_org.append(f"{card.get('key')} - {card['title']}")

            body = {
                "stepId": STEP_FALTOU,
                "title": card["title"],
                "description": card.get("description"),
                "position": posicao,
                "tagIds": [tag_lead] if tag_lead else [],
                "contactIds": contact_ids,
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
        print(f"\nCards cujo contato NAO tinha tag Meta/Organico ({len(sem_tag_meta_org)}) - criados sem etiqueta:")
        for s in sem_tag_meta_org:
            print(f"  - {s}")


if __name__ == "__main__":
    main()
