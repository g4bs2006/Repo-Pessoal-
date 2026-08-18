# Estrutura de Habilidades e Tags — Arte Riso

## 1. HABILIDADES DO SISTEMA (Fixas)

### 1.1 Agendamento
- `verificar_disponibilidade` — Consulta os horários livres na agenda da Arte Riso antes de oferecer qualquer opção ao paciente.
- `realizar_agendamento` — Cria o agendamento no sistema.
- `remarcar_agendamento` — Altera a data de uma consulta existente sob posse da clínica.
- `cancelar_agendamento` — Remove uma consulta (só executar após as 3 tentativas na barreira de retenção).
- `verificar_agendamento_paciente` — Consulta se o paciente detém consulta marcada na base.

### 1.2 Contato e Encerramento
- `alterar_campo_contato (Nome)` — Atualiza o nome do contato no CRM do lead assim que o paciente informa seu nome completo no fluxo do funil.
- `transferir_atendimento` — Transfere para a responsabilidade humana real (o responsável estipulado na clínica).
- `concluir_atendimento` — Encerra o atendimento perante os protocolos, dando limite e baixa ao andamento na IA.

### 1.3 Memória Contextual
- `Ler_Etiqueta` — Lê a etiqueta atual do contato nos metadados do CRM.
- `Ler_Contexto` — Carrega as informações e Notas Internas salvas como escopo para saber do que se tem na mesa nas interações passadas.
- `Salvar_Contexto` — Grava ativamente o contexto vivo da conversa nas Notas Internas para retomada posterior.

### 1.4 Comprometimento
- `Confirmar_Compromisso_Honra` — Registra a promessa verbal do lead na retenção do compromisso assumido quando confirmada a agenda na conclusão do funil de vendas, evitando falta de comparecimento banal.

## 2. TAGS DO SISTEMA

### 2.1 Conversão e Funil Central (Kanban)
- `Cliente Agendou - IA` — A Tag mestra. Só se aplica efetivamente pelo agente após o trigger da habilidade principal `realizar_agendamento` ser executado e retornar sucesso limpo, comprovando o envio do card pelo funil para ser aguardado presencialmente.

### 2.2 Controle de Retenção — Pelo Evento em Ação
- `tag_Remarcou` — Aplicada unicamente como fechamento de confirmação e disparo métrico após conseguir rodar `remarcar_agendamento`.
- `tag_Cancelou` — Aplicada unicamente de modo comprovatório de transação falha de retenção com escape, logo após rodar e ser sucesso no retorno de uso em `cancelar_agendamento`.
- `tag_Alerta` — Aplicada em momento de gargalo de fluxo (como limites de 3 exaustões de vagas na remarcação ou quebras profundas). Feito ANTES de aplicar na fila por `transferir_atendimento`.

### 2.3 Taxonomia Analítica — Perfil de Dor
- `Marcar_Dor_Estetica` — Lead avaliado e marcado com peso ou angústia estética: não tira fotos, tenta segurar sorrisos amplos.
- `Marcar_Dor_Mastigacao` — Lead com dor basal primária mastigatória ou mecânica-funcional: dores crônicas nos movimentos da mandíbula, incômodo nas restrições de comida dura.

### 2.4 Qualificação Métrica de Riscos — Urgência
- `Classificar_Urgencia_Alta` — Urgência ativa com demanda dolorosa imediata presente na boca.
- `Classificar_Urgencia_Baixa` — Insatisfação crônica sem riscos de agudização dolorida de curto prazo (mais estética).

### 2.5 Reengajamento Dinâmico (Executada Unicamente Por Fluxo do n8n/Agente de Atraso)
- `Lead Esfriando` — Automação da retaguarda aplicará isso em janela ociosa da atenção do lead acima do timing normal, sinalizando que a Geysa irá iniciar leitura na "ROTA A" se houver interação de retomada do próprio agente pelo Estágio 0.

### 2.6 Qualificação de Plano de Saúde (Aplicadas no E1 — Primeira Triagem)
- `tag_plano` — Aplicada no E1 quando o lead confirma ter plano de saúde odontológico (IASPI ou IAPEP). Sinaliza que o atendimento pode ser coberto pelo convênio.
- `tag_particular` — Aplicada no E1 quando o lead não tem plano odontológico, ou tem um plano que a clínica não aceita. Sinaliza atendimento pelo particular com parcelamento.
