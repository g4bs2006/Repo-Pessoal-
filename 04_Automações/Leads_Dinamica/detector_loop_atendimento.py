#!/usr/bin/env python3
"""
Detector de Loop de Atendimento — Helena API
Varre sessões ativas, detecta mensagens repetidas (loop de chatbot)
e transfere o atendimento para uma equipe humana.

Uso:
  1. Execute uma vez sem DEPARTMENT_ID para ver as equipes disponíveis.
  2. Preencha DEPARTMENT_ID com o ID da equipe de destino.
  3. Execute normalmente — o script roda em loop contínuo.

Persistência:
  Sessões já transferidas ficam registradas em 'transferidos.db' (SQLite).
  O script nunca transfere a mesma sessão duas vezes.
"""

import sqlite3
import time
import logging
from collections import Counter
from difflib import SequenceMatcher
from pathlib import Path

import requests

# ── CONFIGURAÇÃO ──────────────────────────────────────────────────────────────
TOKEN          = "pn_gGIh0bpd6Al6jubejrT98ToHW7aavEn4RoY8Gg"
DEPARTMENT_ID  = "e7378e38-5fc8-4dcc-b07e-5f0351cfa6ce"   # ← ID da equipe de destino (rode sem preencher para listar)

BASE_URL       = "https://api.wts.chat"
HEADERS        = {"Authorization": f"Bearer {TOKEN}"}

# Banco de sessões já transferidas (SQLite — mesmo diretório do script)
DB_PATH        = Path(__file__).parent / "transferidos.db"

# Parâmetros de detecção
MSGS_ANALISAR    = 20    # últimas N mensagens analisadas por sessão
REPETICOES_MIN   = 3     # quantas repetições caracterizam loop
SIMILARIDADE_MIN = 0.85  # 0.0–1.0; mensagens >= 85% iguais são tratadas como a mesma

# Execução
INTERVALO_RUN  = 300   # segundos entre varreduras (padrão: 5 min)
DELAY_REQ      = 0.4   # delay entre requisições para evitar rate limit (429)

# ── LOGGING ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)


# ── BANCO DE DADOS ────────────────────────────────────────────────────────────
def db_init():
    with sqlite3.connect(DB_PATH) as con:
        con.execute("""
            CREATE TABLE IF NOT EXISTS transferidos (
                session_id     TEXT PRIMARY KEY,
                contato        TEXT,
                motivo         TEXT,
                transferido_em TEXT DEFAULT (datetime('now', 'localtime'))
            )
        """)


def ja_transferido(session_id):
    with sqlite3.connect(DB_PATH) as con:
        row = con.execute(
            "SELECT 1 FROM transferidos WHERE session_id = ?", (session_id,)
        ).fetchone()
    return row is not None


def registrar(session_id, contato, motivo):
    with sqlite3.connect(DB_PATH) as con:
        con.execute(
            "INSERT OR IGNORE INTO transferidos (session_id, contato, motivo) VALUES (?, ?, ?)",
            (session_id, contato, motivo),
        )


# ── CLIENTE HTTP ──────────────────────────────────────────────────────────────
def _get(path, params=None):
    r = requests.get(f"{BASE_URL}{path}", headers=HEADERS, params=params, timeout=15)
    r.raise_for_status()
    return r.json()


def _put(path, body):
    r = requests.put(f"{BASE_URL}{path}", headers=HEADERS, json=body, timeout=15)
    r.raise_for_status()
    return r.json()


def _items(data, *keys):
    """Extrai lista de resposta paginada — tenta várias chaves comuns."""
    if isinstance(data, list):
        return data
    for k in keys:
        if k in data:
            return data[k]
    return []


# ── ENDPOINTS ─────────────────────────────────────────────────────────────────
def listar_equipes():
    data = _get("/core/v2/department")
    return _items(data, "items", "departments", "data")


def listar_sessoes_ativas(page=1):
    return _get("/chat/v2/session", params={
        "Status": ["IN_PROGRESS", "PENDING", "STARTED"],
        "PageSize": 100,
        "PageNumber": page,
        "OrderBy": "LastInteractionAt",
        "OrderDirection": "DESCENDING",
    })


def listar_mensagens(session_id):
    data = _get(f"/chat/v1/session/{session_id}/message", params={
        "PageSize": MSGS_ANALISAR,
        "PageNumber": 1,
        "OrderBy": "CreatedAt",
        "OrderDirection": "DESCENDING",
    })
    return _items(data, "items", "messages", "data")


def transferir_para_equipe(session_id, department_id):
    return _put(f"/chat/v1/session/{session_id}/transfer", {
        "type": "DEPARTMENT",
        "newDepartmentId": department_id,
        "options": {},
    })


# ── DETECÇÃO DE LOOP ──────────────────────────────────────────────────────────
def _normalizar(texto):
    return (texto or "").strip().lower()


def _similar(a, b):
    return SequenceMatcher(None, a, b).ratio()


def detectar_loop(mensagens):
    """
    Retorna (True, motivo) se detectar loop, (False, None) caso contrário.

    Critério 1 — Repetição exata:
      O mesmo texto aparece >= REPETICOES_MIN vezes entre as últimas mensagens.

    Critério 2 — Cluster de similaridade:
      Um grupo de mensagens com similaridade >= SIMILARIDADE_MIN entre si
      atinge >= REPETICOES_MIN membros.
    """
    textos = [
        _normalizar(m.get("text") or "")
        for m in mensagens
        if m.get("text")
    ]
    textos = [t for t in textos if len(t) > 8]  # ignora respostas triviais

    if not textos:
        return False, None

    # Critério 1: repetição exata
    contagem = Counter(textos)
    mais_comum, qtd = contagem.most_common(1)[0]
    if qtd >= REPETICOES_MIN:
        return True, f"texto repetido {qtd}x: \"{mais_comum[:100]}\""

    # Critério 2: cluster de similaridade
    visitados = set()
    for i, t1 in enumerate(textos):
        if i in visitados:
            continue
        cluster = [i]
        for j, t2 in enumerate(textos):
            if j != i and j not in visitados and _similar(t1, t2) >= SIMILARIDADE_MIN:
                cluster.append(j)
                visitados.add(j)
        if len(cluster) >= REPETICOES_MIN:
            return True, (
                f"{len(cluster)} mensagens similares (>={SIMILARIDADE_MIN:.0%}): "
                f"\"{textos[cluster[0]][:100]}\""
            )

    return False, None


# ── VARREDURA ─────────────────────────────────────────────────────────────────
def varrer():
    log.info("────────────── Iniciando varredura ──────────────────────────")
    transferidos = 0
    page = 1

    while True:
        try:
            resp = listar_sessoes_ativas(page)
        except requests.HTTPError as e:
            log.error(f"Erro ao listar sessões: {e}")
            break

        sessoes = _items(resp, "items", "sessions", "data")
        if not sessoes:
            break

        for sessao in sessoes:
            sid = sessao.get("id")
            nome = (
                sessao.get("contactName")
                or (sessao.get("contact") or {}).get("name")
                or sid
            )
            time.sleep(DELAY_REQ)

            try:
                msgs = listar_mensagens(sid)
                loop, motivo = detectar_loop(msgs)

                if loop:
                    # 1. Checa banco local (lookup rápido, evita chamada à API)
                    if ja_transferido(sid):
                        log.debug(f"SKIP (DB)  | sessão={sid} | já registrado localmente")

                    # 2. Checa API: sessão já está na equipe destino?
                    elif sessao.get("departmentId") == DEPARTMENT_ID:
                        log.info(f"SKIP (API) | sessão={sid} | contato={nome} | já na equipe destino → sincronizando DB")
                        registrar(sid, nome, "ja_na_equipe_destino")

                    # 3. Ainda não foi transferida — transfere e registra
                    else:
                        log.warning(f"LOOP | sessão={sid} | contato={nome} | {motivo}")
                        if DEPARTMENT_ID:
                            transferir_para_equipe(sid, DEPARTMENT_ID)
                            registrar(sid, nome, motivo)
                            log.info(f"  → Transferido e registrado")
                            transferidos += 1
                        else:
                            log.info("  → Transferencia pulada: DEPARTMENT_ID nao configurado")
                else:
                    log.debug(f"OK   | sessão={sid} | contato={nome}")

            except requests.HTTPError as e:
                log.error(f"Erro na sessão {sid}: {e}")
            except Exception as e:
                log.error(f"Erro inesperado na sessão {sid}: {e}")

        # Paginação
        total = resp.get("totalCount", 0) if isinstance(resp, dict) else 0
        if page * 100 >= total:
            break
        page += 1

    log.info(f"────────────── Varredura concluída | {transferidos} transferência(s) ──")
    return transferidos


# ── ENTRY POINT ───────────────────────────────────────────────────────────────
def main():
    log.info("=== Detector de Loop de Atendimento — Helena ===")

    if not DEPARTMENT_ID:
        log.warning("DEPARTMENT_ID não preenchido. Listando equipes disponíveis:\n")
        try:
            equipes = listar_equipes()
            if equipes:
                for eq in equipes:
                    print(f"  ID: {eq.get('id')}  |  Nome: {eq.get('name')}")
            else:
                print("  Nenhuma equipe encontrada.")
        except Exception as e:
            log.error(f"Erro ao listar equipes: {e}")
        print("\nPreencha DEPARTMENT_ID no topo do script e execute novamente.")
        return

    db_init()
    log.info(f"Banco de sessoes: {DB_PATH}")
    log.info(f"Equipe de destino: {DEPARTMENT_ID}")
    log.info(f"Critérios: {REPETICOES_MIN}+ repetições | similaridade >= {SIMILARIDADE_MIN:.0%}")
    log.info(f"Intervalo entre varreduras: {INTERVALO_RUN}s\n")

    while True:
        try:
            varrer()
        except Exception as e:
            log.error(f"Erro crítico na varredura: {e}")
        log.info(f"Aguardando {INTERVALO_RUN}s...\n")
        time.sleep(INTERVALO_RUN)


if __name__ == "__main__":
    main()
