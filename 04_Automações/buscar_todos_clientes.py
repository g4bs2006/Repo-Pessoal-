# -*- coding: utf-8 -*-
"""
Automação: Busca todas as contas/clientes cadastrados na API Helena,
realizando a paginação automática até obter todos os registros.
Salva o resultado em formato JSON (completo) e CSV (resumido para Excel).

Uso:
    python buscar_todos_clientes.py
"""
import sys
import time
import json
import csv
import urllib.request
import urllib.parse
import os

# Forçar saída do console para UTF-8 para evitar erros de codificação no Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Configurações de Integração
TOKEN = "pn_A9WvyLVYZo3QOxqmBzNsti6PMjewC017HDygOb38ZBY"
BASE_URL = "https://api.helena.run/core/v1/company"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/json",
    "Content-Type": "application/json",
}


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


def buscar_todos_clientes():
    """Busca todas as contas/clientes tratando a paginação da API."""
    clientes = []
    pagina = 1
    page_size = 100  # Máximo permitido pelo OpenAPI schema
    
    print("Iniciando a busca de clientes na API Helena...")
    
    while True:
        params = {
            "PageSize": page_size,
            "PageNumber": pagina,
            "IncludeDetails": "Config"  # Incluir configurações adicionais da conta
        }
        
        # Codifica os parâmetros para a query string
        url = f"{BASE_URL}?{urllib.parse.urlencode(params)}"
        
        try:
            print(f"  Buscando página {pagina}...")
            dados = api_request("GET", url)
            items = dados.get("items") or []
            clientes.extend(items)
            
            print(f"    -> {len(items)} clientes obtidos. (Total acumulado: {len(clientes)})")
            
            # Condição de parada: hasMorePages ser falso, ou não retornar itens
            if not dados.get("hasMorePages") or not items:
                break
                
            pagina += 1
            time.sleep(0.15)  # Respeitar rate limit
        except Exception as e:
            print(f"  Erro ao buscar página {pagina}: {e}")
            break
            
    return clientes


def salvar_json(clientes, caminho):
    """Salva a lista completa de clientes em formato JSON."""
    try:
        with open(caminho, "w", encoding="utf-8") as f:
            json.dump(clientes, f, indent=2, ensure_ascii=False)
        print(f"Dados completos salvos em JSON: {caminho}")
    except Exception as e:
        print(f"Erro ao salvar arquivo JSON: {e}")


def salvar_csv(clientes, caminho):
    """Salva dados selecionados dos clientes em formato CSV compatível com Excel."""
    try:
        with open(caminho, mode="w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f, delimiter=";")
            
            # Cabeçalho do CSV
            writer.writerow([
                "ID", 
                "Nome Fantasia", 
                "Razão Social", 
                "Tipo Documento", 
                "Documento", 
                "Ativo?", 
                "Status Configuração", 
                "WhatsApp", 
                "Telefone", 
                "Telefone Formatado", 
                "Email", 
                "Categoria", 
                "Nome Parceiro", 
                "Criado Em", 
                "Atualizado Em",
                "Cidade",
                "Estado"
            ])
            
            for c in clientes:
                # Extrair endereço se houver
                addr = c.get("address") or {}
                cidade = addr.get("city") or ""
                estado = addr.get("state") or ""
                
                writer.writerow([
                    c.get("id") or "",
                    c.get("name") or "",
                    c.get("legalName") or "",
                    c.get("documentType") or "",
                    c.get("documentId") or "",
                    "Sim" if c.get("active") else "Não",
                    c.get("setupStatus") or "",
                    c.get("wppNumber") or "",
                    c.get("phoneNumber") or "",
                    c.get("phoneNumberFormatted") or "",
                    c.get("email") or "",
                    c.get("category") or c.get("customCategory") or "",
                    c.get("partnerName") or "",
                    c.get("createdAt") or "",
                    c.get("updatedAt") or "",
                    cidade,
                    estado
                ])
                
        print(f"Relatório resumido salvo em CSV (compatível Excel): {caminho}")
    except Exception as e:
        print(f"Erro ao salvar arquivo CSV: {e}")


def main():
    print("=========================================================")
    print("        Helena API - Listagem Geral de Clientes          ")
    print("=========================================================\n")
    
    start_time = time.time()
    clientes = buscar_todos_clientes()
    total = len(clientes)
    
    if total == 0:
        print("\nNenhum cliente retornado pela API. Verifique o token ou a conexão.")
        return
        
    # Definir caminhos de salvamento na mesma pasta do script
    diretorio = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(diretorio, "clientes_completo.json")
    csv_path = os.path.join(diretorio, "clientes_relatorio.csv")
    
    salvar_json(clientes, json_path)
    salvar_csv(clientes, csv_path)
    
    # Exibir resumo estatístico simples
    ativos = sum(1 for c in clientes if c.get("active"))
    inativos = total - ativos
    
    print("\n" + "="*57)
    print("                 RESUMO DOS RESULTADOS")
    print("="*57)
    print(f"Total de Clientes Encontrados:   {total}")
    print(f"Clientes Ativos:                {ativos}")
    print(f"Clientes Inativos:              {inativos}")
    print(f"Tempo de execução:              {time.time() - start_time:.2f} segundos")
    print("="*57)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nBusca cancelada pelo usuário.")
        sys.exit(0)
    except Exception as e:
        print(f"\nErro fatal durante a execução: {e}")
        sys.exit(1)
