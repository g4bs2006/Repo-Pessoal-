# Automação Dinâmica de Leads (Helena/WTS + Supabase + n8n)

Automação multi-clínica: um único workflow de runtime atende todas as clínicas,
diferenciando pelo `companyId`. A configuração de cada clínica (token, painel,
etapa, etiquetas) fica no Supabase. Cadastrar clínica nova = rodar o onboarding.

## ⚠️ ATUALIZAÇÃO: versão Supabase agora usa NODE NATIVO (tabela achatada)

Os JSONs `Workflow_1_Runtime.json` e `Workflow_2_Onboarding.json` foram convertidos
para usar o **node nativo do Supabase** (`n8n-nodes-base.supabase`), por pedido.

Motivo da mudança de modelo: o node nativo **não chama RPC** e **não acessa o schema
`automacao`** — só faz operações de linha em tabelas do `public`. Por isso a config
foi **achatada** numa única tabela:

- **`public.automacao_clinicas`** — 1 linha por clínica, colunas por origem
  (`fb_*`, `ig_*`, `org_*`). RLS ligada, acesso só `service_role`. Já criada e
  semeada com a ATOS no projeto `nqkjechmyeqdxgkekfur`.
- WF1 → node nativo **Get Many** (filtro `helena_company_id = companyId`, `alwaysOutputData`).
- WF2 → **Get Many** (verifica existência) → IF → **Update** ou **Create**
  (o node nativo não tem upsert direto).
- Credencial: **"Dashboards Odontologicos"** (`supabaseApi`). Confirme o projeto e a service_role.

> Ao importar, confira os campos dos nodes **Create/Update** — dependendo da versão do
> node nativo o mapeamento de colunas pode aparecer um pouco diferente. As colunas são
> as de `public.automacao_clinicas`.
>
> O schema `automacao` + RPCs (seção abaixo) continuam existindo (via HTTP/PostgREST),
> mas **não são usados** pela versão de node nativo. Use um OU outro.

## Arquitetura

```
Mensagem chega na Helena
  └─ webhook → n8n (Workflow 1, endpoint ÚNICO /webhook/lead-etiqueta)
       ├─ identifica companyId + origem (FACEBOOK/INSTAGRAM/ORGANICO)
       ├─ busca config no Supabase (RPC get_config_clinica)
       ├─ se não cadastrada/inativa → responde e encerra
       ├─ aplica etiqueta no CONTATO (token + contact_tag_id da clínica)
       ├─ verifica se já existe CARD do contato no painel
       │     ├─ existe → adiciona ANOTAÇÃO no card
       │     └─ não existe → cria CARD (painel/etapa/etiqueta da clínica)
       └─ responde ao webhook
```

## Banco de dados (Supabase `dashboards-odontologicos`, schema `automacao`)

- **`clinicas`**: `helena_company_id` (chave), `helena_token`, `panel_id`, `step_id`, `ativo`.
- **`origem_etiquetas`**: por clínica × origem (`FACEBOOK`/`INSTAGRAM`/`ORGANICO`),
  `panel_tag_id` (card) + `contact_tag_id` (contato) + `status` (`ok`/`pendente`).
- **RPC `get_config_clinica(company_id)`**: usada pelo Workflow 1. Retorna JSON
  `{clinica, origens{}}` ou `null` se inexistente/inativa.
- **RPC `upsert_config_clinica(payload)`**: usada pelo Workflow 2 (onboarding).

Segurança: RLS ligada, execução das RPCs só por `service_role`. O token da Helena
sai na RPC `get_config_clinica`, por isso `anon`/`authenticated` foram revogados.

## Como usar

### 1. Configurar a service_role key (uma vez, nos dois workflows)
Nos nodes que chamam o Supabase (`Buscar Config` no WF1, `Upsert Supabase` no WF2),
substitua `SUA_SERVICE_ROLE_KEY_AQUI` pela **service_role key** do projeto
(Supabase → Project Settings → API → `service_role`). Está nos headers `apikey` e
`Authorization`. *(Ideal: migrar pra uma credencial "Header Auth" do n8n depois.)*

### 2. Importar os workflows
- `Workflow_1_Runtime.json` — recebe os leads. Ativar e usar a URL
  `https://SEU_N8N/webhook/lead-etiqueta` no webhook da Helena de **cada** clínica.
- `Workflow_2_Onboarding.json` — cadastro de clínica nova.

### 3. Cadastrar uma clínica (onboarding)
1. Abra o Workflow 2, edite o node **Entradas** com `companyId` e `helena_token`
   da clínica (`nome` é opcional).
2. Execute. Ele descobre painel, etapa inicial e etiquetas, e grava no Supabase.
3. Veja o node **Resultado**: se houver origens com `status: pendente`, corrija
   manualmente os IDs no Supabase (ver "Match ambíguo" abaixo).

## Regras de negócio

- **Origem**: `utm.source` tem prioridade sobre `channel.platform`; senão `ORGANICO`.
- **Anti-duplicata**: se o contato já tem qualquer card não-arquivado no painel,
  não cria outro — adiciona uma anotação registrando o retorno.
- **Fallback de origem**: se a clínica não tem mapeamento para a origem detectada,
  usa o de `ORGANICO`.

## Validado contra a API real (token ATOS, somente leitura)

- `GET /crm/v1/panel?IncludeDetails=Steps` → `{items:[{id,title,steps:[{id,title,isInitial,archived,position}]}]}`
- `GET /crm/v1/panel/{id}?IncludeDetails=Tags` → `{tags:[{id,name,...}]}` ← **fonte das tags de card**
- `GET /core/v1/tag` → **array puro** `[{id,name,...}]` ← tags de contato
- `GET /crm/v1/panel/card?PanelId=..&ContactId=..` → `{items:[{id,contactIds,tagIds,...}]}`
- ❌ `GET .../panel/card?IncludeDetails=Tags` → **erro 500** ("The value 'Tags' is not valid"). Não usar.

### Match ambíguo (atenção)
A conta da ATOS tem **etiquetas de contato duplicadas** (ex.: dois "Facebook",
vários "Orgânico"). Por isso o onboarding marca a origem como `pendente` quando há
0 ou mais de 1 candidata, em vez de chutar. Recomendação: padronizar os nomes das
etiquetas nas clínicas (um "Facebook", um "Instagram", um "Orgânico") para o
match automático funcionar limpo.

## Limitações conhecidas
- **Condição de corrida**: duas mensagens quase simultâneas do mesmo contato podem
  criar 2 cards. Desprezível no volume de clínica.
- **Painel automático**: o onboarding usa o 1º painel não-arquivado; se a conta tiver
  vários, ele avisa no `Resultado` — confira.
- **service_role key** está inline nos workflows (estilo atual). Migrar para
  credential do n8n quando possível.

## Seed inicial
A ATOS já foi semeada: `companyId 79a15d58-…`, painel "Controle de Leads"
(`3b98f0bf-…`), etapa "Leads" (`6f418246-…`, `isInitial`), 3 origens FB/IG/Orgânico.
`clinica_id = 67dcacea-0282-43ab-b780-384bc749f188`.

---

# Variante Google Sheets (alternativa ao Supabase)

Mesma lógica, mas a config vive numa planilha (node nativo `Google Sheets`, não HTTP).
Use **OU** a versão Supabase **OU** a Sheets — não as duas ao mesmo tempo.

| Arquivo | O que é |
|---|---|
| `Workflow_1_Runtime_GoogleSheets.json` | Runtime; lê a config com o node Google Sheets (operação *read*/lookup). Webhook em `/webhook/lead-etiqueta-sheets` (path diferente p/ não colidir com a versão Supabase). |
| `Workflow_2_Onboarding_GoogleSheets.json` | Onboarding; grava a linha com `appendOrUpdate` (match por `helena_company_id`). |

### Estrutura da planilha
Crie uma planilha com uma aba chamada **`clinicas`** e esta **linha 1 (cabeçalho)**,
exatamente com estes nomes de coluna:

```
helena_company_id	nome	helena_token	panel_id	step_id	ativo	fb_tag_nome	fb_panel_tag_id	fb_contact_tag_id	ig_tag_nome	ig_panel_tag_id	ig_contact_tag_id	org_tag_nome	org_panel_tag_id	org_contact_tag_id	status_obs
```

### Linha da ATOS (cole na linha 2 para já testar)
```
79a15d58-9d7b-4420-a75e-985267e9c8ed	Atos Odontologia	pn_7PEG91xSt3kCPnqplUOu52ww9nDjNAlr5lbuUkYdI	3b98f0bf-fea4-47b7-a922-2f3981220722	6f418246-8f5a-4c7e-a63b-31e177deed25	true	Facebook	fb7781a8-9e21-4241-a7d7-ee8e82ffbf6c	0a6eca24-bf61-4dc6-b607-9b35db4e7cfc	Instagram	9dd2d9ca-41d5-4f67-b445-2dc73efe6b2b	ec81194d-5d4a-4d03-b954-2bb9cab71069	Orgânico	5c74d4d0-8222-4f2f-999b-f60a96bed915	28a025a3-3cf1-4b17-b91c-016e21b96477	ok
```

### Setup da variante Sheets
1. Em ambos os workflows, nos nodes Google Sheets, selecione sua **credencial OAuth2**
   do Google Sheets (substitui o placeholder `REPLACE_CRED_ID`).
2. Substitua `COLE_O_ID_DA_PLANILHA_AQUI` pelo **ID da planilha** (o trecho da URL
   entre `/d/` e `/edit`).
3. Confirme que a aba se chama `clinicas` e o cabeçalho bate com o acima.
4. `ativo` é texto: use `true`/`false` (o código trata `false`/`nao`/`0` como inativa).

### Diferenças relevantes vs Supabase
- **Sem RPC / sem JSON aninhado**: a config é achatada em colunas por origem.
- **"Não cadastrada"**: o node de leitura usa `alwaysOutputData=true` para emitir um
  item vazio quando não há match, e o `Resolver Config` trata como `found:false`.
- **Concorrência/escala**: o Sheets tem cota de API e é mais lento sob volume alto;
  para muitas clínicas/mensagens, o Supabase é mais robusto. Use Sheets se preferir
  editar a config manualmente numa planilha.
