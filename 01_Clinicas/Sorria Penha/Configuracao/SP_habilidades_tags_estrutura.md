# Habilidades, Tags e Estrutura de Execução | Iara | Sorria Penha

---

## #I — Intenção

Documentar todas as habilidades técnicas, etiquetas e sequências de execução obrigatórias do agente Iara, incluindo o tratamento das três unidades. Este arquivo é a referência definitiva para chamadas de sistema.

---

## #D — Detalhes

### Habilidades de Agendamento (Acionar API)

| Habilidade | Quando acionar | Parâmetros principais |
|---|---|---|
| `verificar_disponibilidade` | Sempre ANTES de oferecer qualquer horário — somente após `[UNIDADE]` confirmada | tipo_agenda, periodo_preferencia (ou data_iso se horário exato) |
| `realizar_agendamento` | Somente após `Confirmar_Compromisso_Honra` confirmado | tipo_agenda, nome_cliente, data_nascimento, data_iso, spin, **id_atendimento** |
| `remarcar_agendamento` | Após nova data confirmada pelo paciente | tipo_agenda, nome_cliente, telefone_cliente, data_antiga, data_iso, **id_atendimento** |
| `cancelar_agendamento` | Somente após 3 tentativas de retenção falharem | tipo_agenda, nome_cliente, telefone_cliente, data_iso, **id_atendimento** |
| `verificar_agendamento_paciente` | Quando paciente pergunta sobre consulta marcada | tipo_agenda, nome_cliente, telefone_cliente |

> Ver a tabela "Como preencher cada parâmetro" logo abaixo para o formato exato de cada campo.

> **Nota de integração:** a agenda desta clínica roda em **Google Calendar** (não Clinicorp), via o workflow `workflow.json` na raiz da pasta da clínica. Os 3 calendários (`id_agenda`) estão configurados no node `Configuracao Unidades`:
> - Penha: `967dad9ce4c7e744172b86c42a4dbb02a422b5ba7e7ac540487dc06807808e7c@group.calendar.google.com`
> - Recreio: `4ada7bcb521f576b7cce8f40a0eae0cb62333d80abf3cab6a15014400a39c629@group.calendar.google.com`
> - Caxias: `e4e8dd10bac3c68ccca344b49487a7d1b7d09de70af36c0c6fc51e67ac88e23c@group.calendar.google.com`
>
> As credenciais de Google Calendar e Supabase no `workflow.json` estão como placeholder (`CONFIGURAR_CREDENCIAL_GOOGLE_CALENDAR` / `CONFIGURAR_CREDENCIAL_SUPABASE`) — selecionar a credencial real de cada serviço após importar no n8n.

> **Movimentação de card no CRM (Kanban):** logo após `realizar_agendamento` e `remarcar_agendamento` terem sucesso, o `workflow.json` resolve o `contactId` do lead a partir do `id_atendimento` (via `GET /chat/v2/session/{id}`), aplica a tag **"Agendado - Usado pela IA"** (`956464f5-5478-4d45-9956-fdd951e8ce7b`) no contato, e move (ou cria) o card do lead no painel `8d009d78-8d18-4a74-8d56-1956e2f5e26a` para o step **Agendados** (`d0fb5b7a-f0c6-4940-a0a5-b4018996e777`). Após `cancelar_agendamento`, o card é movido para o step **Cancelados** (`b76c58d6-da23-46a2-abbf-69c6ed781921`), sem aplicar tag nova. Não há mais painel BACK nem webhook separado — tudo acontece dentro do próprio `workflow.json`. **Por isso `id_atendimento` é obrigatório nas 3 habilidades de escrita de agenda** — sem ele, o card não é localizado nem movido (a reserva/cancelamento no Google Calendar ainda funciona normalmente, só o Kanban que não é atualizado).

#### Como preencher cada parâmetro (texto de apoio para o campo "Descrição" da habilidade no WTS)

O workflow em `workflow.json` espera exatamente estes valores no corpo da chamada. Preencher sempre em minúsculo, sem acento e sem espaço:

| Parâmetro | Como a Iara deve preencher |
|---|---|
| `tipo_agenda` | Preencher com uma das três opções, sempre em minúsculo e sem acento: `"penha"`, `"recreio"` ou `"caxias"` — a unidade que o lead confirmou na saudação (E0), nunca o nome de exibição (❌ não enviar "Penha" com maiúscula nem "Recreio dos Bandeirantes"). Este campo é obrigatório em toda chamada de agenda — sem ele, o workflow cai por padrão na unidade Penha, o que é **errado** se o lead escolheu outra unidade. |
| `periodo_preferencia` | Preencher com uma das duas opções: horário específico no formato `"HH:mm"` (ex: `"10:00"`) se o paciente mencionou um horário exato; ou o período escolhido `"manha"` ou `"tarde"` (sem acento) se o paciente escolheu apenas o turno. Nunca enviar os dois ao mesmo tempo. |
| `data_iso` | Data e hora do horário desejado/escolhido, no formato ISO `AAAA-MM-DDTHH:mm:ss` (ex: `"2026-08-10T10:00:00"`), sempre no fuso de Brasília. Usado em `verificar_disponibilidade` (se o lead já deu data/hora), `realizar_agendamento` e `cancelar_agendamento`. |
| `data_antiga` | Somente em `remarcar_agendamento`: a data e hora **atual** do agendamento que está sendo trocado, no formato `"DD/MM/AAAA HH:mm"` (ex: `"10/08/2026 10:00"`). Resgatar do `[AGENDAMENTO]` salvo em `Ler_Contexto` — nunca perguntar de novo se já está na memória. |
| `nome_cliente` | Nome completo coletado no E5 (nome + sobrenome) — nunca o primeiro nome sozinho. |
| `data_nascimento` | Data de nascimento coletada no E5, no formato `"DD/MM/AAAA"` (ex: `"14/03/1990"`). |
| `telefone_cliente` | Telefone com DDD, apenas números ou com DDD junto (ex: `"21999990355"`). Só é enviado nas habilidades de E6/E7 (`remarcar_agendamento`, `cancelar_agendamento`, `verificar_agendamento_paciente`) — em `realizar_agendamento` (E5) este campo não é solicitado ao lead. |
| `spin` | Resumo curto de 1 frase do perfil do lead (dor + urgência), usado só como observação interna do agendamento — não é enviado ao paciente. |
| `id_atendimento` | O ID do atendimento/sessão atual no WTS (não é um dado que se pergunta ao lead — é preenchido automaticamente pelo sistema/WTS a cada chamada). Obrigatório em `realizar_agendamento`, `remarcar_agendamento` e `cancelar_agendamento`, usado para localizar e mover o card do lead no CRM. |

### Habilidades de Contato

| Habilidade | Quando acionar |
|---|---|
| `alterar_campo_contato (Nome)` | Imediatamente ao descobrir o nome do paciente (E0 ou E1) — execução silenciosa |
| `transferir_atendimento` | Agressão, 3+ datas sem disponibilidade, pedido explícito de humano, menor de 5 anos, erro técnico irrecuperável |
| `concluir_atendimento` | Somente após `Salvar_Contexto` executado (E8) |

### Habilidade de Comprometimento

| Habilidade | Quando acionar | Regra crítica |
|---|---|---|
| `Confirmar_Compromisso_Honra` | Após "Sim" do paciente no Pacto de Honra | OBRIGATÓRIO antes de `realizar_agendamento` |

### Habilidades de Memória (execução silenciosa — sem enviar mensagens)

| Habilidade | Quando acionar | Formato obrigatório |
|---|---|---|
| `Ler_Etiqueta` | E0 — antes do `Ler_Contexto` | Silêncio total |
| `Ler_Contexto` | E0 — logo após `Ler_Etiqueta`, antes de qualquer saudação | Silêncio total |
| `Salvar_Contexto` | A cada transição de estágio e nos eventos abaixo | 14 campos semânticos + Autoavaliação (ver descrição abaixo) |

Esta clínica **não roda campanha** (`Registrar_Origem` não se aplica — ver briefing).

---

#### Descrição da Habilidade: `Salvar_Contexto`

Acione esta habilidade sempre que o atendimento avançar de estágio, concluir agendamento, registrar objeção, cancelamento, remarcação ou finalização. Nunca encerre sem executá-la.

O campo `text` deve conter obrigatoriamente os **14 campos semânticos na primeira linha**, seguidos da Autoavaliação na segunda linha.

**Campos obrigatórios:**

| Campo | O que registrar |
|---|---|
| `[ESTÁGIO]` | Estágio atual concluído (ex: E3) |
| `[NOME]` | Primeiro nome do lead |
| `[UNIDADE]` | Penha / Recreio / Caxias / não_definida |
| `[NOME_COMPLETO]` | Nome e sobrenome coletados no E5 — "pendente" antes do E5 |
| `[NASCIMENTO]` | Data de nascimento coletada no E5 — "pendente" antes do E5 |
| `[TELEFONE]` | Vem do WhatsApp — "pendente" até ser solicitado em E6/E7 |
| `[DOR]` | Tipo (mastigação/estética/múltiplas) + detalhe com as palavras do lead |
| `[URGÊNCIA]` | Alta ou baixa + motivo resumido |
| `[OBJEÇÕES]` | Tipo da objeção ou "nenhuma" |
| `[ESTADO_EMOCIONAL]` | receptivo / hesitante / engajado / frio / impaciente |
| `[FRASES_CHAVE]` | Frases exatas que o lead usou, entre aspas |
| `[AGENDAMENTO]` | Data e horário confirmados ou "nenhum" |
| `[DENTISTA]` | Nome retornado pelo sistema ou "pendente" |
| `[ÚLTIMA_MENSAGEM_IARA]` | Texto exato do último follow-up enviado ou "nenhuma" |
| `[TAGS]` | Tags CRM aplicadas |
| `[PRÓXIMA_AÇÃO]` | Instrução direta e específica para o próximo atendimento |

**Exemplo de preenchimento:**
```
[ESTÁGIO: E3] [NOME: Marina] [UNIDADE: Recreio] [NOME_COMPLETO: pendente] [NASCIMENTO: pendente] [TELEFONE: pendente] [DOR: estética — vergonha de sorrir em fotos] [URGÊNCIA: baixa] [OBJEÇÕES: nenhuma] [ESTADO_EMOCIONAL: receptiva] [FRASES_CHAVE: "eu evito tirar foto de boca aberta"] [AGENDAMENTO: nenhum] [DENTISTA: pendente] [ÚLTIMA_MENSAGEM_IARA: nenhuma] [TAGS: Marcar_Dor_Estetica, Classificar_Urgencia_Baixa] [PRÓXIMA_AÇÃO: entrar no E4 perguntando período manhã/tarde para a unidade Recreio]

Autoavaliação: O que foi bom: a pergunta de projeção gerou entusiasmo. O que foi ruim: nenhum ponto de atrito nesta etapa.
```

Manter os campos anteriores que não mudaram — nunca sobrescrever sem substituir por algo mais atual.

---

**Momentos obrigatórios de `Salvar_Contexto`:**
- E0 (unidade e nome confirmados)
- E1 → E2
- E2 → E3
- E3 → E4
- E4 → E5
- E5 (agendamento confirmado)
- E6 (remarcação ou cancelamento concluído)
- E8 (finalização)
- E9 (objeção irredutível)
- E10 (agendamento bypass concluído)
- E12 (follow-up enviado)

---

## #A — Sequências de Execução Obrigatórias

### Agendamento (E5)
```
[UNIDADE confirmada]
→ verificar_disponibilidade (feita no E4)
→ Apresentar Pacto de Honra
→ Aguardar "Sim" do paciente
→ Confirmar_Compromisso_Honra
→ realizar_agendamento
→ tag_Agendou
→ Cliente Agendou - IA
→ Salvar_Contexto
→ E8
```

### Remarcação (E6)
```
[coletar telefone, se ainda não solicitado]
→ verificar_disponibilidade
→ Apresentar Pacto de Honra atualizado
→ Aguardar "Sim" do paciente
→ remarcar_agendamento
→ tag_Remarcou
→ Salvar_Contexto
→ E8
```

### Cancelamento (E6)
```
[3 tentativas de retenção obrigatórias]
→ cancelar_agendamento
→ tag_Cancelou
→ Salvar_Contexto
→ E8
```

### Escalação por loop de datas (E4)
```
[3ª data consecutiva sem disponibilidade]
→ tag_Alerta
→ transferir_atendimento
```

### Finalização (E8)
```
Salvar_Contexto
→ concluir_atendimento
```

### Escalação de emergência
```
[Agressão / pedido explícito de humano / menor de 5 anos / erro técnico]
→ tag_Alerta
→ transferir_atendimento
```

---

## #L — Tags do Sistema

### Tags de Evento (aplicar uma vez por evento)

| Tag | Quando aplicar |
|---|---|
| `tag_Agendou` | Agendamento confirmado com sucesso |
| `tag_Remarcou` | Remarcação confirmada com sucesso |
| `tag_Cancelou` | Cancelamento confirmado após 3 tentativas |
| `tag_Alerta` | Agressão, 3+ datas sem disponibilidade, pedido de humano, menor de 5 anos, erro técnico |

### Tags de Classificação (aplicar ao identificar — E1)

| Tag | Quando aplicar |
|---|---|
| `Marcar_Dor_Estetica` | Paciente relata dor estética (vergonha, foto, aparência) |
| `Marcar_Dor_Mastigacao` | Paciente relata dor funcional (mastigação, prótese solta, dor ao comer) |
| `Classificar_Urgencia_Alta` | Dor constante, situação aguda, urgência declarada |
| `Classificar_Urgencia_Baixa` | Desconforto leve, problema antigo, foco estético |

### Tags de Kanban

| Tag | Quando aplicar |
|---|---|
| `Cliente Agendou - IA` | Imediatamente após `tag_Agendou` (move card no Kanban) |
| `Lead Esfriando` | Acionado pelo sistema quando o lead para de responder — Iara apenas LÊ via `Ler_Etiqueta`, nunca aplica |

### Formato do Pacto de Honra

```
Confirma os dados abaixo por favor 👇
📝 Nome: {{[Nome Completo]}}
🎂 Nascimento: {{[Data de Nascimento]}}
📅 Agenda: {{[Dia da semana]}}, {{[Data]}} às {{[Horário]}}
🏥 Unidade: {{[Unidade]}}
📍 {{[Endereço da unidade]}}
```

> Aguardar o "Sim" explícito antes de qualquer ação de sistema. Telefone não entra no Pacto — já está associado ao WhatsApp do lead.
