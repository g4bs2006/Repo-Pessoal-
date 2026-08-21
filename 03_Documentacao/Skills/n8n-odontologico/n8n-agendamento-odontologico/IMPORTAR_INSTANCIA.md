# Importar direto na instância n8n — API pública, limites e como usar

Depois de gerar e validar o workflow (`gerar_workflow.js` / `validar_workflow.js`), dá pra pular o "Import from File" manual na UI e importar direto via API, já com organização por pasta/tag e com auditoria local de tudo que foi feito.

---

## Como obter a spec real da API do seu n8n

O n8n publica documentação em `{sua-instância}/api/v1/docs/`, mas — no mesmo padrão de bug que a Clinicorp tem — o `swagger-initializer.js` que fica nesse path é o **esqueleto padrão** do `swagger-ui-dist`, apontando pra `petstore.swagger.io`. O spec de verdade da sua instância vem embutido inline em:

```
{sua-instância}/api/v1/docs/swagger-ui-init.js
```

dentro de `options.swaggerDoc`. Baixe esse arquivo e extraia o JSON balanceando chaves a partir do primeiro `{` depois de `"swaggerDoc":` (mesma técnica documentada em `03_Documentacao/API Clinicorp/clinicorp-api.md`). Confirmado ao vivo em 2026-08-19 contra `n8n.dentistapower.com.br`: n8n Public API v1.1.1, 26 endpoints, header de auth `X-N8N-API-KEY` (não é Bearer/Authorization).

---

## Setup

1. **Gerar a API key**: dentro do n8n, usuário → Settings → n8n API → "Create an API key". A chave é mostrada uma única vez.

2. **Guardar em `.env.local` na raiz desta skill** (já protegido pelo `.gitignore` da raiz do repo — o padrão `.env.local`, sem wildcard, casa em qualquer profundidade):

```
N8N_BASE_URL=https://sua-instancia.com
N8N_API_KEY=<a chave>
```

3. **Rodar com `--env-file`** (nativo do Node, sem precisar de `dotenv`):

```bash
node --env-file=.env.local scripts/importar_workflow_n8n.js \
  --workflow /caminho/agendamento_clinica.json \
  --pasta "Nome da Pasta" \
  [--nome "Nome alternativo só nesta importação"] \
  [--apply] [--update]
```

---

## Regras de segurança do script

| Regra | Por quê |
|---|---|
| **Sem `--apply`, é sempre dry-run** | Toda ação de escrita é só relatada, nunca executada. Rodar sem `--apply` primeiro é o padrão, não uma opção |
| **Nome já existente barra a importação**, a menos que `--update` | Protege um workflow editado à mão na UI de ser sobrescrito por engano |
| **`--update` faz `PUT` (substitui o conteúdo)**, nunca mescla nós | A API não tem merge parcial de workflow — é tudo ou nada |
| **Tags são sempre mescladas, nunca substituídas** | `PUT /workflows/{id}/tags` sobrescreve a lista inteira na API. O script sempre lê as tags atuais do workflow antes e faz união — perder uma tag como `Creator - Fulano` que já existia seria silencioso e ruim |
| **Nenhuma função de apagar existe no cliente** (`n8n_client.js`) | `deleteWorkflow`/`deleteTag`/`deleteProject` não foram implementadas, de propósito — a API key tem esse poder, o script não expõe |
| **Workflow importado sempre fica desativado** | Ativar é sempre um passo manual, depois de testar as 5 ações (`VALIDACAO.md`) |
| **Toda chamada é logada**, dry-run ou real | `logs/n8n-acoes.log`, JSON Lines — timestamp, método, path, status, e um resumo do corpo (nunca o payload inteiro, nunca a API key) |

O log fica em `n8n-agendamento-odontologico/logs/`, na raiz da skill (não dentro de `scripts/`) — cada linha é um evento, então pra saber tudo que o script já fez contra a instância, basta ler esse arquivo. Ele está coberto pelo `.gitignore` (`**/logs/`), então nunca vai pro histórico do git.

---

## "Pasta" — Projects (Enterprise) x Tags (Community) x Folders (nenhum dos dois via API)

O n8n tem **dois** conceitos de organização visual, e eles não são a mesma coisa:

| Conceito | O que é | Precisa de licença paga? | A API pública cobre? |
|---|---|---|---|
| **Project** | Um espaço de trabalho separado (com membros, permissões) | Criar projetos **adicionais** sim (Enterprise). Todo usuário já tem 1 projeto "personal" de graça | Sim — `POST/GET /projects`, `PUT/DELETE /projects/{id}` |
| **Tag** | Etiqueta simples aplicada a um workflow | Não | Sim — `POST/GET /tags`, `PUT /workflows/{id}/tags` |
| **Folder** | Subdivisão visual **dentro** de um projeto (o que aparece como `/projects/{id}/folders/{id}/workflows` na URL da UI) | Não precisa de Enterprise pra *usar* na UI | **Não. Zero suporte na API pública, nesta versão (v1.1.1)** |

O script detecta sozinho se a instância tem Projects liberado, tentando `GET /projects` primeiro:
- **Erro 403 com `feat:projectRole:admin`** → Community Edition. O script cai automaticamente pra usar **tags** como pasta.
- **Sucesso** → Enterprise. O script cria/usa um Project de verdade e transfere o workflow pra dentro (`PUT /workflows/{id}/transfer`).

### Folders — confirmado que não dá pra automatizar, com as três evidências

Testado ao vivo em 2026-08-19 contra `n8n.dentistapower.com.br` (v1.1.1), antes de desistir:

1. **Busca por "folder" na spec inteira → zero ocorrências**, em qualquer variação de maiúscula/minúscula.
2. **Os endpoints óbvios devolvem 404**: `GET /folders`, `GET /projects/{id}/folders`, `GET /projects/{id}/folders/{id}` — todos "not found", não "forbidden". A rota simplesmente não existe no servidor, não é falta de permissão.
3. **Tentei colar um campo escondido no corpo do workflow** (`parentFolderId` num `PUT /workflows/{id}`, junto dos campos válidos) pra ver se a API aceitava sem documentar — resposta real: `400 — "request/body must NOT have additional properties"`. A validação do servidor é estrita, não silenciosa.

**Conclusão prática:** criar uma pasta e mover um workflow pra dentro dela é **sempre manual, na UI**, nesta versão do n8n. O script consegue automatizar tudo até "o workflow existe, está com a tag certa, no projeto certo" — o último passo visual de arrastar pra dentro da subpasta da clínica é seu.

Se uma versão futura do n8n expuser Folders na API pública, adicionar suporte aqui é só uma função nova em `n8n_client.js` ao lado de `transferirWorkflow` — a estrutura do script já separa "resolver a pasta" de "aplicar no workflow" exatamente pra isso ser plugável depois.

---

## `pinData` (dados de teste fixados) — também sem suporte na API

Mesma investigação, resultado igual: `pinData` **não aparece em nenhum lugar da spec**, nem no corpo de criação nem no de atualização de workflow. A API pública do n8n não permite fixar dados de teste programaticamente.

O equivalente prático que o script *consegue* fazer, se um dia for pedido: embutir um nó **Sticky Note** (`n8n-nodes-base.stickyNote`) no próprio array de `nodes` do workflow gerado, com os 5 payloads de teste do `VALIDACAO.md` escritos como texto — isso é só um nó comum, sem restrição nenhuma pela API. Não implementado ainda porque muda a contagem de nós do workflow gerado (hoje 78) e isso é uma decisão de design que vale confirmar antes.

---

## Erros reais encontrados durante o uso

| Sintoma | Causa | O que fazer |
|---|---|---|
| `403 — feat:projectRole:admin` em `GET /projects` | Instância Community Edition, sem Projects adicionais | Normal — o script já trata isso sozinho, cai pra tags |
| `400 — must NOT have additional properties` | Corpo da chamada tem campo que a API não aceita (ex: tentar mandar `projectId` direto na criação do workflow, ou `pinData`, ou `parentFolderId`) | A API é estrita. Usar só os campos documentados: `name`, `nodes`, `connections`, `settings` |
| `400 — You can't transfer a workflow into the project that's already owning it` | O workflow já está no projeto de destino (comum quando só existe o projeto "personal" da conta) | Não é erro de verdade — significa que não tem nada a mover |
| Workflow "sumiu" pro `search_workflows` do MCP mas aparece na API | O MCP conectado (`claude.ai n8n`, se for esse tipo) tem escopo próprio e restrito — não é a mesma coisa que a API pública com a API key | Use a API/API key pra qualquer operação de gestão real. O MCP, se só tiver `search_workflows`/`get_workflow_details`/`execute_workflow`, serve pra outra coisa (expor workflows específicos como ferramenta), não pra administrar a instância |
| Workflow importado continua com `isArchived: true` mesmo depois de atualizado | O campo não está no schema de update (`PUT /workflows/{id}`) — não documentado, não escrevível via API | Desarquivar manualmente na UI antes de testar/ativar |
