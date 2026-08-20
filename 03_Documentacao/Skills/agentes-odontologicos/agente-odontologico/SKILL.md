---
name: agente-odontologico
description: >
  Construção completa de agentes de atendimento via WhatsApp para clínicas
  odontológicas usando SPIN Selling. Use esta skill SEMPRE que o usuário
  mencionar construir agente para clínica, criar SDR odontológico, estruturar
  estágios de atendimento, criar banco de conhecimento para dentista, montar
  fluxo de agendamento, duplicar agente com outro nome, corrigir estágios de IA
  odontológica, ou qualquer variação de agente IA para clínica odontológica.
  A skill cobre todos os arquivos: objetivo, persona, constraints, banco de
  conhecimento em CSV (localização, estrutura, objeções, feriados),
  habilidades/tags, os 13 estágios (E0-E12 na estrutura v3) e o sistema de
  memória de longo prazo com campos semânticos. Também cobre: memória entre
  sessões, habilidades Ler_Contexto/Salvar_Contexto/Registrar_Origem,
  integração com n8n e agenda Clinicorp, caminhos A/B/C, campanhas com trigger
  na primeira mensagem, regras especiais como atendimento infantil, múltiplos
  dentistas com dias restritos, avaliação com voucher/cortesia solidária,
  filtros de agendamento, correção de problemas em produção, duplicação de
  agente com nome diferente, e o subsistema de CRM que move card no Kanban da
  Helena e etiqueta o contato ao agendar/remarcar/cancelar.
---

# Agente de Atendimento Odontológico — Guia Completo v3

Este skill captura o padrão consolidado de construção de agentes SDR para clínicas odontológicas via WhatsApp, com metodologia SPIN Selling. A versão v3 consolida o padrão usado em **OB Clinic (Gi, abril/2026)** e **Vassoler (Karol, maio/2026)** — referências mais recentes e fonte da verdade quando houver conflito com clínicas antigas.

Leia os arquivos em `references/` conforme necessário:
- `references/arquitetura.md` — estrutura de pastas/arquivos, nomenclatura, CSVs do BK, blocos `#I/#D/#A/#P/#L`, duplicação
- `references/estagios.md` — comportamento detalhado de E0-E12 na estrutura v3
- `references/memoria.md` — memória de longo prazo: Ler_Contexto, Salvar_Contexto com campos semânticos, Registrar_Origem, caminhos A/B/C
- `references/diferenciais.md` — variações por clínica: campanhas, cortesia solidária, persona, dois dentistas, infantil, duas unidades
- `references/integracao-n8n.md` — workflow n8n de agendamento com Clinicorp (webhook, ações, endpoints, parsing)
- `references/integracao-crm-cards.md` — subsistema n8n que espelha agendamento/remarcação/cancelamento no CRM da Helena (mover card + etiquetar contato); como portar entre clínicas
- `references/correcoes.md` — correções de problemas comuns em produção

---

## Estrutura de Estágios v3 (mudou em relação à v2)

Os estágios foram reorganizados: Problema e Implicação se fundiram, e Verificar Disponibilidade virou estágio dedicado.

| Estágio | Nome v3 | Arquivo |
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
| E12 | Reengajamento (Proativo / Reativação / Break-up) | `_estagio_12_reengajamento.md` |

---

## Processo de Construção

### Etapa 1 — Perguntas obrigatórias antes de começar

1. **Nome do agente** (ex: Gi, Karol, Sophia)
2. **Nome da clínica**, cidade e **dentista(s) responsável(is)** — algum dentista tem dias restritos?
3. **Nome da(s) atendente(s) humana(s)** — usada no transbordo (ex: "supervisora", Joana)
4. **Avaliação:** voucher de campanha / cortesia solidária (1kg alimento) / gratuita / com custo?
5. **Horários de funcionamento** completos (almoço fecha? sábado? dias fechados na semana?)
6. **Convênios:** aceita ou não (se não: nunca mencionar)
7. **Dados para agendamento:** padrão v3 é **Nome Completo + Telefone com DDD** (+ Bairro se a clínica pedir). ❌ Nunca coletar data de nascimento, e-mail ou CPF, salvo exigência explícita da clínica.
8. **Filtros:** idade mínima? atende odontopediatria? bloqueio de dias recentes?
9. **Campanha ativa?** → trigger na primeira mensagem + `Registrar_Origem` (ver `references/diferenciais.md`)
10. **Sistema de agenda:** Clinicorp via n8n? → coletar subscriber_id, business_id, link_agenda, IDs dos profissionais (ver `references/integracao-n8n.md`)
11. **Duas unidades? Dois agentes com nomes diferentes?** → ver `references/diferenciais.md` e `references/arquitetura.md`

### Etapa 2 — Configuração (sempre primeiro)

```
[PREFIX]_objetivo_agente.md
[PREFIX]_persona_[nome].md            ← novo na v3 (identidade humanizada)
[PREFIX]_regras_sistema_constraints.md
[PREFIX]_habilidades_tags_estrutura.md
[PREFIX]_BK_localizacao.csv           ← BK agora em .csv
[PREFIX]_BK_estrutura.csv
[PREFIX]_BK_objecoes.csv
[PREFIX]_BK_feriados.csv              ← novo na v3 (feriados nacionais do ano)
```

### Etapa 3 — Estágios E0 a E12

- E0 vai no **início** do prompt; E11 no **final**.
- `Salvar_Contexto` é acionado em **toda transição de estágio** (não só nos eventos finais) — ver `references/memoria.md`.
- Todos os estágios usam os blocos `#I` (Intenção), `#D` (Detalhes), `#A` (Ações/Habilidades), `#P` (Pré-requisitos, opcional) e `#L` (Limites).

### Etapa 4 — Integração n8n (se Clinicorp)

Configurar workflow de agendamento com webhook + roteamento por `acao_fluxo`. Ver `references/integracao-n8n.md`.

Se a clínica também tiver painel de CRM na Helena e quiser que agendamento/remarcação/cancelamento movam o card e etiquetem o contato, portar o subsistema descrito em `references/integracao-crm-cards.md` (fan-out a partir dos nós que confirmam a operação na Clinicorp).

### Etapa 5 — Duplicação (quando há dois agentes)

Duplicar todos os arquivos com novo prefixo e substituir apenas o nome do agente. Ver `references/arquitetura.md` para evitar colisões no nome das CRCs.

---

## Regras Globais Imutáveis

Aplicam-se a **todos** os agentes sem exceção:

- Máximo **120 caracteres por fragmento** de mensagem (limite unificado na v3)
- Uma pergunta por mensagem — aguardar resposta
- ❌ Nunca travessão ( — ) nas mensagens ao paciente — usar vírgulas
- ❌ Nunca reticências (...) artificiais
- ❌ Nunca asteriscos para negrito nas mensagens ao paciente
- ❌ Nunca revelar que é IA — o agente é sempre humano
- Máximo 2 emojis por mensagem
- Emoji 🙋‍♀️ reservado exclusivamente para "você é robô?"
- Regra de fragmentação: a cada emoji, encerrar a mensagem e enviar a próxima
- Transbordo: sempre pelo nome/cargo da humana ("a Joana", "a supervisora"), nunca "um humano"
- **Escuta ativa específica:** proibido validar com frases genéricas ("Faz sentido", "Entendo", "Que legal") — sempre mencionar algo específico que o lead disse
- ❌ Nunca citar o nome do dentista antes do agendamento confirmado — usar "dentista responsável" e, após retorno do sistema, `{{nome_profissional_sugerido}}`
- Fuso horário: Brasília (America/Sao_Paulo)

---

## Habilidades Padrão

**Agendamento (Acionar API):** `verificar_disponibilidade`, `realizar_agendamento`, `remarcar_agendamento`, `cancelar_agendamento`, `verificar_agendamento_paciente`

**Contato:** `alterar_campo_contato`, `transferir_atendimento`, `concluir_atendimento`

**Comprometimento:** `Confirmar_Compromisso_Honra`

**Memória de Longo Prazo:**
- `Ler_Contexto` → E0 (primeiro passo, silêncio total) e E12; resultado define Caminho A/B/C
- `Salvar_Contexto` → em **toda transição de estágio** + eventos (E5/E10 agendou, E6 remarcou/cancelou, E8 finalizou, E9 objeção irredutível, E12 follow-up) — formato de campos semânticos, ver `references/memoria.md`
- `Registrar_Origem` → **apenas E0**, quando a primeira mensagem contém trigger de campanha

**Kanban (somente agendamento):** `Cliente Agendou - IA`

**Tags de evento:** `tag_Agendou`, `tag_Remarcou`, `tag_Cancelou`, `tag_Alerta` (antes de transferir em situações críticas), `tag_Campanha[Nome]` (adesão a campanha, ex: `tag_CampanhaSorriso`)

**Classificação (E1):** `Marcar_Dor_Estetica`, `Marcar_Dor_Mastigacao`, `Classificar_Urgencia_Alta`, `Classificar_Urgencia_Baixa`

**Reengajamento (fluxo externo):** `Lead Esfriando`

---

## Tipos de Habilidade no WTS

| Tipo | Uso | Campo de descrição |
|---|---|---|
| **Etiquetas do contato** | Tags de conversão, perfil de dor, urgência, alerta, campanha | "Definição de uso" |
| **Acionar API** | Agendamento, memória (Ler_Contexto, Registrar_Origem), comprometimento | "Descrição" |
| **Alterar campo do contato** | Salvar nome (`Nome`), salvar contexto (`Notas Internas`) | "Definição de uso" |
| **Habilidade de sistema** | transferir, concluir, kanban | Não tem campo editado |

**Regra universal:** toda habilidade deve ter **"Executar sem responder ao cliente" = SIM**, exceto `verificar_disponibilidade`, `realizar_agendamento`, `remarcar_agendamento`, `cancelar_agendamento` e `verificar_agendamento_paciente` (essas aguardam retorno visível).

**`Salvar_Contexto`** é configurado como **Alterar campo do contato** com o campo **Notas Internas** — não como Acionar API.

---

## Sequências Obrigatórias

**Agendamento (E5 e E10):**
`verificar_disponibilidade` (feita no E4) → Pacto de Honra → "Sim" → `Confirmar_Compromisso_Honra` → `realizar_agendamento` → `tag_Agendou` → `Cliente Agendou - IA` → `Salvar_Contexto` → E8

**Remarcação (E6):**
`verificar_disponibilidade` → Pacto atualizado → "Sim" → `remarcar_agendamento` → `tag_Remarcou` → `Salvar_Contexto` → E8

**Cancelamento (E6, após 3 tentativas de retenção):**
`cancelar_agendamento` → `tag_Cancelou` → `Salvar_Contexto` → E8

**Finalização (E8):**
[despedida enviada] → `Salvar_Contexto` → `concluir_atendimento`

**Escalação por loop de datas (E4/E6):**
[3ª data consecutiva sem disponibilidade] → `tag_Alerta` → `transferir_atendimento`

**Erro de `realizar_agendamento`:**
mensagem de probleminha técnico → `transferir_atendimento`

---

## Pacto de Honra — Formato Padrão v3

```
Confirma os dados abaixo por favor 👇
📝 Nome: {{[Nome Completo]}}
📞 Telefone: {{[Telefone com DDD]}}
📅 Agenda: {{[Dia da semana]}}, {{[Data]}} às {{[Horário]}}
📍 [Clínica], [Cidade]/[UF]
```

Variações: `🏘️ Bairro` (se coletado, ex: Vassoler), `🏥 Unidade` (se duas unidades), `👤 Responsável` + `👶 Criança` (se infantil).
❌ Sem data de nascimento no padrão v3. Aguardar "Sim" explícito antes de qualquer ação de sistema.

---

## Vocabulário de Avaliação

| Tipo | Usar | Proibido |
|---|---|---|
| Voucher de campanha (OB) | "faz parte de uma condição especial da nossa campanha", "não há custo nesse primeiro momento", "voucher da consulta" | "grátis", "gratuita", "sem compromisso" |
| Cortesia solidária (Vassoler) | "cortesia solidária", "contribuição de 1kg de alimento não perecível" | "gratuita", "grátis", "sem custo", "totalmente gratuita" |
| Cortesia | "Cortesia da clínica" | "gratuita", "grátis", "sem custo" |
| Gratuita | "gratuita", "sem custo" | "grátis" |
| Com custo | "R$ [valor], descontado no tratamento" | "gratuita", "grátis" |

**Regra universal:** nunca "grátis" em nenhuma clínica. Valor de tratamento: nunca informar — "o valor é personalizado, na avaliação o dentista responsável apresenta as condições".

---

## E6 — Retenção (regra crítica)

- **Remarcação — Resistência Obrigatória:** tentar manter horário atual ao menos 1 vez ANTES de aceitar mudança ("o dentista responsável já deixou tudo separado...")
- **Cancelamento — 3 tentativas obrigatórias:**
  - 1ª: empatia + oferta de remarcar
  - 2ª: reforço de valor (citar a dor do lead) + vaga reservada
  - 3ª: porta aberta + confirmação final
- ❌ Nunca abrir com "Claro!", "Sem problema!"
- ❌ Nunca oferecer hoje se paciente declarou impedimento para hoje
- ❌ Após 3 datas sem disponibilidade: `tag_Alerta` → `transferir_atendimento`
- Tags e kanban só após retorno de **sucesso** da habilidade de sistema
- Remarcação e cancelamento são **operação do agente** — nunca transbordar esses casos, exceto erro técnico
