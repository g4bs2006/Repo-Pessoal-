---
name: n8n-agendamento-odontologico
description: >
  Construção completa do workflow n8n de agendamento odontológico Clinicorp com
  o subsistema de CRM da Helena/WTS, padrão Luna v4 — as 78 nós, do webhook às
  três cadeias de card e etiqueta. Use SEMPRE que o usuário mencionar: construir
  o n8n do agente odontológico, workflow de agendamento Clinicorp, criar
  agendamento via n8n para clínica, portar workflow v3 para v4, mover card no
  Kanban da Helena, etiquetar contato ao agendar/remarcar/cancelar,
  agendado_step_id, cancelado_step_id, remarcado_contact_tag_id,
  helena_company_id, automacao_clinicas, id_atendimento no payload,
  nome_profissional_sugerido, get_avaliable_days, create_appointment_by_api,
  cancel_appointment, ou qualquer variação de integração de agenda odontológica
  em n8n. Complementa a skill agente-odontologico-luna, que constrói o prompt:
  esta constrói o workflow que as 5 habilidades de agendamento chamam.
---

# n8n — Agendamento Odontológico (Clinicorp + Helena)

Gera o workflow n8n **completo** que serve as 5 habilidades de agendamento do agente odontológico Luna v4, incluindo o subsistema de CRM que na v4 é o **único** lugar onde etiqueta e card são aplicados.

Esta skill não descreve o workflow em prosa. Ela o **gera**, a partir de um arquivo de config, e depois o valida.

---

## Por que esta skill existe

A skill `agente-odontologico-luna` especifica o contrato do workflow (payload, `acao_fluxo`, o que cada habilidade espera de volta) e especifica o subsistema de CRM nó por nó. O que ela **não** especifica é o lado Clinicorp: base URL, endpoints, corpos de requisição, o fluxo de paciente, os nós de Code que escolhem os horários. Isso vivia apenas dentro dos JSONs de clínicas já montadas, o que fazia toda clínica nova começar por um clone manual.

Aqui está tudo, executável.

---

## Fluxo de trabalho

```
0. Descobrir business_id/profissional  → node scripts/descobrir_config.js (opcional, ver abaixo)
1. Coletar o que a API não devolve      → CONFIG_CLINICA.md (helena, supabase, textos)
2. Completar config_<clinica>.json      → scripts/config.exemplo.json
3. Gerar                                → node scripts/gerar_workflow.js config.json saida.json
4. Validar                              → node scripts/validar_workflow.js saida.json
5. Importar (manual ou via API)         → VALIDACAO.md ou IMPORTAR_INSTANCIA.md
6. Testar as 5 ações com payload real   → VALIDACAO.md
7. Teste de ponta a ponta no CRM        → CRM_HELENA.md
```

### 0. Descobrir automaticamente (opcional, recomendado)

Boa parte do que antes era pergunta de onboarding — `business_id`, o id do
profissional principal, a duração do slot — a própria API Clinicorp já sabe.
Basta o que a clínica já tem de cabeça: **usuário API, token API, e o
`code_link`** (o número no fim do link público da agenda, tipo
`https://agenda.link/871028` → `871028`):

```bash
cd 03_Documentacao/Skills/n8n-odontologico/n8n-agendamento-odontologico
node scripts/descobrir_config.js \
  --auth-user spl --api-key f48cca7b-a471-... --code-link 871028 \
  --nome-empresa "Clínica X" --prefixo CLX \
  --out /caminho/config_clx.json
```

O script chama `/business/list`, `/professional/list_all_professionals` e
`/appointment/get_avaliable_days` de verdade, e **cruza os três**: a lista
de profissionais devolve todo mundo cadastrado no sistema (secretária,
sócio, todos os dentistas), então o script descobre quem *de fato* atende
naquela agenda pública olhando quem aparece com horário livre, não confiando
na lista bruta. Resultado testado ao vivo contra a Scopel e batendo 100% com
o levantamento manual: ver `03_Documentacao/API Clinicorp/clinicorp-api-business-professional.md`.

O que ele resolve: `clinicorp.business_id`, `clinicorp.profissional`
(+ fallback, se mais de um profissional aparecer na amostra),
`agenda.duracao_servico`, e um **rascunho** de `janela_manha`/`janela_tarde`
(a partir do horário real observado — revisar antes de confiar, ele não sabe
o que é regra da clínica e o que é coincidência da amostra).

O que continua exigindo humano, porque nenhum endpoint da Clinicorp devolve
isso: `helena.company_id`, a linha em `automacao_clinicas`, as credenciais
Supabase, o `webhook.path`, e os textos de nota/categoria. Saem como
`COLE_*` no JSON de saída — completar manualmente (`CONFIG_CLINICA.md`)
antes do passo 3.

> ⚠️ `subscriber_id` é obrigatório em quase toda chamada mas **não é
> validado contra a conta** — o Basic Auth já resolve isso sozinho. O
> script usa o próprio `auth_user` como `subscriber_id`, confirmado ao vivo.

### 3. Gerar

```bash
node scripts/gerar_workflow.js /caminho/config_clx.json /caminho/agendamento_clx.json
node scripts/validar_workflow.js /caminho/agendamento_clx.json
```

O gerador **falha cedo** se a config estiver incompleta: ele lista os campos que faltam e não escreve arquivo. Nenhum valor é inventado — o que não vier na config não aparece no workflow.

Os ids dos nós são derivados por hash de `prefixo + nome do nó`. Rodar duas vezes com a mesma config produz o mesmo arquivo, e duas clínicas nunca colidem id. Isso resolve o "duplicar `id` de nó" que era erro comum na portabilidade manual.

### 5. Importar — manual ou via API

**Manual:** abrir o n8n, Import from File, colar as credenciais Supabase na mão. Sempre funciona, zero setup.

**Via API (recomendado se for importar mais de uma clínica):** `scripts/importar_workflow_n8n.js` cria/atualiza o workflow direto na instância, aplica tag ou projeto conforme a licença, e nunca ativa nem apaga nada sozinho. Detalhe completo — setup da API key, dry-run, segurança, e os limites reais que a API do n8n tem (Folders e `pinData` **não são suportados**, confirmado ao vivo, não é falta de documentação) — em `IMPORTAR_INSTANCIA.md`.

```bash
node --env-file=.env.local scripts/importar_workflow_n8n.js \
  --workflow /caminho/agendamento_clx.json --pasta "Nome da Pasta"
# sem --apply: só mostra o plano. Com --apply: executa de verdade.
```

---

## As 78 nós

| Bloco | Nós | Papel |
|---|---|---|
| Core | 3 | `INICIO` (webhook POST), `Configuracao Unidades` (Code, config + normalização), `Guarda de Transito` (Switch por `acao_fluxo`) |
| Consultar | 4 | `get_avaliable_days` → `Logica Inteligente` → resposta → log |
| Agendar | 12 | valida slot → busca ou cria paciente → `create_appointment_by_api` → resposta → log |
| Cancelar | 9 | busca paciente → lista agendamentos → filtra → `cancel_appointment` → resposta → log |
| Remarcar | 16 | busca antigo → valida novo slot → cancela antigo → cria novo → resposta → log |
| Verificar | 8 | busca paciente → lista → filtra o próximo → resposta → log |
| CRM Agendar | 9 | config → sessão → `Tag Agendou` → card → mover **ou** criar |
| CRM Remarcar | 9 | idem, com **`Tag Remarcou`** (novo na v4) |
| CRM Cancelar | 8 | idem, com **`Tag Cancelou`** (novo na v4), e **só move, nunca cria** |

Contagem por tipo: 1 webhook, 1 switch, 12 Code, 12 IF, 29 HTTP Request, 10 Respond to Webhook, 13 Supabase.

Detalhe de cada bloco: `CADEIA_CLINICORP.md` e `CRM_HELENA.md`. Os 12 nós de Code ficam como arquivos `.js` reais em `templates/`, revisáveis e editáveis — o gerador só substitui tokens.

---

## O que o padrão v4 exige, e o gerador já entrega

| Exigência v4 | Como aparece aqui |
|---|---|
| `id_atendimento` no payload, com os 4 aliases | capturado no topo de `Configuracao Unidades` |
| `helena_company_id` fixo no Code | injetado da config |
| Etiqueta de contato ao **agendar** | `Tag Agendou Contato (Agendar)` |
| Etiqueta de contato ao **remarcar** | `Tag Remarcou Contato (Remarcar)` — **o nó que faltava** |
| Etiqueta de contato ao **cancelar** | `Tag Cancelou Contato (Cancelar)` — **o nó que faltava** |
| Card movido pelo n8n, não pelo agente | as três cadeias, em fan-out da confirmação Clinicorp |
| `nome_profissional_sugerido` no retorno | devolvido por `Logica Inteligente` e pelas respostas de agendar e remarcar |
| Cancelar não cria card | a saída `false` do IF `Card Existe? (Cancelar)` fica desconectada, de propósito |
| Feriado é responsabilidade do agente | o workflow **não** filtra feriado. O agente consulta o `_BK_feriados.csv` |

> ⚠️ **A falha silenciosa mais cara da v4.** Sem `id_atendimento` no payload, `Buscar Sessao` não resolve o `contactId`, o IF fecha em falso e a cadeia inteira de CRM roda sem fazer nada — sem erro, sem log, sem sintoma no n8n. E como o agente v4 não aplica mais tag nenhuma, não há nada compensando. Diagnóstico: se o agendamento chega na Clinicorp mas o card não move, é `id_atendimento`. Se nem na Clinicorp chega, é o workflow.

---

## Fatos do lado Clinicorp que não estavam documentados

Base: `https://api.clinicorp.com/rest/v1`. Autenticação: header `Authorization: Basic base64(usuario:api_key)`, montado no Code.

| Operação | Endpoints, em ordem |
|---|---|
| Disponibilidade | `GET /appointment/get_avaliable_days?code_link&from&to&showAvailableTimes=True&subscriber_id` |
| Validar um slot | `GET /appointment/get_avaliable_times_calendar?subscriber_id&code_link&date` |
| Agendar | `GET /patient/get` → se não existe `POST /patient/create` → `POST /appointment/create_appointment_by_api` |
| Cancelar | `GET /patient/get` → `GET /appointment/list` → filtra → `POST /appointment/cancel_appointment` |
| Remarcar | `GET /patient/get` → `GET /appointment/list` → filtra o antigo → `get_avaliable_times_calendar` → `POST /cancel_appointment` → `POST /create_appointment_by_api` |
| Verificar | `GET /patient/get` → `GET /appointment/list` → filtra o próximo |

> **Remarcar não é update.** Na Clinicorp, remarcar é **cancelar o antigo e criar um novo**. Qualquer documentação que descreva a remarcação como "atualização que move para a data alvo" está errada, e essa diferença muda a ordem dos nós e o tratamento de erro no meio do caminho.

Helena/WTS: base `https://api.wts.chat`, header `Authorization: Bearer {helena_token}`, token vindo da linha em `automacao_clinicas`.

---

## Pré-requisitos que a skill não resolve

O gerador produz o arquivo com placeholders `COLE_*` para tudo que só a clínica ou o painel têm. Nenhum deles é adivinhável:

**Clinicorp:** `subscriber_id`, usuário do Basic, `api_key`, `business_id`, `link_agenda` (code_link), ids dos profissionais (principal e fallback).

**Helena:** `helena_company_id`, e a linha em `automacao_clinicas` com `helena_token`, `panel_id`, `agendado_step_id`, `cancelado_step_id`, `ia_card_tag_id`, `agendado_contact_tag_id`, `remarcado_contact_tag_id`, `cancelado_contact_tag_id`, e opcionalmente `agendado_em_field_key` e `agendado_para_field_key`.

**n8n:** as duas credenciais Supabase (a de `automacao_clinicas` e a de `metricas_ia` são diferentes).

> Se a clínica não tem painel de CRM na Helena, **pare e alinhe com o usuário**: ou se monta o painel, ou se aceita rodar sem etiqueta e sem card, ou se reintroduz `tag_Alerta` no agente. Não decida isso sozinho — é a mesma ressalva da Etapa 1, item 10, da skill `agente-odontologico-luna`.

---

## Referências

| Arquivo | Quando ler |
|---|---|
| `CONFIG_CLINICA.md` | **Primeiro.** O que coletar, campo por campo, e o que cada um afeta |
| `CADEIA_CLINICORP.md` | As 5 cadeias nó por nó, com endpoints, query, corpo e tratamento de erro |
| `CRM_HELENA.md` | As 3 cadeias de card e etiqueta, os endpoints WTS, o teste de ponta a ponta |
| `IMPORTAR_INSTANCIA.md` | Importar via API em vez de manual: setup da API key, `scripts/importar_workflow_n8n.js`, e os limites reais (Folders e `pinData` sem suporte na API) |
| `CODE_NODES.md` | O que cada um dos 12 nós de Code faz, o que consome e o que devolve |
| `RESPOSTAS_E_LOGS.md` | O contrato de resposta ao agente e a tabela de métricas |
| `VALIDACAO.md` | Checklist, o validador, catálogo de erros de produção |

---

## Regras de ouro

1. **Nunca copie um JSON de outra clínica e edite à mão.** Gere. O clone manual é a origem de id duplicado, credencial trocada e nó de etiqueta esquecido.
2. **Nunca reaproveite `helena_company_id`** de outra clínica, mesmo em rede que compartilha conta Helena. Se houver `pinData`, confira contra o `h.tenantId` do `correlation-context`.
3. **Nunca conecte a saída `false` de `Tem ContactId?`.** A cadeia falha fechada de propósito: melhor não registrar do que registrar no contato errado.
4. **Nunca conecte `Criar Card` na cadeia Cancelar.** Quem cancelou não ganha card novo no painel.
5. **Sempre rode o validador antes de importar**, e o teste de ponta a ponta antes de ativar. Etiqueta e card só existem aqui agora.
6. **O workflow não bloqueia feriado.** Isso é do agente, via `_BK_feriados.csv`. Não tente resolver aqui.
