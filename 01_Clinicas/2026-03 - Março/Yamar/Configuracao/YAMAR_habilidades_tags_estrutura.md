# Estrutura de Habilidades e Tags — Yamar Odontologia

## 1. HABILIDADES DO SISTEMA (Fixas)

### 1.1 Agendamento
- `verificar_disponibilidade` — Consulta os horários livres na agenda da Yamar antes de oferecer ao paciente.
- `realizar_agendamento` — Cria o agendamento no sistema após Coleta de Dados e Pacto de Honra.
- `remarcar_agendamento` — Altera a data de uma consulta existente.
- `cancelar_agendamento` — Remove uma consulta (só após as 3 tentativas finais).
- `verificar_agendamento_paciente` — Consulta se o paciente já tem consulta marcada.

### 1.2 Contato e Encerramento
- `alterar_campo_contato (Nome)` — Atualiza o nome do lead logo após ele informar o nome.
- `transferir_atendimento` — Transfere para a supervisão de equipe.
- `concluir_atendimento` — Encerra após o E8 na etapa final.

### 1.3 Memória
- `Salvar_Contexto` / `Ler_Contexto` / `Ler_Etiqueta`

### 1.4 Comprometimento
- `Confirmar_Compromisso_Honra` — Registra a promessa verbal do Pacto de Honra no sistema de CRM.

## 2. TAGS DO SISTEMA

### 2.1 Conversão e Funil Central (Kanban)
- `Cliente Agendou - IA` — Tag Mestra (Só aplicável se realizar_agendamento for status verde).

### 2.2 Evento Retenção
- `tag_Agendou` — Disparada logo após realizar agendamento.
- `tag_Remarcou` — Disparada em sucesso do remanejamento.
- `tag_Cancelou` — Disparada em caso final de desistencia.
- `tag_Alerta` — Aplicada ao esgotar vagas no transbordo da retenção.

### 2.3 Taxonomia Analítica — Dor
- `Marcar_Dor_Estetica`
- `Marcar_Dor_Mastigacao`

### 2.4 Urgência
- `Classificar_Urgencia_Alta`
- `Classificar_Urgencia_Baixa`

### 2.5 Reengajamento
- `Lead Esfriando`
