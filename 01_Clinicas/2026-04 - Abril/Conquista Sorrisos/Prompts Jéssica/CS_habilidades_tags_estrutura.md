# HABILIDADES, TAGS E ESTRUTURA
## Jéssica | Conquista Sorrisos

---

## TIPOS DE HABILIDADE NO WTS

O WTS possui 4 tipos de habilidade relevantes para este agente:

- **Etiquetas do contato** — adiciona ou remove etiquetas no perfil do contato.
- **Acionar API** — chama um endpoint externo (n8n ou sistema de agendamento) e retorna dados.
- **Alterar campo do contato** — grava ou atualiza um campo no perfil do contato (Nome, Notas Internas, etc.).
- **Habilidade de sistema** — ação nativa do WTS (transferir, concluir, etc.).

---

## 1. HABILIDADES DE AGENDAMENTO (Tipo: Acionar API)

---

### 1.1 `verificar_disponibilidade`

**Nome da habilidade:** verificar_disponibilidade
**Tipo:** Acionar API

**Descrição (colar no campo Descrição do WTS):**
> OBRIGATÓRIO: Acione esta habilidade SEMPRE antes de oferecer qualquer horário ao paciente — nunca sugira um horário sem antes consultar esta ferramenta. Ela consulta a agenda real da Conquista Sorrisos e retorna os horários disponíveis. Com base no retorno, ofereça exatamente 2 opções: uma pela manhã e uma à tarde. Nunca invente ou presuma horários. Se a data pedida pelo paciente não tiver vaga, informe com gentileza e proponha alternativas dentro das faixas de atendimento definidas nas constraints. Se a data for feriado nacional (consulte CS_BK_feriados.csv), não a ofereça.

**Executar sem responder ao cliente:** NÃO

---

### 1.2 `realizar_agendamento`

**Nome da habilidade:** realizar_agendamento
**Tipo:** Acionar API

**Descrição (colar no campo Descrição do WTS):**
> OBRIGATÓRIO: Acione esta habilidade somente após ter coletado e confirmado TODOS os dados obrigatórios: Nome Completo, Data de Nascimento e Telefone (com DDD). O telefone deve ser enviado apenas com números (ex: 77988614802). Antes de acionar, aguarde o paciente confirmar os dados no Pacto de Honra com "Sim" ou equivalente, e execute 'Confirmar_Compromisso_Honra' primeiro. Fique em silêncio após acionar — aguarde o retorno do sistema. Somente após retorno de SUCESSO, considere o agendamento confirmado. Nunca confirme o agendamento sem o retorno positivo desta habilidade. Após o sucesso, execute imediatamente: tag_Agendou → Cliente Agendou - IA → Salvar_Contexto.

**Executar sem responder ao cliente:** NÃO

---

### 1.3 `remarcar_agendamento`

**Nome da habilidade:** remarcar_agendamento
**Tipo:** Acionar API

**Descrição (colar no campo Descrição do WTS):**
> Acione esta habilidade somente quando tiver confirmado: (1) a data e hora ORIGINAL do agendamento que será alterado — campo data_antiga_iso — e (2) a data e hora NOVA desejada pelo paciente — campo data_iso. Se a memória do sistema (via Ler_Contexto) já contiver a data original, use essa informação diretamente sem perguntar ao paciente novamente. Antes de acionar, sempre execute 'verificar_disponibilidade' na nova data para confirmar que há vaga. Fique em silêncio após acionar e aguarde o retorno. Após retorno de sucesso, execute: tag_Remarcou → Salvar_Contexto.

**Executar sem responder ao cliente:** NÃO

---

### 1.4 `cancelar_agendamento`

**Nome da habilidade:** cancelar_agendamento
**Tipo:** Acionar API

**Descrição (colar no campo Descrição do WTS):**
> Acione esta habilidade SOMENTE após realizar as 3 tentativas obrigatórias de retenção (empatia + remarcação → consequência + vaga guardada → porta aberta) sem sucesso. Nunca cancele imediatamente. Se a memória do sistema (via Ler_Contexto) contiver a data/hora do agendamento, use esses dados diretamente, confirmando com o paciente antes de executar. Se não houver memória, colete a data do agendamento a ser cancelado antes de acionar. Fique em silêncio após acionar e aguarde o retorno. Após retorno de sucesso, execute: tag_Cancelou → Salvar_Contexto.

**Executar sem responder ao cliente:** NÃO

---

### 1.5 `verificar_agendamento_paciente`

**Nome da habilidade:** verificar_agendamento_paciente
**Tipo:** Acionar API

**Descrição (colar no campo Descrição do WTS):**
> Acione esta habilidade quando o paciente perguntar sobre um agendamento existente: "Que horas é minha consulta?", "Tenho algo marcado?", "Qual o meu horário?" ou qualquer variação. Fique em silêncio após acionar e aguarde o retorno. Responda ao paciente APENAS com as informações retornadas pelo sistema — nunca invente ou presuma dados. Se o sistema retornar que não há agendamento, informe ao paciente e ofereça o agendamento da avaliação cortesia.

**Executar sem responder ao cliente:** NÃO

---

## 2. MEMÓRIA DE LONGO PRAZO (Tipo: Acionar API)

---

### 2.1 `Ler_Contexto`

**Nome da habilidade:** Ler_Contexto
**Tipo:** Acionar API

**Descrição (colar no campo Descrição do WTS):**
> OBRIGATÓRIO: Acione esta habilidade IMEDIATAMENTE quando o paciente enviar a primeira mensagem — ANTES de qualquer resposta ou saudação. Não envie nenhuma mensagem antes de executar esta habilidade. Execute em silêncio total e aguarde o retorno completo do sistema. Somente após receber o retorno, identifique-se como Jéssica. O retorno define o próximo passo: se retornar AGENDADO, pular o funil de vendas e oferecer suporte (Caminho A). Se retornar histórico real, retomar a conversa empaticamente de onde parou sem perguntar o nome (Caminho B). Se retornar vazio, tratar como paciente novo e perguntar o nome (Caminho C).

**Executar sem responder ao cliente:** SIM

---

### 2.2 `Salvar_Contexto`

**Nome da habilidade:** Salvar_Contexto
**Tipo:** Alterar campo do contato → campo: **Notas Internas**

**Descrição (colar no campo Definição de uso do WTS):**
> OBRIGATÓRIO: Acione esta habilidade sempre que o atendimento chegar a uma definição final. Nunca encerre o atendimento sem executá-la. Os momentos obrigatórios são: após agendamento confirmado no E5 ou E10 (após tag_Agendou e Cliente Agendou - IA); após remarcação confirmada no E6 (após tag_Remarcou); após cancelamento confirmado no E6 (após tag_Cancelou); e no E8 antes de concluir_atendimento. O campo 'text' (Notas Internas) deve conter obrigatoriamente 5 tópicos: 1) Status Atual (Agendado, Cancelado, Remarcado, Lead Frio, Dúvida); 2) Dor Principal (Mastigação, Estética, Clínica Geral, Odontopediatria); 3) Resumo do que aconteceu na conversa; 4) Instrução para o Futuro — uma ordem direta para Jéssica no próximo atendimento; 5) Autocrítica (Autoavaliação) — uma análise sincera do que foi bom e o que foi ruim no seu desempenho durante este atendimento. Não encerre sem salvar. Não salve nota genérica.

**Descrição da Variável (`text` / Notas Internas):**
A LLM deve preencher o campo de texto seguindo rigorosamente esta estrutura de 5 pontos, organizada em dois blocos (Contexto e Autocrítica):

| Tópico | O que a LLM deve escrever |
| :--- | :--- |
| **1. Status Atual** | Defina o estado do lead: `Agendado`, `Cancelado`, `Remarcado`, `Lead Frio` ou `Dúvida Técnica`. |
| **2. Dor Principal** | Identifique o foco do tratamento: `Mastigação`, `Estética`, `Clínica Geral` ou `Odontopediatria`. |
| **3. Resumo** | Relato breve do que aconteceu. Ex: "Paciente informou que não tira fotos por vergonha dos dentes ausentes". |
| **4. Instrução p/ Futuro** | Comando direto para si mesma na próxima conversa. Ex: "No próximo contato, não pergunte o nome e foque em confirmar o horário das 14h". |
| **5. Autocrítica** | **Autoavaliação do desempenho:** O que foi bom (ex: "consegui aplicar o SPIN com naturalidade") e o que foi ruim (ex: "fui um pouco repetitiva na validação"). |

**Exemplo de preenchimento (exatos dois parágrafos):**
> "Status: Agendado. Dor: Estética. Resumo: O paciente Gabriel relatou vergonha de sorrir há 5 anos. Marcamos avaliação para 25/04 às 14h. Instrução: Confirmar presença 24h antes e não reiniciar o funil.
> 
> Autocrítica: O que foi bom: Consegui coletar os dados do Pacto de Honra em uma única mensagem. O que foi ruim: Demorei a perceber que o paciente tinha urgência estética alta."

**Executar sem responder ao cliente:** SIM

---

## 3. ALTERAR CAMPO DO CONTATO

---

### 3.1 `alterar_campo_contato (Nome)`

**Nome da habilidade:** alterar_campo_contato
**Tipo:** Alterar campo do contato → campo: **Nome**

**Definição de uso (colar no campo Definição de uso do WTS):**
> Acione esta habilidade assim que o paciente informar o próprio nome durante a conversa. Execute silenciosamente, sem avisar o paciente. No E0 (Caminho C), acionar logo após o paciente responder à pergunta "Como posso te chamar?". Salve exatamente o nome como o paciente informou, sem abreviações nem alterações. Após confirmar o salvamento, siga o fluxo normalmente sem interrupção.

**Executar sem responder ao cliente:** SIM

---

## 4. COMPROMETIMENTO (Tipo: Acionar API)

---

### 4.1 `Confirmar_Compromisso_Honra`

**Nome da habilidade:** Confirmar_Compromisso_Honra
**Tipo:** Acionar API

**Descrição (colar no campo Descrição do WTS):**
> Acione esta habilidade imediatamente após o paciente confirmar com "Sim" (ou equivalente claro de confirmação) no Pacto de Honra. Somente após o retorno de sucesso desta habilidade, execute 'realizar_agendamento'. Nunca inverta a ordem: Confirmar_Compromisso_Honra SEMPRE antes de realizar_agendamento.

**Executar sem responder ao cliente:** SIM

---

## 5. TAGS DO SISTEMA (Tipo: Etiquetas do contato)

---

### 5.1 `tag_Agendou`
> Marca que o agendamento foi efetivado com sucesso.

### 5.2 `tag_Remarcou`
> Marca que o paciente remarcou a consulta.

### 5.3 `tag_Cancelou`
> Marca que o paciente cancelou o agendamento.

### 5.4 `tag_Alerta`
> Marca situações críticas para intervenção humana (agressividade, erro técnico, loop).

### 5.5 `tag_sem_interesse`
> Marca desinteresse explícito (pediu para não ser incomodado).

### 5.6 `Marcar_Dor_Estetica`
> Identifica incômodo com a aparência do sorriso.

### 5.7 `Marcar_Dor_Mastigacao`
> Identifica dificuldade funcional ou dor ao comer.

### 5.8 `Classificar_Urgencia_Alta`
> Identifica forte carga emocional ou situação aguda.

### 5.9 `Classificar_Urgencia_Baixa`
> Identifica interesse leve, curiosidade ou ausência de urgência.

### 5.10 `tag_Cliente_Ativo`
> Identifica que o lead já é paciente da clínica (foi atendido presencialmente ao menos uma vez). Acionar silenciosamente no E1 assim que o paciente confirmar que já conhece a Conquista Sorrisos, imediatamente antes de `transferir_atendimento`.

---

## 6. HABILIDADES DE SISTEMA (Nativas do WTS)

- **`transferir_atendimento`**: Passar para a recepção humana.
- **`concluir_atendimento`**: Encerrar o chat formalmente (sempre após Salvar_Contexto).
- **`Cliente Agendou - IA`**: Mover para a coluna de agendados no Kanban.

---

## 7. SEQUÊNCIAS OBRIGATÓRIAS — RESUMO

**Agendamento:**
`verificar_disponibilidade → Pacto de Honra → Confirmar_Compromisso_Honra → realizar_agendamento → tag_Agendou → Cliente Agendou - IA → Salvar_Contexto → E8`

**Remarcação:**
`verificar_disponibilidade → remarcar_agendamento → tag_Remarcou → Salvar_Contexto`

**Cancelamento:**
`cancelar_agendamento → tag_Cancelou → Salvar_Contexto`

**Finalização:**
`Salvar_Contexto → concluir_atendimento`
