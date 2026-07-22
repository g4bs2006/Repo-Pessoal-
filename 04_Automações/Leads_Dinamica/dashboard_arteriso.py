#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dashboard de terminal — Arte Riso (Helena / WTS.chat)
Reaproveita a lógica de funil E0-E5 do 04_Automações/relatorio_canal_ia.py,
aplica nas 954 conversas já cacheadas (arteriso_raw.json) e cruza com as
contagens REAIS de etiqueta de contato + painel CRM "Agendou - IA".

Saída 100% no terminal, colorida (ANSI), com barras. Nada de abrir Excel.

Uso:
  python dashboard_arteriso.py                 # usa cache + contagens salvas
  python dashboard_arteriso.py --live          # rebusca etiquetas/painel na API
"""
import sys, os, json, re
from pathlib import Path
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if os.name == "nt":
    os.system("")  # habilita sequências ANSI no terminal do Windows

AQUI = Path(__file__).parent
CACHE = AQUI / "arteriso_raw.json"
FUNIL = AQUI / "funil_data.json"

TOKEN      = "pn_UketWXVP7W886xlDNicGbxccRnENtua28OAKTYcn3Tk"
COMPANY_ID = "4fb5c394-c53c-485f-a5b6-2eed5b390f5e"
PANEL_AGENDOU = "52511dbd-88e3-4a02-aa1c-241d48c6bfdf"
TAGS = {  # etiquetas "Usado pela IA"
    "Compromisso de Honra":"60dcb409-8384-4fa2-b93f-7f24b9a33bf4",
    "Plano":"6d6f2ccc-447e-4ae2-b413-15f9496c07d0",
    "Particular":"70943949-a2c5-4c48-92a1-b7dcce6bbb4a",
    "Urgência alta":"3eeacc17-90bd-4aa5-9849-8b92cc1685c8",
    "Urgência baixa":"8f2b1f7f-dd78-4f45-b351-4f5e4da3b581",
}

# ── ANSI ──────────────────────────────────────────────────────────────────────
def c(code): return f"\033[{code}m"
RESET=c(0); BOLD=c(1); DIM=c(2)
FG={"verde":c(92),"verm":c(91),"amar":c(93),"azul":c(94),"ciano":c(96),"magenta":c(95),"cinza":c(90),"branco":c(97)}
BG={"verde":c(42),"verm":c(41),"amar":c(43),"azul":c(44),"ciano":c(46),"magenta":c(45)}

LARG = 46  # largura máxima das barras

def barra(valor, total, cor, larg=LARG):
    if total <= 0: total = 1
    n = int(round(larg * valor / total))
    return FG[cor] + "█"*n + FG["cinza"] + "░"*(larg-n) + RESET

def titulo(txt):
    print(f"\n{BOLD}{FG['ciano']}{'━'*64}{RESET}")
    print(f"{BOLD}{FG['ciano']}  {txt}{RESET}")
    print(f"{BOLD}{FG['ciano']}{'━'*64}{RESET}")

def linha_barra(label, valor, total, cor, sufixo=""):
    pct = (100*valor/total) if total else 0
    print(f"  {label:30}{barra(valor,total,cor)} {BOLD}{valor:>4}{RESET} {DIM}{pct:4.1f}%{RESET} {sufixo}")

# ── Classificação de remetente (igual relatorio_canal_ia.py, adaptado) ─────────
NULL_UUID="00000000-0000-0000-0000-000000000000"
def ator(m):
    if m.get("type")=="TRACK": return "SISTEMA"
    if m.get("direction")=="FROM_HUB": return "PACIENTE"
    uid=m.get("userId") or ""
    if (uid and uid!=NULL_UUID) or (m.get("origin")=="DEFAULT" and m.get("senderId")):
        return "HUMANO"
    if m.get("origin") in ("BOT","DEFAULT"): return "IA"
    return "SISTEMA"

def _txt(m):
    t=m.get("text")
    if isinstance(t,dict): t=t.get("text") or ""
    if not t:
        det=m.get("details") or {}
        tr=det.get("transcription") if isinstance(det,dict) else None
        t=(tr.get("text") if isinstance(tr,dict) else tr) or ""
    return str(t or "")

# ── Funil E0-E5 (KW reaproveitado do relatorio_canal_ia.py) ────────────────────
KW = {
 "nome":["como posso te chamar","como você se chama","qual o seu nome","seu nome","me chamo","meu nome é","pode me chamar"],
 "interesse":["qual o seu interesse","o que você busca","o que te trouxe","qual procedimento","qual tratamento","sua necessidade","o que deseja"],
 "agenda":["agendar","marcar","escolha um horário","escolha uma data","que horário","que data","disponibilidade","horário disponível","melhor dia","melhor horário"],
 "confirmou":["agendado","confirmado","marcado para","sua consulta","sua avaliação","te esperamos","ficou marcado","ficou agendado","combinado","te espero"],
 "preco":["valor","quanto custa","preço","tabela","parcela","plano","custo"],
 "objecao":["vou pensar","agora não","por enquanto","não tenho","tá caro","muito caro","sem condição","mais tarde","depois"],
}
def norm(t): return str(t).lower() if t else ""
def estagio(n_ia, texto_total):
    t=norm(texto_total)
    if any(k in t for k in KW["confirmou"]): return "E5 - Agendou"
    if any(k in t for k in KW["agenda"]):    return "E4 - Tentou Agendar"
    if any(k in t for k in KW["preco"]):     return "E3 - Apresentou Valor"
    if any(k in t for k in KW["interesse"]): return "E2 - Mapeou Interesse"
    if any(k in t for k in KW["nome"]):      return "E1 - Coletou Nome"
    return "E0 - IA Respondeu" if n_ia>0 else "E0 - Sem Resposta IA"

def motivo_perda(est, n_pac, texto_pac):
    t=norm(texto_pac)
    if est=="E5 - Agendou": return None
    if n_pac==0: return "Lead não respondeu após 1º contato da IA"
    if any(k in t for k in KW["objecao"]): return "Lead demonstrou objeção (preço/tempo)"
    if est.startswith("E0"): return "Travou no início — IA não coletou nome"
    if est=="E1 - Coletou Nome": return "Sumiu após dar o nome"
    if est=="E2 - Mapeou Interesse": return "Sumiu antes da proposta de agenda"
    if est=="E3 - Apresentou Valor": return "Não aceitou agendar após ver valor"
    if est=="E4 - Tentou Agendar": return "IA tentou agendar mas não confirmou horário"
    return "Encerrada sem agendamento"

# ── Contagens reais de etiqueta/painel ─────────────────────────────────────────
def contagens_live():
    import requests
    H={"Authorization":f"Bearer {TOKEN}"}; B="https://api.wts.chat"
    tot=lambda d: next((d[k] for k in ("totalItems","totalCount","total") if isinstance(d,dict) and k in d),0)
    out={"total_contatos":tot(requests.get(f"{B}/core/v1/contact",headers=H,params={"PageSize":1},timeout=25).json()),"tags":{}}
    for nome,tid in TAGS.items():
        out["tags"][nome]=tot(requests.post(f"{B}/core/v1/contact/filter",headers=H,json={"tagIds":[tid],"pageSize":1},timeout=25).json())
    d=requests.get(f"{B}/crm/v1/panel/card",headers=H,params={"PanelId":PANEL_AGENDOU,"StepId":"6a4764d0-159a-48c1-a703-44700e529d09","PageSize":1},timeout=25).json()
    out["agendou_painel"]=tot(d)
    f=requests.get(f"{B}/crm/v1/panel/card",headers=H,params={"PanelId":PANEL_AGENDOU,"StepId":"2b54846b-ecea-41f2-943b-8e54aa811b31","PageSize":1},timeout=25).json()
    out["fechou_painel"]=tot(f)
    return out

def contagens_cache():
    # usa funil_data.json salvo antes + defaults conhecidos
    d=json.loads(FUNIL.read_text(encoding="utf-8")) if FUNIL.exists() else {}
    tags=d.get("tags",{})
    return {
        "total_contatos": d.get("total_contatos",766),
        "tags": {
            "Compromisso de Honra": tags.get("Compromisso de Honra",90),
            "Plano": tags.get("Plano",99),
            "Particular": tags.get("Particular",45),
            "Urgência alta": tags.get("Urgência alta",12),
            "Urgência baixa": tags.get("Urgência baixa",59),
        },
        "agendou_painel": (d.get("painel") or {}).get("Agendou",61),
        "fechou_painel": (d.get("painel") or {}).get("Compareceu e Fechou",1),
    }

# ── MAIN ───────────────────────────────────────────────────────────────────────
def main():
    live = "--live" in sys.argv
    if not CACHE.exists():
        print(f"{FG['verm']}Cache {CACHE.name} não encontrado. Rode relatorio_arteriso.py --refresh antes.{RESET}")
        return
    raw=json.loads(CACHE.read_text(encoding="utf-8"))
    sess=raw["sessions"]

    funil=Counter(); motivos=Counter(); origem=Counter()
    n_humano=n_sem_resp=n_agendou_txt=0
    tot_msgs_ia=tot_msgs_pac=0

    for s in sess:
        msgs=s.get("_messages",[])
        atores=[ator(m) for m in msgs]
        n_ia=atores.count("IA"); n_pac=atores.count("PACIENTE")
        tot_msgs_ia+=n_ia; tot_msgs_pac+=n_pac
        if "HUMANO" in atores: n_humano+=1
        if n_pac==0: n_sem_resp+=1
        texto_total=" ".join(_txt(m) for m in msgs)
        texto_pac=" ".join(_txt(m) for m,a in zip(msgs,atores) if a=="PACIENTE")
        est=estagio(n_ia,texto_total)
        funil[est]+=1
        if est=="E5 - Agendou": n_agendou_txt+=1
        mp=motivo_perda(est,n_pac,texto_pac)
        if mp: motivos[mp]+=1
        utm=s.get("utm") or {}
        origem[(utm.get("source") or s.get("origin") or "—").upper()]+=1

    total=len(sess)
    cont = contagens_live() if live else contagens_cache()

    # ── RENDER ──
    print(f"\n{BOLD}{BG['magenta']}{FG['branco']}  🦷  DASHBOARD ARTE RISO — COMPORTAMENTO DA IA  {RESET}")
    print(f"{DIM}  conta {COMPANY_ID} · {total} conversas · fonte: {'API ao vivo' if live else 'cache'}{RESET}")

    # KPIs topo
    tx_eng=100*(total-n_sem_resp)/total if total else 0
    titulo("VISÃO GERAL")
    print(f"  {FG['azul']}{BOLD}{total}{RESET} conversas   "
          f"{FG['verde']}{BOLD}{total-n_sem_resp}{RESET} engajaram ({tx_eng:.0f}%)   "
          f"{FG['verm']}{BOLD}{n_sem_resp}{RESET} sem resposta   "
          f"{FG['amar']}{BOLD}{n_humano}{RESET} c/ humano")
    print(f"  {DIM}mensagens: {tot_msgs_ia} da IA · {tot_msgs_pac} de pacientes{RESET}")

    # Funil conversacional E0-E5
    titulo("FUNIL CONVERSACIONAL (estágio que a IA alcançou)")
    ordem=["E5 - Agendou","E4 - Tentou Agendar","E3 - Apresentou Valor","E2 - Mapeou Interesse","E1 - Coletou Nome","E0 - IA Respondeu","E0 - Sem Resposta IA"]
    cor_e={"E5":"verde","E4":"ciano","E3":"azul","E2":"amar","E1":"magenta","E0":"verm"}
    for e in ordem:
        if funil.get(e):
            cor=cor_e[e.split(" ")[0]]
            linha_barra(e, funil[e], total, cor)

    # Funil de agendamento (etiqueta + painel CRM)
    titulo("FUNIL DE AGENDAMENTO (etiquetas + painel CRM)")
    tg=cont["tags"]; tc=cont["total_contatos"]
    pgto=(tg.get("Plano",0)+tg.get("Particular",0))
    etapas=[("Contatos totais",tc,"azul"),
            ("Pagamento qualificado",pgto,"magenta"),
            ("Compromisso de Honra",tg.get("Compromisso de Honra",0),"amar"),
            ("Agendou (painel CRM)",cont["agendou_painel"],"verde"),
            ("Compareceu e Fechou",cont["fechou_painel"],"verm")]
    base=etapas[0][1]
    prev=None
    for nome,val,cor in etapas:
        conv=f"{DIM}↓{100*val/prev:.0f}% etapa ant.{RESET}" if prev else ""
        linha_barra(nome,val,base,cor,conv)
        prev=val
    txa=100*cont["agendou_painel"]/tc if tc else 0
    print(f"\n  {BOLD}{FG['verde']}Taxa de agendamento: {txa:.1f}%{RESET} {DIM}({cont['agendou_painel']}/{tc} contatos){RESET}")

    # Motivos de perda
    titulo("TOP MOTIVOS DE PERDA")
    mx=max(motivos.values()) if motivos else 1
    for mot,q in motivos.most_common(6):
        linha_barra("• "+mot[:28], q, mx, "verm")

    # Origem
    titulo("ORIGEM DOS LEADS")
    mxo=max(origem.values()) if origem else 1
    cores_o=["ciano","magenta","amar","azul","verde"]
    for i,(o,q) in enumerate(origem.most_common(5)):
        linha_barra(o, q, mxo, cores_o[i%len(cores_o)])

    print(f"\n{DIM}  dica: rode com --live para rebuscar etiquetas/painel na API em tempo real{RESET}\n")

if __name__=="__main__":
    main()
