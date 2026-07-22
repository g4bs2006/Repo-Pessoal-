import requests, sys, json
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

TOKEN      = "pn_4Ysp3lQlh8rfIOx2xgqnYGPfsRxULlZCqDkMm86gA"
ACCOUNT_ID = "ad711b94-9b7c-43d6-928f-208cda372a24"
HEADERS    = {"Authorization": f"Bearer {TOKEN}", "accountId": ACCOUNT_ID}
CANAL_ID   = "eda63311-5c6c-4fc2-8702-983aade007ee"

DATE_AFTER  = "2026-06-01T00:00:00Z"
DATE_BEFORE = "2026-06-19T23:59:59Z"

# 1. Total de sessões
print("=== Sessões no canal (21) 99991-5601 ===")
r = requests.get("https://api.wts.chat/chat/v2/session", headers=HEADERS,
    params={"ChannelsId": CANAL_ID, "CreatedAt.After": DATE_AFTER,
            "CreatedAt.Before": DATE_BEFORE, "PageNumber": 1, "PageSize": 1},
    timeout=30)
d = r.json()
total = d.get("totalCount", d.get("total", "?"))
print(f"Total de sessões (junho): {total}")
print()

# 2. Pega 20 sessões para inspecionar
r2 = requests.get("https://api.wts.chat/chat/v2/session", headers=HEADERS,
    params={"ChannelsId": CANAL_ID, "CreatedAt.After": DATE_AFTER,
            "CreatedAt.Before": DATE_BEFORE, "PageNumber": 1, "PageSize": 20},
    timeout=30)
d2 = r2.json()
items = d2.get("items", d2 if isinstance(d2, list) else [])

print(f"Sessões na amostra: {len(items)}")
print()

# 3. Mostra chaves únicas e campos que podem diferenciar unidades
if items:
    print(f"Chaves da sessão: {list(items[0].keys())}")
    print()

# Campos interessantes para diferenciar unidades
from collections import Counter
grupos   = Counter()
tags_all = Counter()
utms     = Counter()
funis    = Counter()

for s in items:
    grupos[str(s.get("groupId") or s.get("group") or s.get("teamId") or "sem_grupo")] += 1
    tags = s.get("tags") or s.get("labels") or []
    if isinstance(tags, list):
        for t in tags:
            tags_all[str(t.get("name", t) if isinstance(t, dict) else t)] += 1
    utms[str(s.get("utmSource") or s.get("utm_source") or "")] += 1
    funis[str(s.get("funnelStep") or s.get("stage") or "")] += 1

print(f"Grupos/Times: {dict(grupos)}")
print(f"Tags: {dict(tags_all)}")
print(f"UTM source: {dict(utms)}")
print(f"Funil steps: {dict(funis)}")
print()

# 4. Dump completo de 1 sessão para ver todos os campos
print("=== Dump completo da sessão [0] ===")
print(json.dumps(items[0], ensure_ascii=False, indent=2))

# 5. Tenta buscar SEM filtro de canal (todas as sessões da conta)
print("\n=== Sessões sem filtro de canal ===")
r3 = requests.get("https://api.wts.chat/chat/v2/session", headers=HEADERS,
    params={"CreatedAt.After": DATE_AFTER, "CreatedAt.Before": DATE_BEFORE,
            "PageNumber": 1, "PageSize": 1},
    timeout=30)
d3 = r3.json()
total_sem_filtro = d3.get("totalCount", d3.get("total", "?"))
print(f"Total sem filtro de canal: {total_sem_filtro}")
