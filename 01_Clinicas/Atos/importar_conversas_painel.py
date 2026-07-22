"""
Importa conversas da Helena (maio/2026 em diante) para o painel CRM da Atos.

Lógica:
- Lê sessões paginadas via GET /chat/v2/session
- Determina ORIGEM (Facebook/Instagram/Orgânico) pelo UTM da sessão
- Determina STEP do painel pelo conjunto de tags da sessão (IA, CRC, Agendou IA, etc.)
- Cria card no painel se ainda não existir card para esse contato
"""

import requests
import time

# ─── Config ────────────────────────────────────────────────────────────────────

TOKEN    = "pn_7PEG91xSt3kCPnqplUOu52ww9nDjNAlr5lbuUkYdI"
PANEL_ID = "3b98f0bf-fea4-47b7-a922-2f3981220722"
BASE_URL = "https://api.wts.chat"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type":  "application/json",
}

# ─── Mapeamento de STEPS (tag da sessão → step do painel) ──────────────────────
# Ajuste os IDs conforme as etapas reais do seu painel.

STEP_MAP = {
    # tag name (lowercase)  : step ID
    "agendou ia":  "4de9ae00-a01d-4405-826e-62fd741699c8",  # Agendados
    "ia":          "8cde1f9f-1c5a-4989-99c2-773c86d364e0",  # Leads IA
    "crc":         "PREENCHA_O_STEP_ID_DO_CRC",              # << ajustar
}
DEFAULT_STEP = "8cde1f9f-1c5a-4989-99c2-773c86d364e0"  # Leads (fallback)

# ─── Mapeamento de TAGS DO CARD (CRM) ──────────────────────────────────────────
# Tags de origem (pelo UTM) e de tipo de atendimento

CARD_TAG_ORIGEM = {
    "FACEBOOK":  "fb7781a8-9e21-4241-a7d7-ee8e82ffbf6c",
    "INSTAGRAM": "9dd2d9ca-41d5-4f67-b445-2dc73efe6b2b",
}
CARD_TAG_ORGANICO = "5c74d4d0-8222-4f2f-999b-f60a96bed915"
CARD_TAG_IA       = "2af51bf5-da5d-490d-be7c-d5da346d327a"
CARD_TAG_CRC      = "PREENCHA_O_TAG_ID_DO_CRC"  # << ajustar

# Data de corte (UTC)
CREATED_AFTER = "2026-05-01T00:00:00Z"

# ─── Helpers ───────────────────────────────────────────────────────────────────

def get_sessions(page: int, page_size: int = 100) -> dict:
    r = requests.get(
        f"{BASE_URL}/chat/v2/session",
        headers=HEADERS,
        params={
            "CreatedAt.After": CREATED_AFTER,
            "PageNumber":      page,
            "PageSize":        page_size,
            "OrderBy":         "CreatedAt",
            "OrderDirection":  "ASCENDING",
        },
    )
    r.raise_for_status()
    return r.json()


def get_contact(contact_id: str) -> dict:
    """Busca nome e etiquetas do contato via Core API."""
    r = requests.get(f"{BASE_URL}/core/v1/contact/{contact_id}", headers=HEADERS)
    if r.status_code == 404:
        return {"name": "Sem nome", "tags": []}
    r.raise_for_status()
    data = r.json()
    return {"name": data.get("name") or "Sem nome", "tags": data.get("tags") or []}


def load_existing_contact_ids() -> set:
    """
    Carrega todos os cards existentes no painel e retorna um set com os contactIds.
    Feito uma única vez no início para evitar N chamadas por sessão.
    """
    existing = set()
    page = 1
    while True:
        r = requests.get(
            f"{BASE_URL}/crm/v1/panel/card",
            headers=HEADERS,
            params={"PanelId": PANEL_ID, "PageNumber": page, "PageSize": 100},
        )
        r.raise_for_status()
        data  = r.json()
        items = data.get("items") or data.get("data") or []
        for card in items:
            for c in card.get("contacts") or card.get("contactIds") or []:
                # pode vir como string (ID) ou como objeto {id: ...}
                cid = c if isinstance(c, str) else c.get("id")
                if cid:
                    existing.add(cid)
        page_count = data.get("pageCount") or data.get("totalPages")
        if page_count and page >= page_count:
            break
        if len(items) < 100:
            break
        page += 1
    return existing


def create_card(contact_id: str, name: str, step_id: str, card_tags: list[str], descricao: str) -> dict:
    body = {
        "panelId":    PANEL_ID,
        "stepId":     step_id,
        "title":      name,
        "description": descricao,
        "contactIds": [contact_id],
        "tagIds":     card_tags,
    }
    r = requests.post(f"{BASE_URL}/crm/v1/panel/card", headers=HEADERS, json=body)
    r.raise_for_status()
    return r.json()


def resolve_step(session_tags: list[dict]) -> str:
    """Retorna o step ID baseado nas tags da sessão (prioridade: agendou ia > crc > ia)."""
    tag_names = {t.get("name", "").lower() for t in (session_tags or [])}
    for key in ["agendou ia", "crc", "ia"]:
        if key in tag_names:
            return STEP_MAP.get(key, DEFAULT_STEP)
    return DEFAULT_STEP


def resolve_card_tags(session: dict, session_tags: list[dict]) -> list[str]:
    """Monta lista de tagIds para o card com base na origem e no tipo de atendimento."""
    tags = []

    # Origem: lê UTM da sessão
    utm = (session.get("utm") or session.get("session", {}).get("utm") or {})
    utm_source = (utm.get("source") or "").upper()
    platform   = (session.get("channel", {}).get("platform") or "").upper()
    origem = utm_source or platform

    if "FACEBOOK" in origem:
        tags.append(CARD_TAG_ORIGEM["FACEBOOK"])
    elif "INSTAGRAM" in origem:
        tags.append(CARD_TAG_ORIGEM["INSTAGRAM"])
    else:
        tags.append(CARD_TAG_ORGANICO)

    # Tipo de atendimento
    tag_names = {t.get("name", "").lower() for t in (session_tags or [])}
    if any(k in tag_names for k in ["ia", "agendou ia"]):
        tags.append(CARD_TAG_IA)
    if "crc" in tag_names:
        tags.append(CARD_TAG_CRC)

    return list(set(tags))


def build_descricao(session: dict) -> str:
    created_at = session.get("createdAt", "")
    utm = session.get("utm") or {}
    headline = utm.get("headline", "")

    lines = []
    if created_at:
        lines.append(f"Início da conversa: {created_at[:10]} {created_at[11:16]}")
    if headline:
        short = headline[:120] + "..." if len(headline) > 120 else headline
        lines.append(f"Campanha: {short}")
    return "\n".join(lines)


# ─── Main ──────────────────────────────────────────────────────────────────────

def main():
    page       = 1
    total_proc = 0
    criados    = 0
    pulados    = 0
    erros      = 0

    print(f"Carregando cards existentes no painel...")
    existing_contacts = load_existing_contact_ids()
    print(f"  {len(existing_contacts)} contatos ja tem card.")
    print(f"Buscando sessoes a partir de {CREATED_AFTER}...\n")

    while True:
        data     = get_sessions(page)
        items    = data.get("items") or data.get("data") or []
        total_db = data.get("totalCount") or data.get("total") or "?"

        if not items:
            break

        print(f"Página {page} — {len(items)} sessões (total no banco: {total_db})")

        for session in items:
            # A API retorna contactId como campo direto (não objeto aninhado)
            contact_id = session.get("contactId")

            if not contact_id:
                print(f"  [SKIP] sessao sem contactId: {session.get('id')}")
                pulados += 1
                continue

            try:
                if contact_id in existing_contacts:
                    pulados += 1
                    continue

                # Busca nome e etiquetas do contato
                contact      = get_contact(contact_id)
                name         = contact["name"]
                session_tags = contact["tags"]

                step_id   = resolve_step(session_tags)
                card_tags = resolve_card_tags(session, session_tags)
                descricao = build_descricao(session)

                create_card(contact_id, name, step_id, card_tags, descricao)
                existing_contacts.add(contact_id)
                print(f"  [CRIADO] {name} -> step={step_id[:8]}... | tags={len(card_tags)}")
                criados += 1

            except requests.HTTPError as e:
                print(f"  [ERRO]   {name} ({contact_id}): {e.response.status_code} {e.response.text[:120]}")
                erros += 1

            total_proc += 1
            time.sleep(0.15)  # ~400 req/min, bem dentro do rate limit

        # Verifica se há próxima página
        page_count = data.get("pageCount") or data.get("totalPages")
        if page_count and page >= page_count:
            break
        if len(items) < 100:
            break

        page += 1

    print(f"\n─── Concluído ───")
    print(f"Processados : {total_proc}")
    print(f"Criados     : {criados}")
    print(f"Pulados     : {pulados}")
    print(f"Erros       : {erros}")


if __name__ == "__main__":
    main()
