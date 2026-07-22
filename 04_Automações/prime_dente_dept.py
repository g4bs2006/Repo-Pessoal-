import requests, sys, json
from collections import Counter
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

TOKEN      = "pn_4Ysp3lQlh8rfIOx2xgqnYGPfsRxULlZCqDkMm86gA"
ACCOUNT_ID = "ad711b94-9b7c-43d6-928f-208cda372a24"
HEADERS    = {"Authorization": f"Bearer {TOKEN}", "accountId": ACCOUNT_ID}
CANAL_ID   = "eda63311-5c6c-4fc2-8702-983aade007ee"

# --- 1. Departamentos ---
print("=== Departamentos ===")
for endpoint in ["/core/v1/department", "/chat/v1/department", "/core/v1/departments"]:
    try:
        r = requests.get(f"https://api.wts.chat{endpoint}", headers=HEADERS, timeout=15)
        print(f"  {endpoint} → {r.status_code}")
        if r.status_code == 200:
            d = r.json()
            items = d if isinstance(d, list) else d.get("items", d.get("data", []))
            print(json.dumps(items[:5], ensure_ascii=False, indent=2))
            break
    except Exception as e:
        print(f"  {endpoint} → erro: {e}")

# --- 2. Paginar TODAS as sessões (sem filtro de data para pegar tudo) ---
print("\n=== Todas as sessões — paginando ===")
sessions = []
page = 1
while True:
    r = requests.get("https://api.wts.chat/chat/v2/session", headers=HEADERS,
        params={"ChannelsId": CANAL_ID, "PageNumber": page, "PageSize": 100},
        timeout=30)
    d = r.json()
    # Debug primeira página
    if page == 1:
        print(f"Chaves top-level: {list(d.keys()) if isinstance(d, dict) else 'lista'}")
        print(f"Amostra: {json.dumps(d, ensure_ascii=False)[:400]}")
    batch = d.get("items", d if isinstance(d, list) else [])
    if not batch:
        break
    sessions.extend(batch)
    total_pages = d.get("totalPages", d.get("pages", 1))
    print(f"  Página {page}/{total_pages} — {len(batch)} sessões")
    if page >= total_pages or len(batch) < 100:
        break
    page += 1

print(f"\nTotal de sessões encontradas: {len(sessions)}")

# --- 3. Distribuição por departamento ---
dept_counts = Counter(s.get("departmentId") or "sem_dept" for s in sessions)
print("\nDistribuição por departmentId:")
for dept_id, cnt in dept_counts.most_common():
    print(f"  {dept_id}: {cnt} sessões")

# --- 4. Datas das sessões ---
from datetime import datetime
datas = [s["createdAt"][:10] for s in sessions if s.get("createdAt")]
data_counts = Counter(datas)
print("\nSessões por data:")
for d, c in sorted(data_counts.items()):
    print(f"  {d}: {c}")

# --- 5. Amostra de bots e origens ---
bots    = Counter(s.get("botId") or "sem_bot" for s in sessions)
origens = Counter(s.get("origin") or "sem_origem" for s in sessions)
print(f"\nBots: {dict(bots)}")
print(f"Origens: {dict(origens)}")
