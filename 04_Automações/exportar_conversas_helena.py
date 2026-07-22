import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import requests
import pandas as pd
from datetime import datetime, timezone

# ── Configurações ──────────────────────────────────────────────────────────────
TOKEN       = "pn_1gWjbibuaPS7yHIzgZvh2DAbuyT2abE3FVVIvtrTss"
ACCOUNT_ID  = "372d5f80-ba1e-4172-9d5a-6c93051dca61"
CANAL_ALVO  = "31994319431"   # dígitos do número (31) 99431-9431
BASE_URL    = "https://api.wts.chat"

# Junho 2026 — 01/06 00:00 UTC  até  19/06 23:59:59 UTC
DATE_AFTER  = "2026-06-01T00:00:00Z"
DATE_BEFORE = "2026-06-19T23:59:59Z"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "accountId": ACCOUNT_ID,
    "Content-Type": "application/json",
}

# ── Helpers ────────────────────────────────────────────────────────────────────
def get_response(url, params: dict) -> any:
    """Executa GET e retorna o JSON bruto."""
    r = requests.get(url, headers=HEADERS, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def get_all_pages(url, params: dict) -> list:
    """Percorre todas as páginas de um endpoint paginado e retorna os items."""
    items = []
    page  = 1
    while True:
        p = dict(params)
        p["PageNumber"] = page
        p["PageSize"]   = 100
        data = get_response(url, p)

        # Resposta pode ser lista direta ou dict paginado
        if isinstance(data, list):
            items.extend(data)
            break  # lista direta = sem paginação

        batch = (
            data.get("items")
            or data.get("data")
            or data.get("result")
            or []
        )
        if not batch:
            break
        items.extend(batch)

        total_pages = (
            data.get("totalPages")
            or data.get("pageCount")
            or (data.get("totalCount", 0) // 100 + 1)
        )
        if page >= total_pages or len(batch) < 100:
            break
        page += 1
    return items


# ── 1. Descobrir o ID do canal pelo número ─────────────────────────────────────
print("Buscando canais...")
canais = get_all_pages(f"{BASE_URL}/chat/v1/channel", {"ChannelType": "All"})

canal_id = None
for c in canais:
    nome = str(c.get("name", "")).strip()
    numero = str(c.get("number", "")).strip()
    identificador = str(c.get("identifier", "")).strip()
    # Remove caracteres não-dígitos para comparar
    import re
    num_digits = re.sub(r'\D', '', numero)
    if CANAL_ALVO in (nome, numero, identificador) or num_digits.endswith(CANAL_ALVO):
        canal_id = c.get("id")
        print(f"   Canal encontrado: {c.get('name')} -> id={canal_id}")
        break

if not canal_id:
    # Exibe todos para ajudar na depuração
    print("AVISO: Canal nao encontrado pelo numero exato. Canais disponiveis:")
    for c in canais:
        print(f"   id={c.get('id')} | name={c.get('name')} | number={c.get('number')} | identifier={c.get('identifier')}")
    raise SystemExit("Revise o valor de CANAL_ALVO no script.")


# ── 2. Listar conversas de junho filtradas pelo canal ──────────────────────────
print("Listando conversas de junho...")
params_sessoes = {
    "ChannelsId": canal_id,
    "CreatedAt.After":  DATE_AFTER,
    "CreatedAt.Before": DATE_BEFORE,
    "OrderBy": "createdAt",
    "OrderDirection": "ASCENDING",
}
sessoes = get_all_pages(f"{BASE_URL}/chat/v2/session", params_sessoes)
print(f"   {len(sessoes)} conversa(s) encontrada(s).")


# ── 3. Cache de contatos ───────────────────────────────────────────────────────
_cache_contatos = {}

def get_contato(contact_id: str) -> dict:
    if not contact_id:
        return {}
    if contact_id in _cache_contatos:
        return _cache_contatos[contact_id]
    try:
        r = requests.get(
            f"{BASE_URL}/core/v1/contact/{contact_id}",
            headers=HEADERS, timeout=15
        )
        if r.status_code == 200:
            _cache_contatos[contact_id] = r.json()
            return _cache_contatos[contact_id]
    except Exception:
        pass
    return {}


# ── 4. Para cada conversa, buscar mensagens ────────────────────────────────────
rows_conversas  = []
rows_mensagens  = []

for s in sessoes:
    sid          = s.get("id", "")
    contact_id   = s.get("contactId", "")
    contato      = get_contato(contact_id)
    nome_cont    = contato.get("name", "") or contato.get("nameWhatsapp", "")
    telefone     = contato.get("phoneNumberFormatted", "") or contato.get("phoneNumber", "")
    status       = s.get("status", "")
    criado_em    = s.get("createdAt", "")
    encerrado_em = s.get("endAt", "") or s.get("closedAt", "")
    atendente    = (s.get("user") or {}).get("name", "")

    rows_conversas.append({
        "id_conversa":    sid,
        "contato_nome":   nome_cont,
        "contato_tel":    telefone,
        "status":         status,
        "atendente":      atendente,
        "criado_em":      criado_em,
        "encerrado_em":   encerrado_em,
    })

    print(f"   {sid[:8]}... | {telefone} | {nome_cont}")
    msgs = get_all_pages(
        f"{BASE_URL}/chat/v1/message",
        {
            "SessionId":         sid,
            "CreatedAt.After":   DATE_AFTER,
            "CreatedAt.Before":  DATE_BEFORE,
            "OrderBy":           "createdAt",
            "OrderDirection":    "ASCENDING",
        },
    )

    for m in msgs:
        direcao = m.get("direction", "")  # INBOUND / OUTBOUND
        tipo    = m.get("type", "")
        texto   = (
            (m.get("content") or {}).get("text", "")
            or m.get("text", "")
            or m.get("body", "")
        )
        rows_mensagens.append({
            "id_conversa":  sid,
            "contato_nome": nome_cont,
            "contato_tel":  telefone,
            "atendente":    atendente,
            "id_mensagem":  m.get("id", ""),
            "direcao":      direcao,
            "tipo":         tipo,
            "texto":        texto,
            "enviado_em":   m.get("createdAt", ""),
            "status_msg":   m.get("status", ""),
        })


# ── 4. Exportar para Excel ─────────────────────────────────────────────────────
nome_arquivo = "conversas_junho_2026.xlsx"
df_conv = pd.DataFrame(rows_conversas)
df_msgs = pd.DataFrame(rows_mensagens)

with pd.ExcelWriter(nome_arquivo, engine="openpyxl") as writer:
    df_conv.to_excel(writer, sheet_name="Conversas", index=False)
    df_msgs.to_excel(writer, sheet_name="Mensagens", index=False)

    # Auto-ajuste de largura das colunas
    for sheet_name, df in [("Conversas", df_conv), ("Mensagens", df_msgs)]:
        ws = writer.sheets[sheet_name]
        for col_idx, col in enumerate(df.columns, 1):
            vals = df[col].fillna("").astype(str).map(len)
            max_len = max(int(vals.max()), len(col)) + 2
            ws.column_dimensions[ws.cell(1, col_idx).column_letter].width = min(max_len, 60)

print(f"\nExportado: {nome_arquivo}")
print(f"   {len(df_conv)} conversa(s) | {len(df_msgs)} mensagem(ns)")
