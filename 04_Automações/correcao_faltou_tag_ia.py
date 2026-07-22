# -*- coding: utf-8 -*-
"""
Correcao: adiciona a etiqueta "Agendado pela IA" aos cards do step "Faltou"
do painel novo (Agendamentos) cujo CONTATO tenha tag de agendamento pela IA
("Agendou IA - Usada pela IA" ou "Tag Agendou #1..#5 - Usada pela IA").

NAO remove nem recria nada: usa PUT /crm/v2/panel/card/{id} preservando
as etiquetas ja existentes (Meta/Organico) e apenas acrescentando a da IA.
Idempotente: cards que ja tem a etiqueta sao pulados.

Uso:
    python correcao_faltou_tag_ia.py                # dry-run (so mostra)
    python correcao_faltou_tag_ia.py --executar     # atualiza de fato
    python correcao_faltou_tag_ia.py --executar --limite 1   # teste com 1
"""
import sys
import time
import json
import urllib.request
import urllib.parse

TOKEN = "pn_22zvaOtn9H6mmwNKktsuKd91F8UDdLnuu085N5bw"
BASE_CARD_V1 = "https://api.wts.chat/crm/v1/panel/card"
BASE_CARD_V2 = "https://api.wts.chat/crm/v2/panel/card"
BASE_CONTACT = "https://api.wts.chat/core/v1/contact"

PAINEL_DESTINO = "9ad6a4e7-69c8-4a55-8a68-f6b0bb28ce78"
STEP_FALTOU = "efe26a3f-8947-4004-a8f3-32bc87d85075"

# Etiqueta do PAINEL a acrescentar
TAG_PANEL_IA = "18b8f717-2a64-478f-93d9-1da7d23adef2"  # Agendado pela IA

# Tags de CONTATO que indicam agendamento pela IA
TAGS_CONTATO_AGENDOU_IA = {
    "ca1d6b70-bc7b-4fea-a09e-c88160749976",  # Agendou IA -  Usada pela IA
    "4800bb4d-98d2-4f0e-aff5-7ae78442adcb",  # Tag Agendou #1 - Usada pela IA
    "16875071-3839-486d-85e3-8bec0c3e39af",  # Tag Agendou #2 - Usada pela IA
    "1447bed3-e71a-404f-be58-7803ab10e613",  # Tag Agendou #3 - Usada pela IA
    "56395e27-7f63-438a-a1ef-6cd8286a217f",  # Tag Agendou #4 - Usada pela IA
    "057e37c0-a4e8-4ce6-8f59-177b9407f6d3",  # Tag Agendou #5 - Usada pela IA
}

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
        d = api("GET", f"{BASE_CARD_V1}?{urllib.parse.urlencode(params)}")
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

    print("Listando cards do step Faltou do painel destino...")
    cards = listar_todos(PAINEL_DESTINO, STEP_FALTOU)
    print(f"  {len(cards)} cards encontrados.\n")

    atualizados, ja_ok, sem_ia, erros = 0, 0, 0, 0

    for card in cards:
        if limite is not None and atualizados >= limite:
            print(f"Limite de {limite} atingido, parando.")
            break

        tag_ids = card.get("tagIds") or []
        if TAG_PANEL_IA in tag_ids:
            ja_ok += 1
            continue

        contact_ids = card.get("contactIds") or []
        tem_ia = False
        if contact_ids:
            ctags = set(tags_do_contato(contact_ids[0]))
            tem_ia = bool(ctags & TAGS_CONTATO_AGENDOU_IA)

        if not tem_ia:
            sem_ia += 1
            continue

        novas_tags = tag_ids + [TAG_PANEL_IA]
        if executar:
            try:
                api("PUT", f"{BASE_CARD_V2}/{card['id']}",
                    {"fields": ["TagIds"], "tagIds": novas_tags})
                atualizados += 1
                if atualizados % 25 == 0:
                    print(f"  ... {atualizados} atualizados")
                time.sleep(0.15)
            except Exception as e:
                erros += 1
                print(f"  ERRO no card {card.get('key')} ({card['title']}): {e}")
        else:
            atualizados += 1
            print(f"  [dry-run] {card.get('key')} - {card['title']} receberia Agendado pela IA")

    modo = "ATUALIZADOS" if executar else "SERIAM ATUALIZADOS (dry-run)"
    print(f"\nResumo: {atualizados} {modo} | {ja_ok} ja tinham a etiqueta | {sem_ia} contatos sem tag de IA | {erros} erros")


if __name__ == "__main__":
    main()
