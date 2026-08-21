# Planejamento — Lógica de Leitura de Contexto e Geração de Perguntas

## Deteccao de Onboarding Novo

Antes de qualquer leitura, verificar se o trabalho descrito é um onboarding de cliente novo.

Indicadores de onboarding:
- Usuario menciona "novo cliente", "nova clinica", "construir do zero", "onboarding"
- Nao existe pasta do cliente em `01_Clinicas/`
- Existe onboarding JSON mas nenhum arquivo de agente ainda

Se for onboarding: ler `references/onboarding.md` e usar as perguntas-chave
definidas lá (P1 escopo, P2 contexto/sistema, P3 critério de pronto) em vez das
perguntas padrão abaixo. O plano gerado segue os 6 passos do onboarding.

---

## Protocolo de Leitura de Contexto

Antes de gerar as 3 perguntas, ler os arquivos do cliente para entender o que já existe.

### O que ler (por tipo de trabalho)

**Para trabalho em agente existente:**
1. `01_Clinicas/[pasta-cliente]/[agente]/Configuracao/[prefixo]_objetivo_agente.md` — entender o escopo atual
2. `01_Clinicas/[pasta-cliente]/[agente]/Configuracao/[prefixo]_regras_sistema_constraints.md` — ver regras e restrições
3. Últimos estágios modificados (verificar com `git log --oneline -- [pasta]`) — ver onde houve atividade recente

**Para construção nova:**
1. Verificar se existe `onboarding_*.json` na pasta do cliente — contexto do briefing
2. Verificar se existe pasta de outro agente da mesma clínica — reutilizar padrões
3. Verificar skill `03_Documentacao/Skills/agentes-odontologicos/agente-odontologico/SKILL.md` — versão atual do template

**Para manutenção/bug:**
1. Ler o arquivo específico que precisa ser mudado
2. Ler o log de sessões `logs/sessions.md` para ver o histórico desse cliente

---

## As 3 Perguntas-Chave

### Categoria 1: ESCOPO
O que exatamente vai ser feito? Identificar o que está em aberto no contexto lido.

**Gatilhos para esta pergunta:**
- Arquivos de configuração existem mas incompletos
- Briefing menciona algo vago ("melhorar o agente")
- Múltiplos estágios poderiam ser afetados mas não está claro qual

**Exemplos por situação:**

| Situação | Pergunta de Escopo |
|---|---|
| Campanha nova para cliente que já tem agente base | "A campanha segue o mesmo fluxo de estágios do agente base (E0-E12), ou tem uma trilha separada como a campanha de aniversário da Bazacas (EA0-EA8)?" |
| Ajuste de horário sem saber qual clínica | "O ajuste de horário é para qual unidade — [unidade A] ou [unidade B]?" |
| "Revisar o agente" sem especificar | "O que motivou a revisão? É um comportamento específico que está errado, ou uma revisão geral antes do lançamento?" |
| Nova funcionalidade vaga | "Qual é o gatilho para essa funcionalidade entrar — a IA identifica sozinha, ou o operador aciona manualmente?" |

---

### Categoria 2: CONTEXTO
O que já existe e pode ser reaproveitado? Baseado nos arquivos que foram lidos.

**Gatilhos para esta pergunta:**
- Existe estrutura similar em outro agente do mesmo cliente ou de outro cliente
- Existem CSVs ou banco de dados que podem ser expandidos ao invés de criados do zero
- Existe campanha anterior com estrutura parecida

**Exemplos por situação:**

| Situação | Pergunta de Contexto |
|---|---|
| Campanha de natal para Bazacas (que já tem campanha de aniversário) | "A campanha de natal pode reaproveitar a estrutura EA0-EA8 da campanha de aniversário, ou os estágios precisam ser completamente diferentes?" |
| Novo agente para clínica com franquias | "Tem alguma clínica da rede que já tem agente construído e pode servir como base — mesmo tom, mesma estrutura de estágios?" |
| Adicionar objeções ao banco de dados | "As objeções novas substituem as atuais ou se somam às [N] objeções já cadastradas no BK_objecoes.csv?" |
| Ajuste em agente bilíngue | "O ajuste afeta os dois idiomas (PT e ES) ou só o fluxo em português?" |

---

### Categoria 3: CRITÉRIO DE PRONTO
Como saber que terminou? O que precisa ser visto ou aprovado.

**Gatilhos para esta pergunta:**
- Trabalho criativo (prompt, persona) — validação subjetiva
- Trabalho técnico com impacto em produção — precisa de teste antes de publicar
- Cliente novo — precisa de aprovação formal

**Exemplos por situação:**

| Situação | Pergunta de Critério |
|---|---|
| Agente novo | "O agente vai passar por aprovação do cliente antes de ir para a WTS, ou já pode ser configurado direto?" |
| Ajuste de comportamento | "Como vamos validar que o ajuste funcionou — teste manual de conversa, ou o cliente vai testar e dar feedback?" |
| Campanha com data de início | "Qual é a data de lançamento da campanha? Precisamos garantir que esteja na WTS antes disso." |
| Manutenção em produção | "O agente está ativo com leads reais agora? Se sim, a mudança entra ao vivo imediatamente ou tem uma janela para aplicar?" |

---

## Estrutura do Arquivo de Plano

Salvar em `logs/plans/AAAA-MM-DD.md`:

```markdown
# Plano — DD/MM/AAAA

## Contexto
[O que o usuário descreveu ter pela frente]

## Perguntas e Respostas

**P1 (Escopo):** [pergunta]
**R:** [resposta]

**P2 (Contexto):** [pergunta]
**R:** [resposta]

**P3 (Critério de pronto):** [pergunta]
**R:** [resposta]

## Plano de Execução

1. [item] | Cliente: [nome] | Pronto quando: [critério]
2. [item] | Cliente: [nome] | Pronto quando: [critério]
3. ...

## Status
- [ ] Item 1
- [ ] Item 2
- [ ] Item 3

## ClickUp
Task ID: [id da task criada]
```

---

## Regras de Geração das Perguntas

- **São sempre 3 perguntas** — uma por categoria, nessa ordem: Escopo → Contexto → Critério
- **Nunca perguntar o óbvio** — se a resposta está nos arquivos lidos, não perguntar (já sabe)
- **Nunca perguntas genéricas** — "qual é o prazo?" é genérica; "a campanha precisa estar na WTS antes do Natal (25/12)?" é específica
- **Uma pergunta por vez dentro da categoria** — se houver dúvida dupla no escopo, escolher a mais bloqueante
- **Baseadas no que foi lido** — cada pergunta deve referenciar algo concreto encontrado (ou não encontrado) nos arquivos
