---
name: clickup-report
description: >
  Suite de gestão de trabalho no ClickUp com três modos: registro de sessão,
  planejamento inteligente e geração de relatório. Use SEMPRE que o usuário
  invocar /clickup (ou variantes: "registrar no ClickUp", "planejar", "relatório").
  Modo padrão (sem sufixo): registra o que foi feito na sessão atual.
  /clickup planejar: estrutura o que será feito com 3 perguntas-chave contextuais.
  /clickup relatorio: gera relatório consolidado a partir do log de sessões.
---

# Skill: /clickup — Suite de Gestão ClickUp

Três modos de operação. Ler os arquivos em `references/` conforme necessário:

- `references/workspace.md` — IDs fixos, mapa de clientes, IDs dos comentários de seção
- `references/tipos-trabalho.md` — taxonomy de trabalho e roteamento para seções
- `references/template-comentario.md` — formato exato do comentário por tipo
- `references/planejamento.md` — lógica de leitura de contexto e geração de perguntas
- `references/onboarding.md` — os 6 passos de onboarding de nova clínica (ler quando trabalho = construção de agente novo)

---

## MODO 1 — `/clickup` (registro de sessão)

Registra o trabalho feito na sessão como comentário na task do cliente no ClickUp.
Também appenda uma linha ao log em `logs/sessions.md`.

### Passo 1 — Avaliar a sessão

1. **`git diff --stat`** — quais arquivos foram criados/modificados? Define o escopo real.
2. **Contexto da conversa** — qual cliente? qual tipo? quais decisões?
3. **Classificar** usando `references/tipos-trabalho.md`

Se sessão sem entrega tangível: informar e perguntar se mesmo assim quer registrar.

### Passo 2 — Identificar o cliente

1. Extrair nome do cliente da conversa
2. Buscar task ID no mapa em `references/workspace.md`
3. Se não encontrar: usar `clickup_search` com o nome do cliente
4. Se cliente novo: **Passo 2B**

**Passo 2B — Novo cliente:**
1. Criar task com `clickup_create_task`:
   - `list_id`: `901325559285`
   - `name`: NOME DO CLIENTE (maiúsculas)
   - `status`: mês/ano atual (ex: `junho/26`)
   - `assignees`: `[112086605]` (Gabriel)
   - `tags`: `["gabriel"]`
2. Criar os 4 comentários de seção (ver `references/workspace.md`)
3. Anotar IDs dos comentários criados

### Passo 3 — Identificar a seção correta

| Tipo de trabalho | Seção |
|---|---|
| Construção inicial / configuração | Mapeamento Inicial |
| Bug / ajuste / mudança solicitada | Demandas |
| Feedback / resultado positivo | Sucesso |
| API / dados técnicos / contatos | Dados |

### Passo 4 — Montar e postar o comentário

Usar template de `references/template-comentario.md`. Postar com `clickup_create_comment` diretamente na task — sem `reply_to_id`. O prefixo `[MAPEAMENTO INICIAL]`, `[DEMANDAS]` etc. no texto já indica a seção visualmente.

### Passo 6 — Appender ao log de sessões

Adicionar uma linha ao arquivo `logs/sessions.md`:

```
| DD/MM/AAAA | CLIENTE | Tipo | Resumo em 1 linha | Comment ID |
```

Se o arquivo não existir, criá-lo com o cabeçalho:
```
| Data | Cliente | Tipo | Resumo | Comment ID |
|---|---|---|---|---|
```

### Passo 7 — Confirmar para o usuário

- Cliente e seção onde foi registrado
- Comment ID gerado
- Confirmação de que o log foi atualizado

---

## MODO 2 — `/clickup planejar`

Estrutura o trabalho futuro com perguntas-chave contextuais e posta o plano no ClickUp.

### Passo 1 — Coletar os itens de trabalho

O usuário descreve o que tem pela frente em linguagem natural. Extrair cada item como:
- **Cliente** (quem é afetado)
- **Tipo** (construção / manutenção / configuração)
- **Descrição breve** do que precisa ser feito

### Passo 2 — Ler o contexto existente

Para cada item de trabalho, ler os arquivos relevantes do cliente:
- Verificar se existe pasta do cliente em `01_Clinicas/`
- Se existir: ler arquivos de configuração (`objetivo_agente.md`, `regras_sistema_constraints.md`) e últimos estágios modificados
- Se não existir: identificar como trabalho novo sem contexto

Ver `references/planejamento.md` para o protocolo completo de leitura.

### Passo 3 — Gerar as 3 perguntas-chave

Baseado no que foi lido, formular **exatamente 3 perguntas** — uma por categoria:

1. **Escopo** — o que exatamente vai ser feito? (identificar o que está em aberto no contexto lido)
2. **Contexto** — o que já existe e pode ser reaproveitado? (evitar retrabalho com base nos arquivos encontrados)
3. **Critério de pronto** — como saber que terminou? (o que o cliente/Gabriel precisa ver ou aprovar)

As perguntas devem ser **específicas para o trabalho descrito**, não genéricas. Ver exemplos em `references/planejamento.md`.

### Passo 4 — Aguardar as respostas

Apresentar as 3 perguntas ao usuário e aguardar. Não avançar sem as respostas.

### Passo 5 — Estruturar o plano

Com as respostas, montar o plano de execução:

```
PLANO — [data]

1. [item mais urgente / dependência dos demais]
   Cliente: [nome]
   O que fazer: [descrição concreta]
   Pronto quando: [critério]

2. [próximo item]
   ...
```

Ordenar por: dependências → urgência declarada pelo usuário → tamanho (menor primeiro se empate).

### Passo 6 — Postar o plano no ClickUp

Criar **uma nova task** na lista CLIENTES:
- `name`: `📋 Plano [DD/MM/AAAA] — [resumo de 1 linha]`
- `list_id`: `901325559285`
- `status`: mês/ano atual
- `assignees`: `[112086605]`
- `description`: o plano montado no Passo 5

Se os itens são todos de um único cliente: postar como comentário na task desse cliente (seção Demandas) em vez de criar task nova.

### Passo 7 — Salvar localmente

Salvar o plano em `logs/plans/AAAA-MM-DD.md` para referência durante a execução.

### Passo 8 — Confirmar para o usuário

- Task ID do plano criado no ClickUp
- Ordem de execução resumida (lista numerada)
- "Quando começar um item, é só me chamar que já tenho o contexto do plano."

---

## MODO 3 — `/clickup relatorio`

Gera relatório consolidado a partir do log de sessões.

### Passo 1 — Ler o log

Ler `logs/sessions.md`. Se vazio ou não existe: informar que não há sessões registradas ainda.

### Passo 2 — Aplicar filtro (se o usuário especificou)

- `/clickup relatorio` sem filtro → mês atual
- `/clickup relatorio [cliente]` → todas as sessões desse cliente
- `/clickup relatorio [mês/ano]` → período específico (ex: `junho/26`)

### Passo 3 — Gerar o relatório

Formato padrão:

```
# Relatório — [filtro aplicado]

## Resumo
- X sessões registradas
- Y clientes atendidos
- Tipos: Z construções, W manutenções, V configurações

## Por cliente

### [CLIENTE]
- [DD/MM] [Tipo] — [resumo]
- [DD/MM] [Tipo] — [resumo]

## Próximos planos pendentes
[itens dos plans/ que ainda não geraram sessão de execução]
```

### Passo 4 — Postar ou exibir

Por padrão: exibir na conversa.
Se usuário pedir "postar no ClickUp": criar comentário em uma task de relatório mensal (criar se não existir: `RELATÓRIO [MÊS/ANO]`).

---

---

## Como Usar — Referência Rápida

### `/clickup`
Chame no final de uma sessão onde algo foi entregue.

```
/clickup
```

A skill analisa a conversa + git diff, identifica o cliente e o tipo de trabalho, e posta o registro no ClickUp automaticamente. Você não precisa descrever nada — ela lê o contexto sozinha.

---

### `/clickup planejar`
Chame no início de uma sessão (ou quando quiser organizar o backlog).

```
/clickup planejar
```

Descreva tudo que tem pela frente em linguagem natural:

> "Tenho que criar o agente de campanha de natal da Bazacas, ajustar os horários da Oral Foz e revisar as objeções da Arte Riso."

A skill lê os arquivos existentes de cada cliente e faz **3 perguntas direcionadas** (escopo, contexto, critério de pronto). Após as respostas, monta o plano ordenado e cria a task no ClickUp.

---

### `/clickup relatorio`
Chame quando quiser ver um consolidado do que foi feito.

```
/clickup relatorio
```

Gera relatório do mês atual por padrão. Para filtrar:

```
/clickup relatorio Oral Concept      → tudo de um cliente específico
/clickup relatorio junho/26          → período específico
```

---

## Regras Globais

- ❌ Nunca postar sem confirmar o cliente se houver ambiguidade
- ❌ Nunca inventar deliverables — só o que foi realmente feito (verificar git diff)
- ❌ Nunca criar task de cliente novo sem confirmar o nome exato
- ❌ Nunca avançar o planejamento sem as 3 respostas do usuário
- ❌ Nunca usar emojis nos comentários postados no ClickUp — nem nos templates, nem no texto gerado
- ✅ Sempre verificar o mapa de clientes antes de fazer `clickup_search`
- ✅ Sempre appender ao log após registrar uma sessão
- ✅ Para sessões com múltiplos clientes: perguntar para qual registrar (ou nos dois)
- ✅ Trabalho de infra interna (skills, automações, ferramentas) vai em CLIENTES em task própria — nunca misturar com comentários de tasks de clientes odontológicos
