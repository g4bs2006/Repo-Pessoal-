# -*- coding: utf-8 -*-
"""
Automação: Busca atendimentos (sessões) no período informado, obtém os contatos
correspondentes e analisa quais possuem o DDD 31 e quais não possuem.
Calcula porcentagens e gera um relatório detalhado no console e em arquivo CSV.

Uso:
    python analise_ddd_contatos.py
    python analise_ddd_contatos.py --inicio 2026-06-01 --fim 2026-06-16
"""
import sys
import time
import json
import csv
import urllib.request
import urllib.parse
import datetime

# Forçar saída do console para UTF-8 para evitar erros de codificação no Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Configurações de Integração
TOKEN = "pn_Rlk0rq9gv5DiNrKEftHJTat7aoNzH32nlMwFq54Y"
ACCOUNT_ID = "60b02aa6-7267-4fde-ba1d-4c5cdf8eb364"
BASE_SESSION = "https://api.wts.chat/chat/v2/session"
BASE_CONTACT = "https://api.wts.chat/core/v1/contact"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/json",
    "Content-Type": "application/json",
}

# Cache global para contatos para evitar requisições repetidas
_cache_contato = {}


def api_request(method, url, body=None):
    """Realiza uma requisição HTTP para a API Helena com retry automático."""
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
            raise RuntimeError(f"Erro HTTP {e.code}: {corpo}")
        except urllib.error.URLError as e:
            if tentativa < 2:
                time.sleep(2 * (tentativa + 1))
                continue
            raise RuntimeError(f"Erro de Conexão: {e.reason}")


def buscar_sessao_paginado(inicio_iso, fim_iso):
    """Busca todas as sessões no período de datas especificado, tratando a paginação."""
    sessoes = []
    pagina = 1
    page_size = 100
    
    print(f"Buscando sessões no período de {inicio_iso} até {fim_iso}...")
    
    while True:
        params = {
            "CreatedAt.After": inicio_iso,
            "CreatedAt.Before": fim_iso,
            "PageSize": page_size,
            "PageNumber": pagina,
            "OrderBy": "createdAt",
            "OrderDirection": "ASCENDING"
        }
        url = f"{BASE_SESSION}?{urllib.parse.urlencode(params)}"
        
        try:
            dados = api_request("GET", url)
            items = dados.get("items") or []
            sessoes.extend(items)
            
            print(f"  Página {pagina}: {len(items)} sessões obtidas (Total acumulado: {len(sessoes)})")
            
            if not dados.get("hasMorePages") or not items:
                break
            
            pagina += 1
            time.sleep(0.15)  # Respeitar rate limit
        except Exception as e:
            print(f"  Erro ao buscar página {pagina}: {e}")
            break
            
    return sessoes


def obter_contato(contact_id):
    """Busca os detalhes do contato por ID, utilizando cache em memória."""
    if not contact_id:
        return None
        
    if contact_id in _cache_contato:
        return _cache_contato[contact_id]
        
    url = f"{BASE_CONTACT}/{contact_id}"
    try:
        contato = api_request("GET", url)
        _cache_contato[contact_id] = contato
        # Atraso rápido para evitar rate limiting em lotes grandes
        time.sleep(0.12)
        return contato
    except Exception as e:
        print(f"  AVISO: Falha ao buscar contato {contact_id}: {e}")
        return None


def analisar_ddd_31(contato):
    """Identifica se o contato pertence ao DDD 31."""
    if not contato:
        return False
        
    formatted = contato.get("phoneNumberFormatted")
    raw = contato.get("phoneNumber")
    
    # 1. Verificar pelo número formatado (ex: "(31) 99999-9999")
    if formatted:
        clean_fmt = formatted.strip()
        if clean_fmt.startswith("(31)") or clean_fmt.startswith("31"):
            return True
            
    # 2. Verificar pelo número bruto (ex: "+55|31999999999" ou "+5531999999999")
    if raw:
        if "|" in raw:
            parts = raw.split("|")
            if len(parts) > 1 and parts[1].startswith("31"):
                return True
        else:
            # Remover caracteres não numéricos
            digits = "".join(c for c in raw if c.isdigit())
            # Números brasileiros normalmente começam com 55 (DDI)
            if digits.startswith("5531"):
                return True
            elif digits.startswith("31") and len(digits) in (10, 11):
                return True
                
    return False


def validar_data(data_str):
    """Valida se uma data está no formato AAAA-MM-DD."""
    try:
        datetime.datetime.strptime(data_str, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def main():
    print("=========================================================")
    print("   Helena API - Automação de Análise de DDD dos Contatos ")
    print("=========================================================\n")
    
    # Determinar datas padrão (início do mês corrente até hoje)
    hoje = datetime.date.today()
    padrao_inicio = hoje.replace(day=1).strftime("%Y-%m-%d")
    padrao_fim = hoje.strftime("%Y-%m-%d")
    
    # Ler argumentos da CLI se presentes
    inicio = None
    fim = None
    
    if "--inicio" in sys.argv:
        try:
            idx = sys.argv.index("--inicio")
            inicio = sys.argv[idx + 1]
        except IndexError:
            pass
            
    if "--fim" in sys.argv:
        try:
            idx = sys.argv.index("--fim")
            fim = sys.argv[idx + 1]
        except IndexError:
            pass
            
    # Caso não fornecido por CLI, solicitar via input interativo
    if not inicio:
        while True:
            resp = input(f"Digite a data de início (AAAA-MM-DD) [Padrão: {padrao_inicio}]: ").strip()
            if not resp:
                inicio = padrao_inicio
                break
            if validar_data(resp):
                inicio = resp
                break
            print("Formato inválido! Por favor, use AAAA-MM-DD.")
            
    if not fim:
        while True:
            resp = input(f"Digite a data de fim (AAAA-MM-DD) [Padrão: {padrao_fim}]: ").strip()
            if not resp:
                fim = padrao_fim
                break
            if validar_data(resp):
                fim = resp
                break
            print("Formato inválido! Por favor, use AAAA-MM-DD.")

    # Formatar datas para formato ISO 8601 em UTC
    inicio_iso = f"{inicio}T00:00:00Z"
    fim_iso = f"{fim}T23:59:59Z"
    
    print(f"\nPeríodo configurado: {inicio} a {fim}")
    print("---------------------------------------------------------")
    
    # 1. Buscar Sessões do período
    sessoes = buscar_sessao_paginado(inicio_iso, fim_iso)
    total_sessoes = len(sessoes)
    
    if total_sessoes == 0:
        print("\nNenhum atendimento encontrado neste período.")
        return
        
    # 2. Extrair IDs de contatos únicos
    contact_ids = set()
    for s in sessoes:
        cid = s.get("contactId")
        if cid:
            contact_ids.add(cid)
            
    total_contatos_unicos = len(contact_ids)
    print(f"\nSessões analisadas: {total_sessoes}")
    print(f"Contatos únicos a analisar: {total_contatos_unicos}")
    print("Buscando dados de cada contato na API Helena...")
    
    # 3. Buscar detalhes de cada contato e classificar DDD
    com_31 = []
    sem_31 = []
    
    processados = 0
    for cid in contact_ids:
        contato = obter_contato(cid)
        processados += 1
        
        if processados % 10 == 0 or processados == total_contatos_unicos:
            print(f"  Progresso: {processados}/{total_contatos_unicos} contatos processados...")
            
        if not contato:
            continue
            
        is_31 = analisar_ddd_31(contato)
        contato_info = {
            "id": contato.get("id"),
            "name": contato.get("name") or contato.get("nameWhatsapp") or "Sem Nome",
            "phoneNumber": contato.get("phoneNumber") or "",
            "phoneNumberFormatted": contato.get("phoneNumberFormatted") or "",
            "status": contato.get("status") or "",
            "createdAt": contato.get("createdAt", "")[:10],
            "previewUrl": f"https://app.fluxodonto.com/redirect?type=CONTACT&id={contato.get('id')}"
        }
        
        if is_31:
            com_31.append(contato_info)
        else:
            sem_31.append(contato_info)
            
    # 4. Calcular porcentagens
    total_validos = len(com_31) + len(sem_31)
    if total_validos > 0:
        pct_31 = (len(com_31) / total_validos) * 100
        pct_sem_31 = (len(sem_31) / total_validos) * 100
    else:
        pct_31 = pct_sem_31 = 0.0
        
    # 5. Imprimir resultados no console
    print("\n" + "="*57)
    print("                 RESULTADO DA ANÁLISE")
    print("="*57)
    print(f"Período Analisado:      {inicio} a {fim}")
    print(f"Total de Sessões:       {total_sessoes}")
    print(f"Contatos Únicos:        {total_contatos_unicos}")
    print(f"Contatos com Dados:     {total_validos}")
    print("-" * 57)
    print(f"Possuem DDD 31:        {len(com_31)} ({pct_31:.2f}%)")
    print(f"NÃO possuem DDD 31:    {len(sem_31)} ({pct_sem_31:.2f}%)")
    print("="*57)
    
    # Listar quais não possuem DDD 31
    if sem_31:
        print("\nContatos SEM DDD 31:")
        for idx, item in enumerate(sem_31, 1):
            phone_display = item["phoneNumberFormatted"] if item["phoneNumberFormatted"] else item["phoneNumber"]
            print(f"  {idx:02d}. {item['name']} - Telefone: {phone_display} (Criado em: {item['createdAt']})")
            print(f"      Link: {item['previewUrl']}")
    else:
        print("\nTodos os contatos analisados possuem o DDD 31.")
        
    # 6. Gravar relatório em arquivo CSV
    nome_csv = f"relatorio_ddd_contatos_{inicio}_a_{fim}.csv"
    try:
        with open(nome_csv, mode="w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f, delimiter=";")
            writer.writerow(["Relatorio de Contatos - Helena API"])
            writer.writerow([f"Periodo: {inicio} a {fim}"])
            writer.writerow([f"Sessoes analisadas: {total_sessoes}"])
            writer.writerow([f"Contatos com DDD 31: {len(com_31)} ({pct_31:.2f}%)"])
            writer.writerow([f"Contatos sem DDD 31: {len(sem_31)} ({pct_sem_31:.2f}%)"])
            writer.writerow([])
            writer.writerow(["Nome", "Telefone Bruto", "Telefone Formatado", "DDD 31?", "Criado Em", "Link Redirect"])
            
            # Escrever os sem DDD 31 primeiro
            for item in sem_31:
                writer.writerow([item["name"], item["phoneNumber"], item["phoneNumberFormatted"], "NAO", item["createdAt"], item["previewUrl"]])
            # Escrever os com DDD 31
            for item in com_31:
                writer.writerow([item["name"], item["phoneNumber"], item["phoneNumberFormatted"], "SIM", item["createdAt"], item["previewUrl"]])
                
        print(f"\nRelatório completo salvo em: {nome_csv}")
    except Exception as e:
        print(f"\nErro ao salvar o arquivo CSV: {e}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nExecução cancelada pelo usuário.")
        sys.exit(0)
    except Exception as e:
        print(f"\nErro fatal durante a execução: {e}")
        sys.exit(1)
