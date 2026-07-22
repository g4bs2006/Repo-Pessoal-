# HABILIDADES, TAGS E ESTRUTURA
## Iara | Prime Odontocenter

---

## TIPOS DE HABILIDADE NO SISTEMA

O painel possui tipos de habilidade relevantes para este agente:

- **Etiquetas do contato** — adiciona ou remove etiquetas no perfil do contato no CRM.
- **Acionar API** — chama um endpoint externo (como agenda ou automação via N8N) e retorna dados.
- **Alterar campo do contato** — grava ou atualiza um campo no perfil do contato (ex: Nome).
- **Habilidade de sistema** — ação nativa do chat (transferir atendimento, concluir atendimento).

---

## 1. HABILIDADES DE AGENDAMENTO (Tipo: Acionar API)

---

### 1.1 `verificar_disponibilidade`

**Nome da habilidade:** verificar_disponibilidade
**Tipo:** Acionar API

**Descrição (colar no campo Descrição do seu CRM):**
> OBRIGATÓRIO: Acione esta habilidade SEMPRE antes de oferecer qualquer horário ao paciente — nunca sugira um horário sem antes consultar esta ferramenta. Ela consulta a agenda real do Prime Odontocenter e retorna os horários disponíveis. Com base no retorno, ofereça exatamente 2 opções. Nunca invente ou presuma horários. Se a data pedida pelo paciente não tiver vaga, informe com gentileza e proponha alternativas em dias próximos disponíveis. Caso o pedido seja de feriado (ex: 21 de Abril de 2026), não pode ser agendado.

**Executar sem responder ao cliente:** NÃO

---

### 1.2 `realizar_agendamento`

**Nome da habilidade:** realizar_agendamento
**Tipo:** Acionar API

**Descrição (colar no campo Descrição do seu CRM):**
> OBRIGATÓRIO: Acione esta habilidade somente após ter coletado Nome Completo e Data de Nascimento do paciente. Antes de acionar, aguarde o paciente confirmar os dados no Pacto de Honra com "Sim" e certifique-se de executar 'Confirmar_Compromisso_Honra' primeiro. Fique em silêncio após acionar — aguarde o retorno do sistema. Somente após retorno de SUCESSO, considere o agendamento confirmado. Após o sucesso da API, execute imediatamente: Tag_agendado_IA → tag_agendou → AGENDOU (status kanban).

**Executar sem responder ao cliente:** NÃO

---

### 1.3 `remarcar_agendamento`

**Nome da habilidade:** remarcar_agendamento
**Tipo:** Acionar API

**Descrição (colar no campo Descrição do seu CRM):**
> Acione esta habilidade somente quando tiver confirmado: (1) a data e hora ORIGINAL do agendamento — campo data_antiga — e (2) a data e hora NOVA desejada pelo paciente — campo data_alvo, junto de seu Nome Completo e Telefone. Antes de acionar, sempre execute 'verificar_disponibilidade' na nova data. Fique em silêncio após acionar e aguarde o retorno. Após sucesso, siga para a conclusão.

**Executar sem responder ao cliente:** NÃO

---

### 1.4 `cancelar_agendamento`

**Nome da habilidade:** cancelar_agendamento
**Tipo:** Acionar API

**Descrição (colar no campo Descrição do seu CRM):**
> Acione esta habilidade SOMENTE após realizar tentativas obrigatórias de remarcação e retenção no Estágio 4 sem sucesso. Confirme os dados (nome, telefone e data do agendamento que será cancelado) antes de acionar. Fique em silêncio após acionar e aguarde o retorno para informar o cancelamento com porta aberta.

**Executar sem responder ao cliente:** NÃO

---

### 1.5 `verificar_agendamento_paciente`

**Nome da habilidade:** verificar_agendamento_paciente
**Tipo:** Acionar API

**Descrição (colar no campo Descrição do seu CRM):**
> Acione esta habilidade quando o paciente perguntar sobre um agendamento existente para consultar o status. Necessário Nome Completo e Telefone ANTES de consultar. Fique em silêncio após acionar e aguarde. Responda ao paciente APENAS com as informações exatas retornadas.

**Executar sem responder ao cliente:** NÃO

---

## 2. MEMÓRIA DE LONGO PRAZO (Tipo: Acionar API e Alterar Campo)

---

### 2.1 `Ler_Contexto`

**Nome da habilidade:** Ler_Contexto
**Tipo:** Acionar API

**Descrição (colar no campo Descrição do seu CRM):**
> OBRIGATÓRIO: Acione esta habilidade IMEDIATAMENTE na primeira interação de um chat (nova sessão) em silêncio. Em seguida, observe o retorno com histórico (NOME, DOR, MOTIVO, ESTÁGIO). Adapte sua abordagem do Estágio 0 conforme o retorno: retorne do E3, direcione pro fechamento ou reconheça um E9 existente sem repetir seu cumprimento padronizado inicial.

**Executar sem responder ao cliente:** SIM

---

### 2.2 `Salvar_Contexto`

**Nome da habilidade:** Salvar_Contexto
**Tipo:** Alterar campo do contato → **Notas Internas (ou similar)**

**Definição de uso (colar no campo Descrição do seu CRM):**
> Acione esta habilidade sempre que o atendimento avançar em estágios críticos (como a passagem pro Funil E2-E3, ao agendar com sucesso, ou após tratar uma objeção). Substitui as informações atuais, portanto preencha sempre TODOS os parâmetros solicitados: ESTAGIO, NOME, DOR, MOTIVO, URGENCIA, OBJECAO, AGENDAMENTO, TAGS, ACOES_FUTURAS. O campo AGENDAMENTO deve conter data, hora e status (ex: Confirmado, Remarcado). O campo ACOES_FUTURAS deve conter a instrução para a IA no próximo contato. Não encerre sem salvar.

**Executar sem responder ao cliente:** SIM

---

## 3. ALTERAR CAMPO DO CONTATO E COMPROMETIMENTO

---

### 3.1 `alterar_campo_contato`

**Nome da habilidade:** alterar_campo_contato
**Tipo:** Alterar campo do contato → campo: **Nome**

**Definição de uso (colar no campo Definição de uso do seu CRM):**
> Acione esta habilidade IMEDIATAMENTE após o paciente informar o próprio nome. Salve o nome do paciente no sistema. Após receber a confirmação de que foi salvo, a Iara deve a partir daquele momento chamar a pessoa exclusivamente pelo primeiro nome. Execute silenciosamente sem repassar erro.

**Executar sem responder ao cliente:** SIM

---

### 3.2 `Confirmar_Compromisso_Honra`

**Nome da habilidade:** Confirmar_Compromisso_Honra
**Tipo:** Acionar API

**Descrição (colar no campo Descrição do seu CRM):**
> Acione rigorosamente após o paciente dizer "Sim" (ou equivalente) à pergunta formal do Pacto de Honra que consolida todos os dados em formato de bloco antes da consulta final. Esta AÇÃO DEVE vir OBRIGATORIAMENTE antes de invocar a funcionalidade 'realizar_agendamento'.

**Executar sem responder ao cliente:** SIM

---

## 4. TAGS E KANBAN DO SISTEMA

---

### 4.1 `Tag_agendado_IA` e `tag_agendou`

**Tipo:** Etiquetas do contato → Adicionar etiqueta

**Definição de uso:**
> Acione estas tags imediatamente após a API de realizar_agendamento retornar SUCESSO absoluto.

### 4.2 `Marcar_Dor_Estetica` e `Marcar_Dor_Mastigacao`

**Tipo:** Etiquetas do contato → Adicionar etiqueta

**Definição de uso:**
> Acione silenciosamente logo após perguntar ou classificar qual a maior queixa (Situação). Para relatos de vergonha ou sorriso use Estética. Para dor funcional ou prótese solta use Mastigação. Se manifestar ambos, aplique os 2.

### 4.3 `Classificar_Urgencia_Alta` e `Classificar_Urgencia_Baixa`

**Tipo:** Etiquetas do contato → Adicionar etiqueta

**Definição de uso:**
> Acione de acordo com a carga emocional exposta. Alta = forte emoção e incômodo limitante. Baixa = indiferença, tranquilidade, interesse visual fraco sem dor aguda. Execute em segundo plano, sem notificar.

---

## 5. HABILIDADES DE SISTEMA NATIVO (Transferências)

---

### 5.1 `transferir_humano`

**Tipo:** Habilidade de Sistema (Natália/Valéria do Prime)
**Quando acionar:** Paciente solicita expressamente uma atendente, ou envia dúvidas clínicas que Iara está expressamente proibida de responder de forma livre sem voucher. Em todos os casos de transbordo por limite técnico, use.

### 5.2 `concluir_atendimento` e `AGENDOU`

**Tipo:** Habilidade de Sistema (Finalização) e Mover de Fase do Kanban (Agendou)
**Quando acionar:** Acione `AGENDOU` junto às tags após a confirmação total do dia/hora com CRM. E execute finalizar somente quando proferir a despedida amigável na finalização da conversa (E6/E8). Não antes.
