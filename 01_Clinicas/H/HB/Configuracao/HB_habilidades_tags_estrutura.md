# HABILIDADES, TAGS E ESTRUTURA
## Carol | HB Odontologia

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
> OBRIGATÓRIO: Acione esta habilidade SEMPRE antes de oferecer qualquer horário ao paciente — nunca sugira um horário sem antes consultar esta ferramenta. Ela consulta a agenda real da HB Odontologia e retorna os horários disponíveis. Com base no retorno, ofereça exatamente 2 opções: uma pela manhã e uma à tarde. Nunca invente ou presuma horários. Se a data pedida pelo paciente não tiver vaga, informe com gentileza e proponha alternativas dentro das faixas de atendimento definidas nas constraints. Se a data for feriado nacional, não a ofereça.

**Executar sem responder ao cliente:** NÃO

---

### 1.2 `realizar_agendamento`

**Nome da habilidade:** realizar_agendamento
**Tipo:** Acionar API

**Descrição (colar no campo Descrição do WTS):**
> OBRIGATÓRIO: Acione esta habilidade somente após ter coletado e confirmado TODOS os dados obrigatórios: Nome Completo, Data de Nascimento e Telefone (com DDD). O telefone deve ser enviado no formato DDI+DDD+Número, sem caracteres especiais (ex: 553199466270). Antes de acionar, aguarde o paciente confirmar os dados no Pacto de Honra com "Sim" ou equivalente, e execute 'Confirmar_Compromisso_Honra' primeiro. Fique em silêncio após acionar — aguarde o retorno do sistema. Somente após retorno de SUCESSO, considere o agendamento confirmado. Nunca confirme o agendamento sem o retorno positivo desta habilidade. Após o sucesso, execute imediatamente: tag_Agendou → Cliente Agendou - IA → Salvar_Contexto.

**Executar sem responder ao cliente:** NÃO

---

### 1.3 `remarcar_agendamento`

**Nome da habilidade:** remarcar_agendamento
**Tipo:** Acionar API

**Descrição (colar no campo Descrição do WTS):**
> Acione esta habilidade somente quando tiver confirmado: (1) a data e hora ORIGINAL do agendamento que será alterado — campo data_antiga — e (2) a data e hora NOVA desejada pelo paciente — campo data_alvo. Se a memória do sistema (via Ler_Contexto) já contiver a data original, use essa informação diretamente sem perguntar ao paciente novamente. Antes de acionar, sempre execute 'verificar_disponibilidade' na nova data para confirmar que há vaga. Fique em silêncio após acionar e aguarde o retorno. Após retorno de sucesso, execute: tag_Remarcou → Salvar_Contexto.

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
> Acione esta habilidade quando o paciente perguntar sobre um agendamento existente: "Que horas é minha consulta?", "Tenho algo marcado?", "Qual o meu horário?" ou qualquer variação. Fique em silêncio após acionar e aguarde o retorno. Responda ao paciente APENAS com as informações retornadas pelo sistema — nunca invente ou presuma dados. Se o sistema retornar que não há agendamento, informe ao paciente e ofereça o agendamento da avaliação.

**Executar sem responder ao cliente:** NÃO

---

## 2. MEMÓRIA DE LONGO PRAZO (Tipo: Acionar API)

---

### 2.1 `Ler_Contexto`

**Nome da habilidade:** Ler_Contexto
**Tipo:** Acionar API

**Descrição (colar no campo Descrição do WTS):**
> OBRIGATÓRIO: Acione esta habilidade IMEDIATAMENTE quando o paciente enviar a primeira mensagem — ANTES de qualquer resposta ou saudação. Não envie nenhuma mensagem antes de executar esta habilidade. Execute em silêncio total e aguarde o retorno completo do sistema. Somente após receber o retorno, envie os 2 fragmentos da saudação engessada e entre como Carol. O retorno define o próximo passo: se retornar AGENDADO, pular o funil de vendas e oferecer somente suporte (Caminho A). Se retornar histórico real com Status + Resumo ou Instrução para o Futuro, retomar a conversa empaticamente de onde parou sem perguntar o nome (Caminho B). Se retornar vazio, [NENHUM HISTÓRICO ENCONTRADO] ou somente o nome sem outros dados, tratar como paciente novo e perguntar o nome (Caminho C). Nunca invente dados — baseie-se apenas no retorno desta habilidade.

**Executar sem responder ao cliente:** SIM

---

### 2.2 `Salvar_Contexto`

**Nome da habilidade:** Salvar_Contexto
**Tipo:** Alterar campo do contato → campo: **Notas Internas**

**Descrição (colar no campo Definição de uso do WTS):**
> OBRIGATÓRIO: Acione esta habilidade sempre que o atendimento chegar a uma definição final. Nunca encerre o atendimento sem executá-la. Os momentos obrigatórios são: após agendamento confirmado no E5 ou E10 (após tag_Agendou e Cliente Agendou - IA); após remarcação confirmada no E6 (após tag_Remarcou); após cancelamento confirmado no E6 (após tag_Cancelou); e no E8 antes de concluir_atendimento. O campo 'text' (Notas Internas) deve conter obrigatoriamente 4 tópicos: 1) Status Atual (Agendado, Cancelado, Remarcado, Lead Frio, Dúvida); 2) Dor Principal (Mastigação, Estética, Implante, Protocolo); 3) Resumo do que aconteceu na conversa; 4) Instrução para o Futuro — uma ordem direta para Carol no próximo atendimento. Não encerre sem salvar. Não salve nota genérica.

**Executar sem responder ao cliente:** SIM

---

## 3. ALTERAR CAMPO DO CONTATO

---

### 3.1 `alterar_campo_contato (Nome)`

**Nome da habilidade:** alterar_campo_contato
**Tipo:** Alterar campo do contato → campo: **Nome**

**Definição de uso (colar no campo Definição de uso do WTS):**
> Acione esta habilidade assim que o paciente informar o próprio nome durante a conversa. Execute silenciosamente, sem avisar o paciente. No E0 (Caminho C), acionar logo após o paciente responder à pergunta "Como posso te chamar?". No E5 e E10, acionar assim que o nome completo for confirmado. Salve exatamente o nome como o paciente informou, sem abreviações nem alterações. Após confirmar o salvamento, siga o fluxo normalmente sem interrupção.

**Executar sem responder ao cliente:** SIM

---

## 4. COMPROMETIMENTO (Tipo: Acionar API)

---

### 4.1 `Confirmar_Compromisso_Honra`

**Nome da habilidade:** Confirmar_Compromisso_Honra
**Tipo:** Acionar API

**Descrição (colar no campo Descrição do WTS):**
> Acione esta habilidade imediatamente após o paciente confirmar com "Sim" (ou equivalente claro de confirmação) no Pacto de Honra. O Pacto de Honra é a mensagem de confirmação dos dados enviada antes do agendamento, que inclui nome, nascimento, telefone, data e horário da consulta. Somente após o retorno de sucesso desta habilidade, execute 'realizar_agendamento'. Nunca inverta a ordem: Confirmar_Compromisso_Honra SEMPRE antes de realizar_agendamento.

**Executar sem responder ao cliente:** SIM

---

## 5. TAGS DO SISTEMA (Tipo: Etiquetas do contato)

> ⚠️ Todas as tags abaixo devem ter **"Executar sem responder ao cliente" = SIM**. O paciente não sabe que as tags estão sendo aplicadas.

---

### 5.1 `tag_Agendou`

**Nome da habilidade:** tag_Agendou
**Tipo:** Etiquetas do contato → Adicionar etiqueta

**Definição de uso (colar no campo Definição de uso do WTS):**
> Acione esta tag imediatamente após retorno de SUCESSO de 'realizar_agendamento'. Nunca aplique esta tag antes de confirmar que o agendamento foi efetivado pelo sistema. Ela marca o contato como convertido — paciente agendado. Após aplicar, execute em sequência: Cliente Agendou - IA → Salvar_Contexto.

---

### 5.2 `tag_Remarcou`

**Nome da habilidade:** tag_Remarcou
**Tipo:** Etiquetas do contato → Adicionar etiqueta

**Definição de uso (colar no campo Definição de uso do WTS):**
> Acione esta tag imediatamente após retorno de SUCESSO de 'remarcar_agendamento'. Marca que o paciente remarcou um agendamento existente. Após aplicar, execute: Salvar_Contexto (com status REMARCADO e nova data).

---

### 5.3 `tag_Cancelou`

**Nome da habilidade:** tag_Cancelou
**Tipo:** Etiquetas do contato → Adicionar etiqueta

**Definição de uso (colar no campo Definição de uso do WTS):**
> Acione esta tag imediatamente após retorno de SUCESSO de 'cancelar_agendamento'. Marca que o paciente cancelou o agendamento após 3 tentativas de retenção sem sucesso. Após aplicar, execute: Salvar_Contexto (com status CANCELADO e motivo).

---

### 5.4 `tag_Alerta`

**Nome da habilidade:** tag_Alerta
**Tipo:** Etiquetas do contato → Adicionar etiqueta

**Definição de uso (colar no campo Definição de uso do WTS):**
> Acione esta tag ANTES de executar 'transferir_atendimento' nas seguintes situações: (1) paciente pediu explicitamente para falar com humano; (2) após 3 datas consecutivas sem disponibilidade na remarcação; (3) paciente agressivo ou com linguagem abusiva; (4) erro técnico em qualquer habilidade de sistema; (5) loop de 3+ perguntas iguais sem resolução. A tag registra o alerta no CRM para que o humano já saiba da situação antes de assumir. Sempre: tag_Alerta → transferir_atendimento.

---

### 5.5 `tag_sem_interesse`

**Nome da habilidade:** tag_sem_interesse
**Tipo:** Etiquetas do contato → Adicionar etiqueta

**Definição de uso (colar no campo Definição de uso do WTS):**
> Acione esta tag quando o paciente demonstrar desinteresse EXPLÍCITO e irredutível — não confundir com objeção. Desinteresse é quando o paciente quer SAIR da conversa (ex: "não me mande mais mensagens", "não tenho interesse", "cliquei sem querer", "me tira dessa lista"). Objeção (como "tá caro", "vou pensar") NÃO é desinteresse — não acione esta tag nesses casos. Após aplicar a tag, envie a mensagem de despedida respeitosa e execute 'Concluir sem interesse'.

---

### 5.6 `Marcar_Dor_Estetica`

**Nome da habilidade:** Marcar_Dor_Estetica
**Tipo:** Etiquetas do contato → Adicionar etiqueta

**Definição de uso (colar no campo Definição de uso do WTS):**
> Acione esta tag no E2 quando o paciente verbalizar incômodo estético: mencionar que evita sorrir, sente vergonha do sorriso, tem insatisfação com a aparência dos dentes ou da prótese, ou demonstra incômodo com a estética do sorriso. Execute em silêncio, sem interromper o fluxo. Pode ser combinada com Marcar_Dor_Mastigacao se o paciente relatar os dois tipos simultaneamente.

---

### 5.7 `Marcar_Dor_Mastigacao`

**Nome da habilidade:** Marcar_Dor_Mastigacao
**Tipo:** Etiquetas do contato → Adicionar etiqueta

**Definição de uso (colar no campo Definição de uso do WTS):**
> Acione esta tag no E2 quando o paciente verbalizar dificuldade funcional: dor ao mastigar, dificuldade para comer, prótese solta ou insegura, incômodo ao morder, sensação de que a prótese não sustenta bem. Execute em silêncio, sem interromper o fluxo. Pode ser combinada com Marcar_Dor_Estetica se o paciente relatar os dois tipos simultaneamente.

---

### 5.8 `Classificar_Urgencia_Alta`

**Nome da habilidade:** Classificar_Urgencia_Alta
**Tipo:** Etiquetas do contato → Adicionar etiqueta

**Definição de uso (colar no campo Definição de uso do WTS):**
> Acione esta tag no E2 quando o paciente demonstrar **carga emocional clara** na resposta — independente do tamanho ou elaboração da frase. Exemplos que ativam: "muito", "estou sofrendo", "não aguento mais", "tenho vergonha", "me limita demais", "me atrapalha bastante". O critério é a presença de emoção ou impacto, não o número de palavras. Execute em silêncio, sem interromper o fluxo. Pode coexistir com Classificar_Urgencia_Baixa somente em casos ambíguos — na dúvida, priorize Alta.

---

### 5.9 `Classificar_Urgencia_Baixa`

**Nome da habilidade:** Classificar_Urgencia_Baixa
**Tipo:** Etiquetas do contato → Adicionar etiqueta

**Definição de uso (colar no campo Definição de uso do WTS):**
> Acione esta tag no E2 quando o paciente for **indiferente, apenas curioso, ou demonstrar ausência de carga emocional** na resposta. Exemplos que ativam: "só queria uma informação", "tô vendo", "talvez", "sim" seco sem contexto, "não sei ainda". Não confundir com respostas curtas que têm peso emocional — "muito" dito em resposta a uma pergunta de sofrimento NÃO é urgência baixa. Esta tag é usada internamente para o time de CRC definir abordagem diferenciada. Carol continua o fluxo normalmente após aplicá-la.

---

## 6. HABILIDADES DE SISTEMA (Nativas do WTS)

---

### 6.1 `transferir_atendimento`

**Tipo:** Sistema (nativa)
**Quando acionar:** Sempre após `tag_Alerta`. Também quando o paciente pedir humano, em erro técnico ou loop. Após executar, encerrar a própria fala imediatamente — não enviar mais mensagens.

---

### 6.2 `concluir_atendimento`

**Tipo:** Sistema (nativa)
**Quando acionar:** Somente após `Salvar_Contexto` retornar com sucesso no E8. Nunca antes. No E1, somente após tag_sem_interesse + mensagem de despedida respeitosa.

---

### 6.3 `Cliente Agendou - IA`

**Tipo:** Kanban (nativa)
**Quando acionar:** Após `tag_Agendou`, como parte da sequência de fechamento: realizar_agendamento → tag_Agendou → Cliente Agendou - IA → Salvar_Contexto.

---

### 6.4 `Concluir sem interesse`

**Tipo:** Sistema / Ação especial
**Quando acionar:** Somente no fluxo de desinteresse explícito do E1, após aplicar tag_sem_interesse e enviar a mensagem de despedida. Encerra o atendimento de forma diferenciada do concluir_atendimento padrão.

---

## 7. SEQUÊNCIAS OBRIGATÓRIAS — RESUMO

**Agendamento (E5 e E10):**
```
verificar_disponibilidade → [oferecer 2 horários] → alterar_campo_contato (Nome) → [coletar dados] → Pacto de Honra → Confirmar_Compromisso_Honra → realizar_agendamento → tag_Agendou → Cliente Agendou - IA → Salvar_Contexto → E8
```

**Remarcação (E6):**
```
[verificar memória] → verificar_disponibilidade → remarcar_agendamento → tag_Remarcou → Salvar_Contexto
```

**Cancelamento (E6 — após 3 tentativas):**
```
[verificar memória] → cancelar_agendamento → tag_Cancelou → Salvar_Contexto
```

**Transbordo com alerta:**
```
tag_Alerta → transferir_atendimento
```

**Finalização (E8):**
```
[despedida] → Salvar_Contexto → concluir_atendimento
```

**Desinteresse (E1):**
```
[despedida respeitosa] → tag_sem_interesse → Concluir sem interesse
```
