import requests, sys, json
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

TOKEN      = "pn_4Ysp3lQlh8rfIOx2xgqnYGPfsRxULlZCqDkMm86gA"
ACCOUNT_ID = "ad711b94-9b7c-43d6-928f-208cda372a24"
HEADERS    = {"Authorization": f"Bearer {TOKEN}", "accountId": ACCOUNT_ID}

print("=== Canais da conta Prime Dente ===\n")
r = requests.get("https://api.wts.chat/chat/v1/channel", headers=HEADERS, timeout=30)
print(f"Status: {r.status_code}")
data = r.json()

channels = data if isinstance(data, list) else data.get("items", data.get("data", []))
print(f"Total de canais: {len(channels)}\n")

for ch in channels:
    print(f"ID     : {ch.get('id')}")
    print(f"Nome   : {ch.get('name')}")
    print(f"Número : {ch.get('phoneNumber') or ch.get('number') or ch.get('phone')}")
    print(f"Status : {ch.get('status')}")
    print(f"Tipo   : {ch.get('type')}")
    # dump all keys first time to understand schema
    if channels.index(ch) == 0:
        print(f"  [chaves disponíveis: {list(ch.keys())}]")
    print()

print("\n=== Raw JSON (primeiros 2 canais) ===")
print(json.dumps(channels[:2], ensure_ascii=False, indent=2))
