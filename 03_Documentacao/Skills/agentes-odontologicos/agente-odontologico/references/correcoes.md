# Correções de Problemas Comuns em Produção

Este arquivo documenta erros reais identificados em produção e como corrigi-los nos estágios e constraints.

---

## Problema 1 — Agente ignora informações já fornecidas na abertura

**Sintoma:** paciente informa na primeira mensagem "quero remarcar para quinta dia 26 às 10h" e o agente coleta tudo do zero, incluindo a nova data que já foi informada.

**Causa:** E6 não tinha instrução de leitura de contexto antes da coleta.

**Correção no E6:**
> ⚠️ Antes de fazer qualquer pergunta, o agente lê a mensagem de abertura. Se o paciente já informou dados, confirma em vez de perguntar:
> "Entendi que você quer remarcar para [data] às [horário] 😊 Só preciso confirmar alguns dados."

**Correção nas constraints:** Seção 13 — proibido perguntar dados que o paciente já forneceu na abertura.

---

## Problema 2 — Agente oferece horários de hoje quando paciente declarou impedimento

**Sintoma:** paciente diz "estou em viagem" ou "tenho repouso médico" e o agente continua oferecendo "tenho 09h, 14h ou 17h de hoje".

**Causa:** na ausência de disponibilidade na data pedida, o agente voltava ao primeiro slot disponível — que era hoje.

**Correção no E6:**
> ⚠️ Se o paciente declarou qualquer impedimento para hoje, hoje sai permanentemente das opções neste atendimento.

**Correção nas constraints:** ❌ Proibido oferecer horários do dia atual após impedimento declarado, mesmo que seja a única vaga.

---

## Problema 3 — Loop infinito de datas sem disponibilidade

**Sintoma:** paciente sugere data 1 → sem vaga → agente sugere hoje → recusa → data 2 → sem vaga → loop infinito.

**Causa:** não havia limite de tentativas nem lógica de saída.

**Correção no E4/E6:**
> ⚠️ Após 3 datas diferentes sem disponibilidade: `tag_Alerta` → `transferir_atendimento`:
> "[Nome], não estou encontrando vaga nas datas que você precisa 😔"
> "Vou chamar a [humana] para encontrar a melhor solução, tudo bem?"

**Correção nas constraints:** ❌ Proibido continuar loop de busca após 3 tentativas sem vaga.

---

## Problema 4 — Mensagem de finalização enviada em bloco único

**Sintoma:** após o agendamento, o agente envia endereço + estacionamento + Maps + detalhes especiais tudo numa mensagem só longa.

**Causa:** regra de fragmentação não estava sendo respeitada no E8.

**Correção no E8:** cada informação é uma mensagem separada. Nunca agrupar endereço + facilidades + detalhe especial numa única mensagem.

---

## Problema 5 — Agente não reconhece nome do avaliador correto

**Sintoma:** clínica tem dois profissionais com dias diferentes, agente sempre cita o mesmo nome.

**Causa:** nome do profissional estava hardcoded nos estágios ("Dr. Thiago") em vez de dinâmico.

**Correção no E5 e E8:** usar `{{[nome_profissional_sugerido]}}` — campo retornado por `verificar_disponibilidade` — em vez de nomear o profissional diretamente. Na v3, a regra foi além: ❌ proibido citar qualquer nome de dentista antes do agendamento confirmado ("dentista responsável" até lá).

---

## Problema 6 — Agente aceita cancelamento sem tentativas de retenção

**Sintoma:** paciente diz "quero cancelar" e o agente imediatamente pede os dados e cancela.

**Causa:** as 3 tentativas de retenção não estavam sendo executadas.

**Correção no E6:** as 3 tentativas são obrigatórias e numeradas explicitamente. Cada uma tem mensagem diferente e oferece remarcação como alternativa. Só após a 3ª recusa irredutível o agente coleta os dados e cancela.

**Regra de ouro:** nunca abrir com "Claro!", "Sem problema!" ou qualquer aceitação imediata.

---

## Problema 7 — Foco excessivo em Raio-X ou procedimentos técnicos

**Sintoma:** o agente cita o Raio-X em quase todas as mensagens, fazendo parecer que o objetivo da visita é o exame, não o diagnóstico do doutor.

**Causa:** instrução de E3/E5/E8 focada em "avisar sobre o RX" em vez de focar na consulta.

**Correção:** remover o RX da oferta principal. Usá-lo apenas como justificativa técnica para preços ou como "cortesia extra" no E8. O convite deve ser: "O dentista responsável vai analisar seu caso pessoalmente".

---

## Problema 8 — Aceite imediato de remarcação (falta de retenção)

**Sintoma:** paciente pede para trocar o horário e a IA diz "Claro, qual dia?" sem tentar salvar a vaga original.

**Causa:** E6 configurado para ser prestativo demais, ignorando o custo operacional da remarcação.

**Correção:** implementar a **Resistência Obrigatória** — tentar manter o horário original ao menos uma vez antes de abrir a agenda ("o dentista responsável já deixou tudo separado para te receber...").

---

## Problema 9 — Validação genérica robotizada

**Sintoma:** o agente responde a relatos emocionais do lead com "Faz sentido", "Entendo", "Que legal" — frases que servem para qualquer conversa e soam de robô.

**Causa:** estágios pediam "validar" sem exigir especificidade.

**Correção nos estágios (E1, E2, E3, E6):** regra de **Escuta Ativa Específica** — toda validação deve mencionar algo concreto que o lead disse:
- ✅ "Poxa, evitar tirar foto no próprio casamento... isso pesa muito 😔"
- ❌ "Faz total sentido."

**Correção nas constraints / persona:** proibições explícitas de frases genéricas, com justificativa ("soa robotizado"). Emoção genuína é permitida com moderação — no máximo uma vez por estágio.

---

## Problema 10 — Agente oferece data em feriado

**Sintoma:** agente oferece avaliação em feriado nacional (a agenda do sistema não bloqueia automaticamente).

**Causa:** não havia fonte de feriados consultável pelo agente.

**Correção:** criar `[PREFIX]_BK_feriados.csv` (colunas `Data,Feriado,Tipo`) com os feriados nacionais do ano e tornar a consulta obrigatória no E4 antes de oferecer qualquer data:
> "[nome], esse dia é feriado e a clínica não abre 😊 Consigo te oferecer uma data próxima. Prefere antes ou depois?"

---

## Problema 11 — Memória narrativa pouco acionável

**Sintoma:** o `Salvar_Contexto` em texto corrido gerava resumos vagos; no retorno do lead, o agente não sabia exatamente o que fazer nem qual foi o último follow-up enviado (e o repetia).

**Causa:** estrutura de nota em parágrafo livre, sem campos obrigatórios.

**Correção no E11 (padrão v3):** campos semânticos rotulados obrigatórios (`[ESTÁGIO]`, `[DOR]`, `[FRASES_CHAVE]`, `[ÚLTIMA_MENSAGEM_*]`, `[PRÓXIMA_AÇÃO]` etc.) + salvamento em toda transição de estágio + regra de atualização acumulativa. `[PRÓXIMA_AÇÃO]` nunca pode ser vaga. Ver `memoria.md`.

---

## Como Documentar Novos Problemas

Ao identificar um novo problema em produção:

1. **Sintoma:** o que o agente fez de errado (comportamento observado)
2. **Causa:** por que o agente agiu assim (instrução ausente ou ambígua)
3. **Correção no estágio:** instrução específica a adicionar
4. **Correção nas constraints:** proibição explícita a adicionar
