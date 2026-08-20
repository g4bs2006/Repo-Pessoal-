# HABILIDADES E ESTRUTURA — Clarisse | Scopel Odontologia

Padrão Luna (v4). **Inventário fechado:** a Clarisse aciona exatamente **11 habilidades** — 8 configuradas no WTS mais as 3 nativas de sistema. Qualquer coisa fora desta lista é erro de configuração.

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
| 9 | `transferir_atendimento` | Sistema | — | transbordo, constraints §9 |
| 10 | `transferir_atendimento_paciente` | Sistema | — | E0 Caminho C, E7 cenário B |
| 11 | `concluir_atendimento` | Sistema | — | E8, e E9 na 3ª objeção |

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

- **Pré-condição:** horário confirmado por `verificar_disponibilidade` + dados obrigatórios completos (constraints §11) + **"Sim" explícito** no Pacto de Honra.
- **Parâmetros:** `nome_cliente`, `telefone_cliente` (só números), `data_iso`, `horario_preferido`, `bairro_cliente`, `spin`, `id_atendimento`.
- **Depois:** sucesso → `Salvar_Contexto` → E8. Erro → transbordo (constraints §9).

> **Descrição para colar no WTS:**
> OBRIGATÓRIO: acione somente depois de ter o nome completo e o bairro do paciente, o telefone dele confirmado no Pacto de Honra, e o "Sim" explícito ao Pacto. O telefone chega pelo WhatsApp: confirme, não pergunte. O telefone vai apenas com números. Fique em silêncio após acionar e aguarde o retorno. Somente com retorno de SUCESSO o agendamento está confirmado, nunca confirme ao paciente antes disso. No campo de resumo, escreva para o dentista: a dor relatada, uma frase marcante nas palavras do próprio paciente, o nível de urgência e o que motivou o contato. Se o paciente pediu um profissional específico, registre a preferência nesse mesmo campo. Após o sucesso, grave a memória com Salvar_Contexto e siga para a finalização. Em caso de erro, avise que houve um probleminha técnico e transfira para a Emily.
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
> OBRIGATÓRIO: acione **uma única vez por atendimento**, sempre antes de enviar qualquer mensagem, em três situações: (1) o paciente enviou a primeira mensagem do atendimento; (2) a primeira coisa que ele mandou foi uma pergunta sobre um agendamento que já existe; (3) você vai iniciar um follow-up por conta própria, sem o paciente ter escrito. Execute em silêncio total e aguarde o retorno completo. O retorno traz o que aconteceu em atendimentos anteriores. Use-o para decidir a abertura: se indicar agendamento ativo, não repita o funil de vendas e ofereça apoio; se trouxer histórico, retome de onde parou sem pedir o nome de novo; se vier vazio, trate como paciente novo; se for follow-up, leia o texto da última mensagem que você enviou e não repita a mesma. Nunca invente dados, baseie-se apenas no retorno. Depois de ler uma vez, não acione de novo no mesmo atendimento — a conversa em andamento você já conhece.
> **Executar sem responder ao cliente:** SIM

### 2.2 `Salvar_Contexto` (Alterar campo do contato → Notas Internas)

**Quando acionar:** nos 6 momentos decisivos, **e sempre antes de todo transbordo**. A lista dos 6 e a estrutura da nota são do E11 — ver `SCO_estagio_11_memoria.md`.

❌ Não salvar em transição de estágio. Estado no meio do funil é transitório e nunca vai ser lido.

> **Descrição para colar no WTS:**
> OBRIGATÓRIO: esta habilidade grava a memória de longo prazo do paciente. Acione-a quando o atendimento chegar a uma definição: agendamento confirmado, remarcação, cancelamento, objeção sem retorno, finalização, ou follow-up enviado. Acione também antes de transferir para um humano, registrando o motivo do alerta. Nunca encerre um atendimento sem executá-la. Preencha o campo de texto conforme as regras do Estágio 11.
> **Executar sem responder ao cliente:** SIM

---

## 3. Contato

### 3.1 `alterar_campo_contato (Nome)`

> **Descrição para colar no WTS:**
> Acione imediatamente após o paciente informar o nome, em silêncio. Salve exatamente como ele escreveu. Depois use o primeiro nome naturalmente na conversa.
> **Executar sem responder ao cliente:** SIM

---

## 4. Sistema

### 4.1 `transferir_atendimento`

Escalonamento por atrito ou erro. A ordem, as situações e a frase exata são de `SCO_regras_sistema_constraints.md`, seção 9.

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
| `Registrar_Origem` | a origem, registrada na nota + automação de origem de lead no n8n (`SESSION_NEW`) |
| `Confirmar_Compromisso_Honra` | o próprio Pacto de Honra — o "Sim" explícito **é** o compromisso, e é pré-condição de `realizar_agendamento` |
| `tag_Agendou` | n8n, cadeia Agendar (`agendado_contact_tag_id`) |
| `tag_Remarcou` | n8n, cadeia Remarcar (`remarcado_contact_tag_id`) |
| `tag_Cancelou` | n8n, cadeia Cancelar (`cancelado_contact_tag_id`) |
| `Cliente Agendou - IA` (kanban) | n8n move o card para `agendado_step_id` e aplica `ia_card_tag_id` |
| `tag_Campanha[Nome]` | a origem, registrada na nota |
| `Marcar_Dor_Estetica` / `Marcar_Dor_Mastigacao` | a dor, narrada na nota com as palavras do lead |
| `Classificar_Urgencia_Alta` / `Classificar_Urgencia_Baixa` | a urgência e seu motivo, narrados na nota |
| `tag_Alerta` | o motivo do alerta, registrado na nota antes do transbordo |
| `Ler_Etiqueta` | removida — o `Ler_Contexto` do E0 já traz o que a Clarisse precisa para escolher o caminho |
| `Lead Esfriando` | permanece **fora** do agente: é gatilho de fluxo externo, nunca foi habilidade do prompt |

> A única reintrodução aceitável seria `tag_Alerta`, se a Scopel precisar do alerta visível como etiqueta colorida no painel. É a única sem evento equivalente no n8n, porque transbordo não passa pela Clinicorp. Nesse caso ela entra **dentro** da ordem de transbordo das constraints §9 (nota → frase → habilidades), somando-se ao registro do alerta na nota, nunca substituindo-o. Decidir com a clínica, não sozinho.

---

## 6. Nota de arquitetura

Nenhuma sequência desta lista tem mais de 4 elos — a pré-condição e o "Depois" de cada habilidade acima já a descrevem por inteiro, e é ali que ela vive. O n8n aplica etiqueta e move card em paralelo; a Clarisse não faz nada disso.
