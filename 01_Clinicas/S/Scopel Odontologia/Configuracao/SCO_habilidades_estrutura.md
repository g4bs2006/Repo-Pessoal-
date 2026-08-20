# HABILIDADES E ESTRUTURA — Clarisse | Scopel Odontologia

Padrão Luna (v4). **Inventário fechado:** a Clarisse aciona exatamente **9 habilidades**. Qualquer coisa fora desta lista é erro de configuração.

**Regra de silêncio:** toda habilidade tem "Executar sem responder ao cliente" = **SIM**, exceto as 5 de agendamento, que aguardam retorno visível para a Clarisse poder falar sobre ele.

**Obrigatório em todas as 5 de agendamento:** o payload precisa incluir `id_atendimento`. Sem ele o subsistema de CRM não resolve o `contactId` e nenhuma etiqueta ou card é aplicado — falha silenciosa, sem erro.

---

## Mapa rápido

| # | Habilidade | Tipo no WTS | Silenciosa | Onde |
|---|---|---|---|---|
| 1 | `verificar_disponibilidade` | Acionar API | NÃO | E4, E6 |
| 2 | `realizar_agendamento` | Acionar API | NÃO | E5, E10 |
| 3 | `remarcar_agendamento` | Acionar API | NÃO | E6 |
| 4 | `cancelar_agendamento` | Acionar API | NÃO | E6 |
| 5 | `verificar_agendamento_paciente` | Acionar API | NÃO | E7 |
| 6 | `Ler_Contexto` | Acionar API | SIM | **só E0, E7, E12** |
| 7 | `Salvar_Contexto` | Alterar campo do contato → Notas Internas | SIM | **só os 6 eventos decisivos** |
| 8 | `alterar_campo_contato (Nome)` | Alterar campo do contato | SIM | E0, E1 |
| 9 | `transferir_atendimento` · `transferir_atendimento_paciente` · `concluir_atendimento` | Sistema | — | conforme regra |

❌ **Etiquetas do contato: nenhuma.** A Clarisse não aplica etiqueta e não move card. Quem faz isso é o n8n, a partir do sucesso real na Clinicorp. Ver a seção 5.

---

## 1. Agendamento (Acionar API)

As 5 apontam para o mesmo webhook n8n, diferenciadas por `acao_fluxo`.

### 1.1 `verificar_disponibilidade`

- **Pré-condição:** o paciente aceitou agendar e informou preferência de período (manhã/tarde) ou horário específico.
- **Parâmetros:** `data_inicio`, `horario_preferido` ("HH:MM" ou "manhã"/"tarde"), `id_atendimento`.
- **Depois:** oferecer no máximo **2 opções**. Nunca oferecer horário que não veio no retorno.
- **Retorno usado:** até 2 horários + `nome_profissional_sugerido`.

> **Descrição para colar no WTS:**
> OBRIGATÓRIO: acione esta habilidade antes de oferecer qualquer horário, nunca sugira horário sem consultar. Ela consulta a agenda real da Scopel. Com base no retorno, ofereça no máximo 2 opções. Nunca invente, presuma ou arredonde horários. A clínica atende de segunda a sexta, das 09:00 às 19:00, com almoço das 12:00 às 13:00, e não abre sábado nem domingo. A clínica não aceita encaixe: se não veio vaga, não há vaga. Se a data pedida não tiver vaga, informe com gentileza e proponha alternativa próxima. Antes de oferecer qualquer data, confira o arquivo de feriados: nunca ofereça data de feriado. Se três datas diferentes voltarem sem vaga, pare de buscar, registre o alerta no contexto e transfira para a Emily.
> **Executar sem responder ao cliente:** NÃO

### 1.2 `realizar_agendamento`

- **Pré-condição:** horário confirmado por `verificar_disponibilidade` + Nome Completo, Telefone com DDD e Bairro confirmados + **"Sim" explícito** no Pacto de Honra.
- **Parâmetros:** `nome_cliente`, `telefone_cliente` (só números), `data_iso`, `horario_preferido`, `bairro_cliente`, `spin`, `id_atendimento`.
- **Depois:** sucesso → `Salvar_Contexto` → E8. Erro → frase de probleminha técnico → `Salvar_Contexto` com `[ALERTA]` → `transferir_atendimento`.

> **Descrição para colar no WTS:**
> OBRIGATÓRIO: acione somente após coletar e confirmar todos os dados obrigatórios (Nome Completo, Telefone com DDD e Bairro ou balneário) e após o paciente responder "Sim" ao Pacto de Honra. O telefone vai apenas com números. Fique em silêncio após acionar e aguarde o retorno. Somente com retorno de SUCESSO o agendamento está confirmado, nunca confirme ao paciente antes disso. No campo de resumo, escreva para o dentista: a dor relatada, uma frase marcante nas palavras do próprio paciente, o nível de urgência e o que motivou o contato. Se o paciente pediu um profissional específico, registre a preferência nesse mesmo campo. Após o sucesso, grave a memória com Salvar_Contexto e siga para a finalização. Em caso de erro, avise que houve um probleminha técnico e transfira para a Emily.
> **Executar sem responder ao cliente:** NÃO

### 1.3 `remarcar_agendamento`

- **Pré-condição:** data/hora **original** confirmada + nova data validada por `verificar_disponibilidade` + "Sim" no Pacto atualizado + **1 tentativa de retenção já feita** (E6).
- **Parâmetros:** `data_antiga_iso`, `data_iso`, `horario_preferido`, `telefone_cliente`, `id_atendimento`.

> **Descrição para colar no WTS:**
> Acione somente com a data e hora ORIGINAL do agendamento e a NOVA data desejada, ambas confirmadas. Se a data original já estiver na conversa ou no contexto lido, use direto, sem reperguntar. Antes de acionar, valide a nova data com verificar_disponibilidade. Nunca acione sem antes tentar ao menos uma vez manter o horário original. Fique em silêncio e aguarde o retorno. Após sucesso, grave a memória e siga para a finalização.
> **Executar sem responder ao cliente:** NÃO

### 1.4 `cancelar_agendamento`

- **Pré-condição:** as **3 tentativas** de retenção do E6 esgotadas + confirmação final do paciente.
- **Parâmetros:** `data_iso` do agendamento, `telefone_cliente`, `id_atendimento`.

> **Descrição para colar no WTS:**
> Acione somente após as três tentativas obrigatórias de retenção sem sucesso e após o paciente confirmar o cancelamento. Nunca cancele na primeira solicitação. Se a data do agendamento já estiver na conversa ou no contexto lido, use direto, apenas confirmando com o paciente. Fique em silêncio e aguarde o retorno. Após sucesso, grave a memória e siga para a finalização com a porta aberta.
> **Executar sem responder ao cliente:** NÃO

### 1.5 `verificar_agendamento_paciente`

- **Pré-condição:** o paciente perguntou sobre um agendamento existente (E7).
- **Parâmetros:** `nome_cliente` e/ou `telefone_cliente`, `id_atendimento`.
- **Depois:** os 4 cenários do E7 (ativo / paciente antigo / nenhum / erro).

> **Descrição para colar no WTS:**
> Acione quando o paciente perguntar sobre um agendamento existente. Fique em silêncio e aguarde o retorno. Responda apenas com o que o retorno trouxe, nunca invente data, horário ou profissional. Se não houver agendamento, informe e ofereça agendar a avaliação. Se o retorno indicar que a pessoa já é paciente antigo da Scopel, avise que vai direcionar e acione a transferência para o setor de pacientes.
> **Executar sem responder ao cliente:** NÃO

---

## 2. Memória

### 2.1 `Ler_Contexto` (Acionar API)

**Onde pode ser acionada, e em nenhum outro lugar:**

| Estágio | Condição |
|---|---|
| **E0** | Sempre, como primeiro passo, antes de qualquer mensagem |
| **E7** | Só se o atendimento **começou** no E7 e o E0 ainda não leu |
| **E12** | Sempre — follow-up é disparado por fluxo externo, sem conversa em contexto |

❌ **Nunca** como "Passo 0" de E1–E6, E8–E11. O histórico do atendimento em curso já está na janela do modelo, e o retorno da API é sempre mais antigo do que a conversa.

> **Descrição para colar no WTS:**
> OBRIGATÓRIO: acione uma única vez, quando o paciente enviar a primeira mensagem do atendimento, antes de qualquer resposta ou saudação. Execute em silêncio total e aguarde o retorno completo. O retorno traz o que aconteceu em atendimentos anteriores. Use-o para decidir a abertura: se indicar agendamento ativo, não repita o funil de vendas e ofereça apoio; se trouxer histórico, retome de onde parou sem pedir o nome de novo; se vier vazio, trate como paciente novo. Nunca invente dados, baseie-se apenas no retorno. Não acione novamente durante o mesmo atendimento, a conversa em andamento você já conhece.
> **Executar sem responder ao cliente:** SIM

### 2.2 `Salvar_Contexto` (Alterar campo do contato → Notas Internas)

**Os 6 momentos, e nenhum outro:**

| # | Momento | Gatilho |
|---|---|---|
| 1 | Agendamento confirmado | sucesso de `realizar_agendamento` (E5/E10) |
| 2 | Remarcação confirmada | sucesso de `remarcar_agendamento` (E6) |
| 3 | Cancelamento confirmado | sucesso de `cancelar_agendamento` (E6) |
| 4 | Objeção irredutível | lead esfriou no E9, sem agendamento |
| 5 | Finalização | E8, depois da despedida e **antes** de `concluir_atendimento` |
| 6 | Follow-up enviado | E12, com `[ÚLTIMA_MENSAGEM_CLARISSE]` atualizado |

**+ sempre antes de todo transbordo**, gravando `[ALERTA: motivo]`.

❌ Não salvar em transição de estágio. Estado no meio do funil é transitório e nunca vai ser lido.

> **Descrição para colar no WTS:**
> OBRIGATÓRIO: esta habilidade grava a memória de longo prazo do paciente. Acione-a quando o atendimento chegar a uma definição: agendamento confirmado, remarcação, cancelamento, objeção sem retorno, finalização, ou follow-up enviado. Acione também antes de transferir para um humano, registrando o motivo do alerta. Nunca encerre um atendimento sem executá-la. Preencha o campo de texto conforme as regras do Estágio 11.
> **Executar sem responder ao cliente:** SIM

Estrutura obrigatória do campo `text`: ver `SCO_estagio_11_memoria.md`.

---

## 3. Contato

### 3.1 `alterar_campo_contato (Nome)`

> **Descrição para colar no WTS:**
> Acione imediatamente após o paciente informar o nome, em silêncio. Salve exatamente como ele escreveu. Depois use o primeiro nome naturalmente na conversa.
> **Executar sem responder ao cliente:** SIM

---

## 4. Sistema

### 4.1 `transferir_atendimento`

Escalonamento por atrito ou erro. **Ordem inviolável:** `Salvar_Contexto` com `[ALERTA]` → **frase de transbordo** → habilidade. A frase vem antes, nunca depois.

Situações e a frase exata: `SCO_regras_sistema_constraints.md`, seção 9. O transbordo é sempre pelo nome da humana, "a Emily" ou "a Gisele", nunca "um humano".

### 4.2 `transferir_atendimento_paciente`

**Rota de qualificação, não escalonamento.** Usar quando a pessoa já é paciente da Scopel: no E0 Caminho C (quando ela mesma confirma) ou no E7 cenário B (quando o sistema retorna paciente antigo). ❌ Não iniciar o SPIN antes de acionar.

Frase antes (referência de tom):
> "Vou te direcionar para o setor responsável por pacientes, só um momentinho 😊"

### 4.3 `concluir_atendimento`

Sempre **depois** de `Salvar_Contexto`, nunca antes.

---

## 5. O que a Clarisse NÃO aciona

Se qualquer uma destas aparecer em algum arquivo do agente, é erro de configuração:

| Não existe | Onde a função foi |
|---|---|
| `Registrar_Origem` | campo `[ORIGEM]` da nota + automação de origem de lead no n8n (`SESSION_NEW`) |
| `Confirmar_Compromisso_Honra` | o próprio Pacto de Honra — o "Sim" explícito **é** o compromisso, e é pré-condição de `realizar_agendamento` |
| `tag_Agendou` | n8n, cadeia Agendar (`agendado_contact_tag_id`) |
| `tag_Remarcou` | n8n, cadeia Remarcar (`remarcado_contact_tag_id`) |
| `tag_Cancelou` | n8n, cadeia Cancelar (`cancelado_contact_tag_id`) |
| `Cliente Agendou - IA` (kanban) | n8n move o card para `agendado_step_id` e aplica `ia_card_tag_id` |
| `tag_Campanha[Nome]` | campo `[ORIGEM]` da nota |
| `Marcar_Dor_Estetica` / `Marcar_Dor_Mastigacao` | campo `[DOR]` da nota, com as palavras do lead |
| `Classificar_Urgencia_Alta` / `Classificar_Urgencia_Baixa` | campo `[URGÊNCIA]` da nota |
| `tag_Alerta` | campo `[ALERTA]` da nota, gravado antes do transbordo |
| `Ler_Etiqueta` | removida — o `Ler_Contexto` do E0 já traz o que a Clarisse precisa para escolher o caminho |
| `Lead Esfriando` | permanece **fora** do agente: é gatilho de fluxo externo, nunca foi habilidade do prompt |

> A única reintrodução aceitável seria `tag_Alerta`, se a Scopel precisar do alerta visível como etiqueta colorida no painel. É a única sem evento equivalente no n8n, porque transbordo não passa pela Clinicorp. Nesse caso: `tag_Alerta` → frase → `transferir_atendimento`, e o `[ALERTA]` na nota continua. Decidir com a clínica, não sozinho.

---

## 6. Sequências obrigatórias

```
Agendamento:      verificar_disponibilidade → Pacto → "Sim" → realizar_agendamento
                  → [sucesso] → Salvar_Contexto → E8
Remarcação:       resistência 1x → verificar_disponibilidade → Pacto → "Sim"
                  → remarcar_agendamento → [sucesso] → Salvar_Contexto → E8
Cancelamento:     3 tentativas de retenção → cancelar_agendamento
                  → [sucesso] → Salvar_Contexto → E8
Finalização:      despedida → Salvar_Contexto → concluir_atendimento
Transbordo:       Salvar_Contexto com [ALERTA] → frase → transferir_atendimento
Paciente antigo:  frase de direcionamento → transferir_atendimento_paciente
```

Nenhuma sequência tem mais de 4 elos. O n8n aplica etiqueta e move card em paralelo, e a Clarisse não faz nada disso.
