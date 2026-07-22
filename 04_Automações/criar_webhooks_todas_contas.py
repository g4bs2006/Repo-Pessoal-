# -*- coding: utf-8 -*-
"""
Automacao: cria os webhooks padrao (Agendado + Leads) em todas as contas de clinicas.

Padrao extraido da conta DI DEA ODONTOLOGIA:
  1) "Agendado"  -> https://webhooks.contactia.com.br/webhook/mover-agendado  -> PANEL_CARD_NEW
  2) "Leads"     -> https://webhooks.contactia.com.br/webhook/lead-etiqueta   -> SESSION_NEW

Idempotente: lista os webhooks existentes de cada conta e pula os que ja existem
(match por nome).

Uso:
    python criar_webhooks_todas_contas.py                  # dry-run (so mostra o que faria)
    python criar_webhooks_todas_contas.py --executar        # cria de fato
    python criar_webhooks_todas_contas.py --executar --limite 3  # testa com 3 contas
"""
import sys
import time
import json
import urllib.request
import urllib.error
import os

# Forcar UTF-8 no console Windows
if os.name == "nt":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ─── API Helena (Webhooks) ───────────────────────────────────────────────────
BASE_URL = "https://api.helena.run/core/v1/webhook/subscription"

# Webhooks que devem existir em cada conta (padrao DI DEA)
WEBHOOKS_PADRAO = [
    {
        "name": "Agendado",
        "url": "https://webhooks.contactia.com.br/webhook/mover-agendado",
        "enabled": True,
        "events": ["PANEL_CARD_NEW"],
    },
    {
        "name": "Leads",
        "url": "https://webhooks.contactia.com.br/webhook/lead-etiqueta",
        "enabled": True,
        "events": ["SESSION_NEW"],
    },
]

# ─── Lista de contas (Nome + Token) ─────────────────────────────────────────
CONTAS = [
    {"Nome": "IBS Implantes - Ila Flávia", "Token": "pn_MXPBzyaDGlfg7hdDh4r8uBeA1KOF82RpACDJZ3EXaw"},
    {"Nome": "IBS Implantes - Ila Flávia (2)", "Token": "pn_0hpJHG13yT5L2QDLSvbyPjA1YS5Q8XvcKOKq3UXqbM"},
    {"Nome": "CONFIANCE ODONTO - WELLITON", "Token": "pn_qxU3Hzo3hKWmb8et04xbaVIY9Ch0uULcJnaKaPMB0"},
    {"Nome": "GM ESPACO CLINICO - ANDRE GOMIDE", "Token": "pn_7fx5Mc4oDGVXpUmCYZWnScpicGUi4A4S2zThYZWuj4"},
    {"Nome": "ATELIÊ OROFACIAL - DANIELA", "Token": "pn_OGfRBNnPC91RotacCQwIU9wTw73y9RTwEmWEPhi4odQ"},
    {"Nome": "INSTITUTO NERY - ITALO", "Token": "pn_L8wu2ou6WqIMI8AuN19Hfhg4MHKC5MimQDayZkcZDIU"},
    {"Nome": "ODONTO MORAES - REJANE", "Token": "pn_xniKuUjkBHJYwE17E2gcQ3mxITFnAIuovk7yescfruQ"},
    {"Nome": "ALFA ODONTOLOGIA - GABRIELA", "Token": "pn_goovo1oV8uovT2ZD9g7ROLdBINMf5laxqz59Cexwl7g"},
    {"Nome": "LUMINE ODONTOLOGIA - RODRIGO", "Token": "pn_RToVJydekX4mqfIiftyk4mSRA2r00r7GzKoB1rkqgI"},
    {"Nome": "UNNO ODONTOLOGIA - DÉBORA", "Token": "pn_MPMZlo1CXlEyZOf3RoSIwOQLA9qncVSdI7Cw8edHSIo"},
    {"Nome": "LEAO MIRANDA ODONTOLOGIA - JOÃO", "Token": "pn_DL1GrKIxRMRLUD7otgqp74CEKyJyowKCgjAf90Ok"},
    {"Nome": "Scopel Odontologia - GUILHERME SCOPEL", "Token": "pn_oUe1VLZFMMm8VI8Kdk6GrvQRTVfi24GepxS651jSjA"},
    {"Nome": "BRASDENTE CLINICA - DANI FREITAS", "Token": "pn_3KYakFuvz1XoRnxofkNcEbkvmE1AsTYE96vyiOyWqXQ"},
    {"Nome": "DI DEA ODONTOLOGIA ESPECIALIZADA - BARBARA", "Token": "pn_0dcuCQJPalWfkGzhl5gDamdzGn54sn2T3SNB8gZ2o"},
    {"Nome": "PIRES E AGUIAR ODONTOLOGIA - ANDRE AGUIAR", "Token": "pn_961uLqMohjeDQKJM7Zttc43LICrnYdujSYIWbx0PC7Q"},
    {"Nome": "HB ODONTOLOGIA - HILDON", "Token": "pn_TDzGVE4mia1W7Df2NBd5oelbiYpsJz2Aro8VkRtuS7k"},
    {"Nome": "LM ODONTOLOGIA - LEONARDO", "Token": "pn_icYNOAEE9N2U60gQSE4Gh4SSg2M7D4er33dhXel8V0"},
    {"Nome": "ORAL FOZ - CAMILA", "Token": "pn_885gj6cL1nnCbOEwfMqJF3Digp6mp8Js0IX22bHRk"},
    {"Nome": "contact.IA", "Token": "pn_Ok3QmLxWKurMTIR15XGDuuduwqipKTYi8L3AKcjXdXA"},
    {"Nome": "FP Prime", "Token": "pn_yYMfJJu1om9hriDkRSdtDLdhv1lNpyGxemaFDW7Rzro"},
    {"Nome": "TM Medicina e Odontologia LTDA", "Token": "pn_voInUxhdNZ8ZK2WhEogfBjfwZWmMgC5ZHMjyGvfIA4"},
    {"Nome": "Odontologia Fernando Freitas", "Token": "pn_sSEgIkbO01De5Hs0rQCC5eMKOqa8am4Kf2ldkY81g"},
    {"Nome": "Escalar Connection", "Token": "pn_kdzwun2wCd2BCD3VaxYMxXM3ffYSTG1wRuWLMjgMk"},
    {"Nome": "APICALCENTER", "Token": "pn_1D6aGHSNCYkm3EzuIDoE8i1r2X4t9sCcDK4kJLak4"},
    {"Nome": "Luiz Fernando Santos Figueredo", "Token": "pn_Mgjtk7nL9xCfSgh4ZloyBVBoHLKmvkNmCIUVvzmmTY"},
    {"Nome": "Bazacas Odontologia", "Token": "pn_8dvMIP5NYTLm4QgxOxG3Ac5lZXkYKrwVnyyjW2h8iU"},
    {"Nome": "Instituto Prime Odontocenter", "Token": "pn_JUZJ3G6QR33zABcm4dNXUO1ssjZSkxLSCpjTQCyxeM"},
    {"Nome": "Diamond Odontologia", "Token": "pn_HpJCp7ibzMjszPoxRQeCntHegN268wccJVxgBmyegU"},
    {"Nome": "Raquel Lucia de Araujo Souza", "Token": "pn_g6Xyk7t6aLMxGU2qkSEACMbj4u3rVhdhteidEsg"},
    {"Nome": "COLT Odontologia", "Token": "pn_p0sCgkfqKSxgHdd37N6mEF5nCzjN55bOi1SELePW9hg"},
    {"Nome": "ATUALLE", "Token": "pn_6HAbT49fVBHOg18UHnHxwnqkmLOLTfNnxyrOOIrjDW4"},
    {"Nome": "ARTE DO SORRISO", "Token": "pn_Xj105ciVV2Sb1CJDbwSiBpEG8hRfZ0mJL3J2cObw8"},
    {"Nome": "Volte a Sorrir - Bruno de Godoy", "Token": "pn_qwqu5NDQBI0SIultfaIdyILEdQeawUsPnopDfvbKU"},
    {"Nome": "Nucleodente", "Token": "pn_jauytBYtH7GvniSnh0flR0cSFGSBgkKQ4YCgos"},
    {"Nome": "Ortodoctor Santarém", "Token": "pn_Gg4A6Qqm29WkgpNZGuWWBzrUQH5o1rnlP9tdCUSnw0"},
    {"Nome": "Volte a Sorrir - Matheus Faria", "Token": "pn_c4SdSKCB3VY6pyEexmtU8qaoCuhcZvR9UWkb12WKmU"},
    {"Nome": "Isaac Luis", "Token": "pn_svU4nRpz9B81BkCVFAEHBhDf7cetyj6v3AoQkMb0p4"},
    {"Nome": "Instituto Frazão", "Token": "pn_v99JBL61AlJjaFw7rc7SOHvwuUQRMLS5mGsgCAh9I0"},
    {"Nome": "Elegance Sorriso - Guanabara", "Token": "pn_Ts0aaL0qQBhyUWt1rgY4zQlYx15Pl1A332Gh6I8s"},
    {"Nome": "Atos Odontologia", "Token": "pn_Vx1STw7e2FUOubZ3EVgRBSHqUgVQ5NhSPFGm4vPC4"},
    {"Nome": "SCS Odonto", "Token": "pn_bJ0u1m7j9wUGgXSQGKji2IRDaMxCel8191i1tt5dT0"},
    {"Nome": "Valença Centro de Saúde", "Token": "pn_Ifoq9vaDXxeQm3aLyK6qEVzLPcwhW8sNBxAch8koUM"},
    {"Nome": "Odontominas Rave", "Token": "pn_t327WgaoiWMNhb1HbrqoPI25a9vndAGdpcZL2EbDo"},
    {"Nome": "Yamar Odontologia", "Token": "pn_Y2osqXEVtjfsEIcw1GIb3DpypZWzMFzmvYhpAq2bVK4"},
    {"Nome": "Prime Dente", "Token": "pn_ABMMyEK2udQlZg0Qx034gLW2eneYTWdImLdLlFwys"},
    {"Nome": "FJ IMPLANTES", "Token": "pn_Qhwwui3nmlObIFa1E60QiEXoeuWACQWBjgV2MpLm5E"},
    {"Nome": "Master Odonto", "Token": "pn_tx2jZkQbAKMlOxKu1rfTYVSlw0pY3D2z2ebD23TLr4I"},
    {"Nome": "Arte Riso", "Token": "pn_F2vSVakVw9h66w1AlJJ3LTVljDW8p6zmHIkWm9oh9oo"},
    {"Nome": "Rapidodent", "Token": "pn_fkjvFZSgt4Qgo3QRseo2hhJpqt2MIOdQB2CwF7yHho"},
    {"Nome": "Conquista Sorrisos", "Token": "pn_YZiEwa3XA3EFOK9c7OjOk4qL7tCi5DXD06s0FRo4SDM"},
    {"Nome": "OBClinic Odontologia", "Token": "pn_M6YefCLryZ9D32RW5EdOAkFpBoHRBHPxcqyPYqtdV4"},
    {"Nome": "Dentista do Trabalhador", "Token": "pn_f2ilBny9lmUkv6LkUAESwLLxqa4j05CHowYC7os9w"},
    {"Nome": "Nuova Odontologia", "Token": "pn_l8qWsCKZWQ4jshPqgXENNkRB4OjHaXV8GbomcBDfLs"},
    {"Nome": "Odontocompany", "Token": "pn_85i9D6ioDpBnZ1MVADYeaPHQZ7YB6QpgoY9mnJRxoNg"},
    {"Nome": "Clínica Liss", "Token": "pn_ng7RguPYlPGrjTIVgVXFCbF6hlfWpWlNpaP8YNneM4"},
    {"Nome": "Entrega Sala Black", "Token": "pn_582tmQnIej6ZYJRqon9SUbjO5H7gLwP4ybmuv70WDs"},
    {"Nome": "Biosorriso Implantes", "Token": "pn_lveIqFdsp0MADkdhSN12VBIevVdWKPYvNdGR8wHYA"},
    {"Nome": "Elegance - Satelite Iris", "Token": "pn_caayE4Ud5Ja8lx0ORfPAHLPL0k3CDTQ3jSR7bBzco0"},
    {"Nome": "Clinica Vassoler Escanhoela", "Token": "pn_5Paig0lBkXAGt6y63xHF8O5IG2vnj9R5e3i8GPINRU"},
    {"Nome": "Dentista da Família", "Token": "pn_advP3wVMpha5TNcvWLz7FHsM2M2lnKVhEAmmuMsJq80"},
    {"Nome": "JR Furtado Odontologia", "Token": "pn_eeJIIZfDx6cK6skvPdKfGauAyIZtu9UR950fY3iNsyQ"},
    {"Nome": "Salutar Clínica Integrada", "Token": "pn_Jv0iuujFFgPKWsbzgw8rrlgjiBhFOpKpmWa5WdL7mg"},
    {"Nome": "Elegance Sorriso - Ouro Verde", "Token": "pn_rd62j3uciBVSe31VHIFTvokGFOKAeNpZW099ArCpzc"},
    {"Nome": "Elegance Sorriso - Campo Grande", "Token": "pn_b6xluRhgVoWPAiW7lHhOZRKxZiEJ4cTmWOmdZ2vb7k"},
    {"Nome": "Fernanda Vasconcellos", "Token": "pn_ARvLYTWDAVY2BdyHkOf1BHFWYD5FOsf4Rf1Ikx4xXDc"},
    {"Nome": "Oral Concept / Oral Conceito", "Token": "pn_dEsl2EIGMmd341FxP4Q6gvdQxGF1N59xXUIN4f5U"},
]


# ─── Helpers ─────────────────────────────────────────────────────────────────

def api(method, url, token, body=None):
    """Faz request com retry em erros 5xx."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    for tentativa in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                raw = r.read().decode("utf-8")
                return json.loads(raw) if raw.strip() else {}
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


def listar_webhooks(token):
    """Lista webhooks existentes de uma conta."""
    return api("GET", BASE_URL, token)


def criar_webhook(token, webhook_config):
    """Cria um webhook na conta."""
    return api("POST", BASE_URL, token, webhook_config)


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    executar = "--executar" in sys.argv
    limite = None
    if "--limite" in sys.argv:
        idx = sys.argv.index("--limite")
        limite = int(sys.argv[idx + 1])

    modo = "EXECUÇÃO" if executar else "DRY-RUN"
    print(f"{'='*70}")
    print(f"  Criação de Webhooks em massa — modo {modo}")
    print(f"  Contas: {len(CONTAS)} | Webhooks por conta: {len(WEBHOOKS_PADRAO)}")
    print(f"{'='*70}\n")

    total_criados = 0
    total_pulados = 0
    total_erros = 0
    contas_processadas = 0
    erros_detalhes = []

    for i, conta in enumerate(CONTAS, 1):
        if limite is not None and contas_processadas >= limite:
            print(f"\n  Limite de {limite} contas atingido, parando.")
            break

        nome = conta["Nome"]
        token = conta["Token"]
        print(f"[{i:02d}/{len(CONTAS)}] {nome}")

        # 1. Listar webhooks existentes
        try:
            existentes = listar_webhooks(token)
        except Exception as e:
            total_erros += 1
            erros_detalhes.append(f"  ERRO ao listar webhooks de '{nome}': {e}")
            print(f"  [ERRO] Erro ao listar webhooks: {e}")
            contas_processadas += 1
            continue

        nomes_existentes = {wh.get("name", "").strip().lower() for wh in existentes}

        # 2. Para cada webhook padrao, criar se nao existe
        for wh_config in WEBHOOKS_PADRAO:
            wh_name = wh_config["name"]
            if wh_name.strip().lower() in nomes_existentes:
                total_pulados += 1
                print(f"  [SKIP] '{wh_name}' ja existe")
                continue

            if executar:
                try:
                    resultado = criar_webhook(token, wh_config)
                    total_criados += 1
                    wh_id = resultado.get("id", "?")
                    print(f"  [OK] '{wh_name}' criado (id: {wh_id})")
                    time.sleep(0.2)  # respeitar rate limit
                except Exception as e:
                    total_erros += 1
                    erros_detalhes.append(f"  ERRO ao criar '{wh_name}' em '{nome}': {e}")
                    print(f"  [ERRO] Erro ao criar '{wh_name}': {e}")
            else:
                total_criados += 1
                print(f"  [DRY] '{wh_name}' SERIA criado")

        contas_processadas += 1

    # Resumo final
    acao = "CRIADOS" if executar else "SERIAM CRIADOS (dry-run)"
    print(f"\n{'='*70}")
    print(f"  RESUMO")
    print(f"  Contas processadas: {contas_processadas}")
    print(f"  Webhooks {acao}: {total_criados}")
    print(f"  Webhooks pulados (já existiam): {total_pulados}")
    print(f"  Erros: {total_erros}")
    print(f"{'='*70}")

    if erros_detalhes:
        print("\nDetalhes dos erros:")
        for err in erros_detalhes:
            print(err)


if __name__ == "__main__":
    main()
