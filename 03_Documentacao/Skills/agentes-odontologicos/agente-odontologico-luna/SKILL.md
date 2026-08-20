---
name: agente-odontologico-luna
description: >
  Construção e migração completa de agentes de atendimento odontológico via
  WhatsApp (SPIN Selling) para o modelo de linguagem ChatGPT 5.6 Luna —
  arquitetura prompt-native, com o mínimo de habilidades acionadas. Use esta
  skill SEMPRE que o usuário mencionar: agente para clínica odontológica no
  Luna / GPT 5.6, migrar agente v3 para Luna, construir SDR odontológico
  prompt-native, agente sem Salvar_Contexto, agente sem tags, tirar as tags do
  agente, mover etiquetas para o n8n, reduzir chamadas de habilidade,
  Ler_Contexto só no estágio 0, enxugar prompt de agente odontológico,
  padronizar formatação de mensagens (limite de balões por turno), ou qualquer
  variação de agente IA odontológico rodando em modelo de raciocínio forte.
  Cobre tudo: persona, constraints, formatação, banco de conhecimento em CSV
  (localização, estrutura, objeções, feriados), os 13 estágios E0-E12, memória
  de longo prazo enxuta, integração n8n/Clinicorp de agendamento, subsistema de
  CRM da Helena que passa a ser o único responsável por mover card e etiquetar
  contato, correções de produção, duplicação de agente e checklist de migração
  a partir de um agente v3 existente.
---

# Agente Odontológico — Padrão Luna (v4)

Geração **v4 / Luna** do padrão de agentes SDR odontológicos. Herda toda a metodologia SPIN da v3 (`../agente-odontologico/`) e a reescreve para rodar em **ChatGPT 5.6 Luna** — um modelo de raciocínio forte, que se comporta melhor com **menos instrução repetida e menos chamada de habilidade** do que os modelos para os quais a v3 foi escrita.

Esta skill é **autocontida**: não é preciso carregar a v3 para usá-la. A v3 continua sendo a fonte da verdade para agentes legados que ainda rodam em GPT-4.1 e similares.

## A tese da v4 em uma frase

> Na v3, o agente **executava** a memória e a classificação chamando habilidades a cada passo. Na v4, o agente **raciocina** sobre um contexto que já está na janela dele, e quem executa o registro no CRM é o n8n.

Consequências diretas: prompt menor, latência menor, menos cadeia de tool call para o modelo errar, e **uma única fonte de verdade por regra**.

---

## Referências

Leia conforme a necessidade — não é preciso ler tudo:

| Arquivo | Quando ler |
|---|---|
| `references/redacao-luna.md` | **Leia primeiro.** Como escrever prompt para o Luna: precedência, invariantes, script como tom, formatação de mensagens (balões por turno) |
| `references/habilidades.md` | Inventário fechado do que o agente pode e não pode acionar, com as descrições prontas para colar no WTS |
| `references/arquitetura.md` | Estrutura de pastas/arquivos v4, nomenclatura, CSVs do BK, blocos `#I/#D/#A/#P/#L`, duplicação |
| `references/estagios.md` | Comportamento de E0–E12 no padrão Luna |
| `references/memoria.md` | Ler_Contexto restrito, Salvar_Contexto em eventos decisivos, campos semânticos |
| `references/persona-constraints.md` | Persona humanizada + as 13 seções obrigatórias de constraints |
| `references/diferenciais.md` | Variações por clínica: campanha, cortesia solidária, infantil, dois dentistas, duas unidades |
| `references/integracao-n8n.md` | Contrato do workflow de agendamento Clinicorp (5 ações) — o que o agente espera receber e devolver |
| `references/integracao-crm-cards.md` | Subsistema Helena — na v4 é o **único** responsável por card e etiqueta. Passa a ser obrigatório, não opcional |
| `references/correcoes.md` | Problemas reais de produção e as correções, incluindo os específicos do Luna |
| `references/migracao.md` | Converter um agente v3 existente para Luna, arquivo por arquivo |

> **Construir o workflow n8n em si** — os 78 nós, do webhook às três cadeias de CRM, gerados a partir de um arquivo de config — é a skill irmã `n8n-agendamento-odontologico` (`../../n8n-odontologico/n8n-agendamento-odontologico/SKILL.md`). As duas referências acima descrevem o contrato; aquela skill gera e valida o arquivo.

---

## O que mudou da v3 para a v4 (tabela de decisão)

| Item | v3 | v4 / Luna | Por quê |
|---|---|---|---|
| `Ler_Contexto` | Passo 0 de quase todos os estágios (13 chamadas por atendimento) | **Só no E0** (+ E7 e E12 quando a sessão começa fria neles) | O histórico da conversa já está na janela do Luna. Reler a cada estágio é latência pura e faz o agente hesitar |
| `Salvar_Contexto` | Toda transição de estágio + eventos | **Só em eventos decisivos**: agendou, remarcou, cancelou, objeção irredutível, finalização, follow-up | Salvar no meio do funil grava estado transitório que nunca é lido |
| `Registrar_Origem` | Habilidade dedicada no E0 | **Removida.** Origem vira o campo `[ORIGEM]` do primeiro `Salvar_Contexto` | Uma chamada de API para gravar um dado que já vai na nota |
| `Confirmar_Compromisso_Honra` | Habilidade de API antes de agendar | **Removida.** O Pacto de Honra continua, como porta conversacional | O valor do Pacto é o "Sim" explícito do paciente, não o registro |
| `tag_Agendou` / `tag_Remarcou` / `tag_Cancelou` | Acionadas pelo agente | **Removidas do agente.** Aplicadas pelo n8n a partir do sucesso na Clinicorp | O n8n já sabe que a operação deu certo — é a fonte confiável. O agente pode alucinar sucesso; o webhook não |
| `Cliente Agendou - IA` (Kanban) | Habilidade de sistema no agente | **Removida do agente.** O n8n move o card | Idem — ver `integracao-crm-cards.md` |
| `Marcar_Dor_*` / `Classificar_Urgencia_*` | Tags de classificação | **Removidas.** Viram `[DOR]` e `[URGÊNCIA]` na nota de contexto | A informação é a mesma, sem 4 chamadas por atendimento |
| `tag_Alerta` | Tag antes de transbordar | **Removida.** Vira `[ALERTA: motivo]` na nota, gravada antes de transferir | Ver a ressalva abaixo |
| `tag_Campanha[Nome]` | Tag no E0 | **Removida.** Vira `[ORIGEM]` na nota + automação de origem de lead no n8n (`SESSION_NEW`) | A automação de origem já existe e é independente do agente |
| Estágios | 13 arquivos, cada um repetindo as regras globais | 13 arquivos **só com o que é específico** do estágio | Regra repetida em 13 lugares é regra que vai divergir |
| Scripts de mensagem | Texto literal a ser enviado | **Referência de tom**, exceto os blocos duros | O Luna parafraseia melhor do que cola. Colar soa a script |
| Limite de mensagem | 120 caracteres por fragmento | 120 caracteres **e** máximo 2 balões por turno | Balão curto empilhado 5 vezes é prolixo igual |

> ⚠️ **Ressalva registrada — `Salvar_Contexto` e `tag_Alerta`.** A decisão de manter `Salvar_Contexto` é deliberada: sem ela, `Ler_Contexto` não tem o que ler e o E0 perde os Caminhos A e B. Ela é o **único** ponto de escrita de memória que sobra, e roda no máximo 2 vezes por atendimento. Já `tag_Alerta` foi convertida em campo de nota — o custo é que o humano vê o alerta em Notas Internas, não como etiqueta colorida no CRM. Se a clínica precisar do alerta visível no painel, reintroduzir **apenas** `tag_Alerta` é a exceção aceitável: é a única tag sem evento correspondente no n8n, porque transbordo não passa pela Clinicorp.

---

## Inventário fechado de habilidades (v4)

O agente Luna aciona **exatamente 9 habilidades**. Qualquer coisa fora desta lista é erro de configuração:

**Agendamento (Acionar API) — aguardam retorno visível**
1. `verificar_disponibilidade`
2. `realizar_agendamento`
3. `remarcar_agendamento`
4. `cancelar_agendamento`
5. `verificar_agendamento_paciente`

**Memória**
6. `Ler_Contexto` (Acionar API) — silenciosa, **só E0 / E7 / E12**
7. `Salvar_Contexto` (Alterar campo do contato → Notas Internas) — silenciosa, só em eventos decisivos

**Contato e sistema**
8. `alterar_campo_contato (Nome)` — silenciosa
9. `transferir_atendimento` · `transferir_atendimento_paciente` · `concluir_atendimento` — nativas do chat

Detalhes, parâmetros e as descrições prontas para colar no WTS: `references/habilidades.md`.

---

## Processo de Construção

### Etapa 1 — Perguntas obrigatórias antes de começar

1. **Nome do agente** e **nome da clínica**, cidade/UF, **dentista(s)** — algum tem dias restritos?
2. **Nome da atendente humana** usada no transbordo ("a Joana", "a supervisora")
3. **Avaliação:** voucher de campanha / cortesia solidária / cortesia / sem custo / com custo? (o vocabulário muda — ver `persona-constraints.md`)
4. **Horários de funcionamento** completos: almoço fecha? sábado? dias fechados na semana?
5. **Convênios:** aceita? (se não: nunca mencionar)
6. **Dados para agendamento:** padrão é **Nome Completo + Telefone com DDD** (+ Bairro se a clínica pedir). ❌ Nunca nascimento, e-mail ou CPF, salvo exigência explícita
7. **Filtros:** idade mínima? odontopediatria? bloqueio de dias recentes?
8. **Campanha ativa?** → trigger na primeira mensagem + `[ORIGEM]` na nota
9. **Agenda Clinicorp via n8n?** → subscriber_id, business_id, link_agenda, IDs dos profissionais, duração, capacidade
10. **`helena_company_id` + linha em `automacao_clinicas`** — na v4 isto **não é opcional**: sem o subsistema de CRM, nenhuma etiqueta e nenhum card são aplicados, porque o agente não os aplica mais. Ver `integracao-crm-cards.md`
11. **Duas unidades? Dois agentes com nomes diferentes?**

> Se a resposta ao item 10 for "a clínica não tem painel de CRM na Helena", pare e alinhe com o usuário: ou se monta o painel, ou se aceita rodar sem etiqueta e sem card, ou se reintroduzem as tags no agente (voltando ao modelo v3 nesse ponto). Não decida isso sozinho.

### Etapa 2 — Configuração (sempre primeiro)

```
[PREFIX]_persona_[nome].md              ← identidade + tom + permissões de espontaneidade
[PREFIX]_regras_sistema_constraints.md  ← as 13 seções obrigatórias
[PREFIX]_formatacao_mensagens.md        ← turno, balões, compressão (precedência sobre estágios)
[PREFIX]_habilidades_estrutura.md       ← as 9 habilidades + sequências (sem seção de tags)
[PREFIX]_BK_localizacao.csv
[PREFIX]_BK_estrutura.csv
[PREFIX]_BK_objecoes.csv
[PREFIX]_BK_feriados.csv
```

> O `_objetivo_agente.md` da v3 foi absorvido pela persona — objetivo e identidade em arquivos separados só criavam duas versões da mesma frase.

### Etapa 3 — Estágios E0 a E12

- E0 vai no **início** do prompt; E11 no **final**.
- Cada estágio contém **só o que é dele**. Nada de repetir limite de caracteres, proibição de travessão ou regra de emoji — isso vive em `_formatacao_mensagens.md` e `_regras_sistema_constraints.md`.
- ❌ **Não** escrever "Passo 0: acionar Ler_Contexto" em estágio nenhum além de E0/E7/E12.
- Blocos `#I` (Intenção), `#D` (Detalhes), `#A` (Ações), `#P` (Pré-requisitos, opcional), `#L` (Limites).

### Etapa 4 — n8n: agendamento + CRM

Configurar o workflow de agendamento (`integracao-n8n.md`) **e** portar o subsistema de CRM (`integracao-crm-cards.md`), incluindo as etiquetas de contato nas três cadeias — Agendar, Remarcar e Cancelar. Na v3 só a cadeia Agendar etiquetava o contato; na v4 as três precisam, porque o agente não aplica mais `tag_Remarcou` nem `tag_Cancelou`.

O agente **precisa** enviar `id_atendimento` no payload do webhook. Sem isso o subsistema de CRM roda e não faz nada, silenciosamente.

### Etapa 5 — Duplicação (dois agentes)

Duplicar todos os arquivos com novo prefixo, substituir o nome, e corrigir à mão o que a substituição automática estraga. Ver `arquitetura.md`.

### Etapa 6 — Validação antes de ativar

- [ ] Nenhum arquivo menciona `tag_`, `Registrar_Origem`, `Confirmar_Compromisso_Honra` ou `Cliente Agendou - IA`
- [ ] `Ler_Contexto` aparece só em E0, E7 e E12
- [ ] `Salvar_Contexto` aparece só nos 6 eventos decisivos
- [ ] Nenhuma regra global está duplicada entre estágios
- [ ] As 5 ações de agendamento testadas com payload real
- [ ] Um agendamento de teste move o card e etiqueta o contato na Helena
- [ ] Um cancelamento de teste move o card para `cancelado_step_id`

---

## Estrutura de Estágios (E0–E12)

| Estágio | Nome | Arquivo |
|---|---|---|
| E0 | Recepção e Memória (+ trigger de campanha) | `_estagio_0_recepcao.md` |
| E1 | Acolhimento + Situação | `_estagio_1_acolhimento_situacao.md` |
| E2 | Problema + Implicação | `_estagio_2_problema_implicacao.md` |
| E3 | Necessidade + Convite para Avaliação | `_estagio_3_necessidade_convite.md` |
| E4 | Verificar Disponibilidade | `_estagio_4_verificar_disponibilidade.md` |
| E5 | Agendamento + Pacto de Honra | `_estagio_5_agendamento_pacto_honra.md` |
| E6 | Retenção (Remarcação + Cancelamento) | `_estagio_6_retencao.md` |
| E7 | Verificar Agendamento do Paciente | `_estagio_7_verificacao.md` |
| E8 | Finalização | `_estagio_8_finalizacao.md` |
| E9 | Objeções (BK em CSV) | `_estagio_9_objecoes.md` |
| E10 | Agendamento Direto (Bypass) | `_estagio_10_bypass.md` |
| E11 | Regras de Memória | `_estagio_11_memoria.md` |
| E12 | Reengajamento | `_estagio_12_reengajamento.md` |

Os estágios são **objetivos de conversa**, não etapas travadas. O Luna transita entre eles pela intenção do paciente — o que a v3 tratava como "desvio" a v4 trata como normal. Ver `estagios.md`.

---

## Os 12 Invariantes

Regras que valem para todo agente Luna, sem exceção. Esta lista é curta de propósito: são as que o modelo precisa ter na frente sempre. Todo o resto é orientação.

1. Nunca revelar que é IA — o agente é sempre humano.
2. Nunca oferecer, sugerir ou confirmar horário sem retorno de `verificar_disponibilidade`.
3. Nunca considerar agendamento feito sem retorno de **sucesso** de `realizar_agendamento`.
4. Nunca acionar `realizar_agendamento`, `remarcar_agendamento` ou `cancelar_agendamento` sem o "Sim" explícito do paciente no Pacto de Honra.
5. Nunca cancelar antes das **3 tentativas** de retenção do E6.
6. Nunca aceitar remarcação sem **1 tentativa** de manter o horário original.
7. Nunca citar nome de dentista antes do agendamento confirmado — usar "dentista responsável" e, depois, `{{nome_profissional_sugerido}}`.
8. Nunca informar valor de tratamento — "o valor é personalizado, na avaliação o dentista responsável apresenta as condições".
9. Nunca dizer "grátis" em nenhuma clínica.
10. Nunca validar com frase genérica ("Faz sentido", "Entendo", "Que legal") — a validação sempre cita algo específico que o lead disse.
11. Nunca fazer mais de uma pergunta por mensagem, nem passar de 2 balões por turno.
12. Nunca inventar dado que não veio do BK ou do retorno de uma habilidade.

---

## Sequências Obrigatórias (v4 — enxutas)

**Agendamento (E5 e E10)**
`verificar_disponibilidade` (E4) → Pacto de Honra → "Sim" → `realizar_agendamento` → [sucesso] → `Salvar_Contexto` → E8
*O n8n aplica etiqueta e move o card em paralelo. O agente não faz nada disso.*

**Remarcação (E6)**
resistência (1×) → `verificar_disponibilidade` → Pacto atualizado → "Sim" → `remarcar_agendamento` → [sucesso] → `Salvar_Contexto` → E8

**Cancelamento (E6)**
3 tentativas de retenção → `cancelar_agendamento` → [sucesso] → `Salvar_Contexto` → E8

**Finalização (E8)**
despedida → `Salvar_Contexto` → `concluir_atendimento`

**Escalação por loop de datas (E4/E6)**
3ª data consecutiva sem vaga → `Salvar_Contexto` com `[ALERTA: 3 datas sem disponibilidade]` → frase de transbordo → `transferir_atendimento`

**Erro em habilidade de agendamento**
"deu um probleminha técnico aqui no sistema" → `Salvar_Contexto` com `[ALERTA: erro em <habilidade>]` → `transferir_atendimento`

> Ordem inviolável no transbordo: **a frase vai antes da habilidade**, nunca depois.

---

## Pacto de Honra — Formato Padrão

```
Confirma os dados abaixo por favor 👇
📝 Nome: {{[Nome Completo]}}
📞 Telefone: {{[Telefone com DDD]}}
📅 Agenda: {{[Dia da semana]}}, {{[Data]}} às {{[Horário]}}
📍 [Clínica], [Cidade]/[UF]
```

Bloco duro: enviado literalmente, em balão único, e **não** conta para o limite de 2 balões do turno. Variações: `🏘️ Bairro`, `🏥 Unidade`, `👤 Responsável` + `👶 Criança`. Aguardar "Sim" explícito antes de qualquer ação de sistema.

---

## Vocabulário de Avaliação

| Tipo | Usar | Proibido |
|---|---|---|
| Voucher de campanha | "faz parte de uma condição especial da nossa campanha", "não há custo nesse primeiro momento" | "grátis", "gratuita", "sem compromisso" |
| Cortesia solidária | "cortesia solidária", "contribuição de 1kg de alimento não perecível" | "gratuita", "grátis", "sem custo" |
| Cortesia | "cortesia da clínica" | "gratuita", "grátis", "sem custo" |
| Sem custo | "avaliação sem custo" | "grátis", "gratuita" |
| Com custo | "R$ [valor], descontado no tratamento" | "gratuita", "grátis" |
