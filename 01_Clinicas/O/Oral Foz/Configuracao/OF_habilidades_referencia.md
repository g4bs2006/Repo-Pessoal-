# REFERÊNCIA DE HABILIDADES | Yara | Oral Foz

---

### #I (Intenção):
Este arquivo é a fonte de verdade sobre **o que cada habilidade significa** para a Yara — não apenas o gatilho de "quando executar" (isso já existe nas tabelas de cada Estágio), mas o porquê ela existe e para que serve no negócio. Toda habilidade nova criada para este agente deve ser documentada aqui antes ou junto da sua implementação nos Estágios.

> ⚠️ Este arquivo não substitui as tabelas de habilidades de cada Estágio (`| Habilidade | Tipo | Quando executar |`) — ele complementa. As tabelas dizem o gatilho operacional; aqui está o entendimento de fundo que evita que a Yara use a habilidade errada ou no lugar errado.

---

## PADRÃO — como descrever uma habilidade nova

Toda habilidade nova documentada aqui segue este template fixo:

```
## `nome_da_habilidade`

**Tipo:** (TRANSFER / UPDATE_CONTACT_TAG / UPDATE_CONTACT_FIELD / READ_TAG / READ_CONTEXT / SCHEDULING / SYSTEM)

**O que é:**
Descrição objetiva do que a habilidade faz tecnicamente (uma ou duas frases).

**Quando usar:**
O gatilho exato — em qual Estágio, Passo e condição a habilidade é acionada. Referenciar o arquivo/passo de origem.

**Por que usar:**
O motivo de negócio ou de segurança que justifica a habilidade existir — o que aconteceria (ou já aconteceu) sem ela.

**Para que serve:**
O efeito prático depois de executada — o que muda no atendimento, no CRM/kanban ou na experiência do paciente.

**Restrições específicas:**
Erros que a Yara não pode cometer ao usar essa habilidade (se houver, além das restrições já listadas no Estágio).
```

Ao criar uma habilidade nova:
1. Documentar aqui usando o template acima.
2. Adicionar a linha na tabela de habilidades do(s) Estágio(s) onde ela é usada.
3. Se for uma habilidade de transbordo (`transferir_*`), adicionar também na Seção 11 de `OF_regras_sistema_constraints.md`.

---

## `transferir_pagamento`

**Tipo:** TRANSFER

**O que é:**
Habilidade de transbordo (handoff) que encerra o atendimento automatizado da Yara e passa a conversa para um atendente humano da clínica, especificamente para conferência de um pagamento.

**Quando usar:**
Somente no **E8 (Finalização), Passo 5**, no momento em que a Yara identifica que o paciente enviou o comprovante do sinal de reserva — seja como imagem/anexo (print do PIX) ou como confirmação textual explícita de pagamento ("paguei", "enviei", "segue o comprovante", ou equivalente em espanhol). É acionada imediatamente após a mensagem curta de reconhecimento ("Recebido! Vou confirmar com nossa equipe...").

**Por que usar:**
Porque a Yara não tem como validar um pagamento de verdade — ela não consegue confirmar se o PIX caiu, se o valor está correto, ou se o comprovante é legítimo. Sem esta habilidade, o fluxo do sinal (regra 16) ficaria sem um desfecho claro: a Yara ou teria que confiar cegamente na palavra do paciente e encerrar sozinha (`concluir_atendimento`), ou ficaria sem nenhum caminho definido depois de receber o comprovante. `transferir_pagamento` resolve isso criando um degrau obrigatório de verificação humana entre "o paciente diz que pagou" e "a vaga está de fato garantida".

**Para que serve:**
- Fecha o loop do agendamento com segurança financeira: a vaga só é considerada garantida depois que um humano confere o comprovante.
- Impede que a Yara declare ou implique que um pagamento foi validado — ela apenas reconhece o recebimento do comprovante, nunca confirma o pagamento.
- Substitui `concluir_atendimento` como desfecho a partir do Passo 4 do E8: uma vez que o sinal foi pedido, o atendimento da IA só termina via este handoff, nunca por encerramento direto.
- Dá à equipe humana o contexto já pronto (comprovante recém-enviado, agendamento já feito no sistema) para simplesmente conferir e confirmar, sem precisar reconstruir a conversa.

**Restrições específicas:**
- ❌ Nunca acionar sem ter identificado imagem/anexo ou confirmação textual explícita — "vou pagar depois" ou silêncio do paciente não são gatilho.
- ❌ Nunca usar no lugar de `transferir_atendimento_paciente` ou `transferir_atendimento_emergencia` — é exclusiva do contexto de comprovante de sinal no E8.
- ❌ Nunca seguida de `concluir_atendimento` — os dois são mutuamente exclusivos nesse ponto do fluxo.

---

## Habilidades ainda não documentadas neste padrão

As demais habilidades do agente (`ler_etiquetas`, `Ler_Contexto`, `tag_portugues`, `tag_espanhol`, `alterar_campo_contato`, `tag_estrangeiro`, `tag_online`, `Marcar_Dor_Estetica`, `Marcar_Dor_Mastigacao`, `Classificar_Urgencia_Alta`, `Classificar_Urgencia_Baixa`, `tag_Emergencia`, `verificar_disponibilidade`, `Confirmar_Compromisso_Honra`, `realizar_agendamento`, `tag_Agendou`, `remarcar_agendamento`, `tag_Remarcou`, `cancelar_agendamento`, `tag_Cancelou`, `tag_Alerta`, `concluir_atendimento`, `verificar_agendamento_paciente`, `transferir_atendimento`, `transferir_atendimento_paciente`, `transferir_atendimento_emergencia`) ainda seguem apenas o padrão simples de tabela nos Estágios. Retrofit opcional — pode ser feito em uma passada dedicada, sem bloquear o uso do agente.
