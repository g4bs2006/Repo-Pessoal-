# Os 12 Nós de Code

Cada nó de Code é um arquivo real em `templates/`. O gerador só substitui tokens `__MAIUSCULO__` — a lógica fica em arquivo `.js` de verdade, revisável, testável com `node --check` e editável sem mexer no gerador.

Só dois arquivos têm token: `configuracao_unidades.js` (a config da clínica) e `montar_card.js` (`__CHAIN__`, para nomear as referências de nó). Os outros dez leem tudo do grafo em tempo de execução.

| Nó no workflow | Template |
|---|---|
| `Configuracao Unidades` | `configuracao_unidades.js` |
| `Logica Inteligente` | `logica_inteligente.js` |
| `Validar Slot Agendar` | `validar_slot_agendar.js` |
| `Validar Slot Remarcar` | `validar_slot_remarcar.js` |
| `Unificar ID Paciente` | `unificar_id_paciente.js` |
| `Filtrar Agmt Cancelar` | `filtrar_agmt_cancelar.js` |
| `Filtrar Agmt Antigo` | `filtrar_agmt_antigo.js` |
| `Recuperar Reagendamento` | `recuperar_reagendamento.js` |
| `Filtrar Proximo Agmt` | `filtrar_proximo_agmt.js` |
| `Montar Card (Agendar)` | `montar_card.js` com `__CHAIN__` = Agendar |
| `Montar Card (Remarcar)` | `montar_card.js` com `__CHAIN__` = Remarcar |
| `Montar Card (Cancelar)` | `montar_card_cancelar.js` |

---

## `Configuracao Unidades`

**Consome:** o corpo do webhook.
**Devolve:** um objeto plano com os campos normalizados, mais `config_agenda` com a config inteira da clínica.

O padrão de "config num Code node no topo" existe para que **nenhum outro nó** tenha valor hardcoded. Todo nó HTTP lê `$('Configuracao Unidades').first().json.config_agenda.<campo>`. Trocar a duração da avaliação é editar um lugar.

Aliases aceitos no payload — o agente manda nomes diferentes conforme o estágio:

| Campo interno | Aliases aceitos |
|---|---|
| `id_atendimento` | `id_atendimento`, `atendimento_id`, `session_id`, `sessionId` |
| `acao_fluxo` | `action`, `acao_fluxo` |
| `telefone_limpo` | `telefone_cliente`, `telefone_contato`, `telefone` |
| `nome_paciente` | `nome_cliente`, `nome_contato` |
| `data_agendada` | `data_iso`, `data_inicio`, `data_agendada` |
| `data_antiga` | `data_antiga_iso`, `data_antiga`, `data-antiga` |
| `horario_agendado` | `horario_preferido` (se tiver `:`), `horario_agendado`, `horario`, hora do ISO |
| `bairro_paciente` | `bairro_cliente`, `bairro` |
| `spin_resumo` | `spin`, `resumo_spin` |

**Período x horário específico:** `horario_preferido` pode vir como `"14:30"` ou como `"tarde"`. O regex `/manh[aã]|tarde/i` separa os dois, e o resultado vai em `periodo_preferencia`. Isso muda completamente o caminho dentro do `Logica Inteligente`.

---

## `Logica Inteligente`

**Consome:** o array de dias do `get_avaliable_days`.
**Devolve:** `resultado` (texto pronto para o agente), `sugestoes_horarios[]`, `nome_profissional_sugerido`, e métricas de diagnóstico.

É o nó mais longo e o único com regra de negócio de verdade. Três casos, mutuamente exclusivos:

### Caso PERÍODO — o paciente disse "manhã" ou "tarde"

Filtra os blocos pela janela configurada, ordena por data e hora, e tenta oferecer **dois** horários: o primeiro disponível e um segundo com ao menos 120 minutos de distância no mesmo dia. Não havendo, pega o primeiro de outro dia. Não havendo nenhum no período, informa e oferece o período oposto.

O intervalo de 120 minutos é deliberado: oferecer 09:00 e 09:30 não é escolha real para quem pediu "manhã".

### Caso A — data distante e o paciente não insistiu

Se a data pedida está a mais de `limite_dias_busca_normal` de hoje e `insistiu` não veio `true`, o nó **não** oferece a data pedida. Ele oferece os melhores horários dentro da janela, dizendo quantos dias de distância a data pedida tem.

Isso existe para a agenda não ficar cheia de avaliação marcada para dentro de dois meses, que é a que mais falta. Se o paciente insistir, o agente reenvia com `insistiu: true` e a data distante passa a ser aceita.

### Caso B — fluxo normal

1. Filtra os blocos do dia pedido.
2. Acha o mais próximo do horário pedido.
3. Se a distância for maior que `threshold_proximidade_min` (90 min por padrão), **desiste do dia** e oferece os melhores horários dos dias mais próximos. Oferecer 08:00 para quem pediu 17:00 é pior do que oferecer 17:00 de outro dia.
4. Dentro da tolerância: se houver horário exato, confirma com entusiasmo (`exact_match: true`). Senão, oferece até 3 opções do mesmo dia, ordenadas por proximidade.

### Filtro de profissional

Só entram no cálculo os slots cujo `professionalId` seja o principal ou o fallback. Slot de qualquer outro profissional é descartado. É assim que a agenda de especialista que não faz avaliação nunca é oferecida, e é assim que "dia restrito de dentista" fica sendo regra interna.

### `nome_profissional_sugerido`

Derivado do primeiro bloco sugerido. O padrão Luna exige que `verificar_disponibilidade` devolva esse campo, porque o E8 do agente o usa na confirmação visual e o E11 o grava em `[DENTISTA]`. **Os workflows v3 não devolviam** — quem portar um workflow antigo precisa adicionar.

---

## `Validar Slot Agendar` e `Validar Slot Remarcar`

**Consome:** o retorno de `get_avaliable_times_calendar`.
**Devolve:** `validacao.aprovado`, `validacao.motivo`, `id_profissional_final`, `nome_profissional_final`.

A barreira que impede gravar agendamento em slot que não existe. Procura o horário exato no principal; não achando, no fallback.

Normaliza hora com padding (`9:0` → `09:00`) antes de comparar, porque a API e o agente divergem no formato.

Aceita dois formatos de retorno da API — `AvaliableTimes[]` com `from`/`professionalId`, ou array plano com `From`/`ProfessionalId`. A Clinicorp mudou o formato em algum ponto e os dois aparecem em produção.

Motivos de reprovação, que o agente repassa ao paciente:

| Situação | `motivo` |
|---|---|
| API não devolveu slot | "Não há agenda aberta ou horários disponíveis neste dia." |
| Agente não mandou horário | "Horário solicitado não informado." |
| Horário não existe na agenda | "O horário HH:mm não está disponível." |

O **Remarcar** faz o mesmo e ainda carrega `patient_id_remarcar` e `agendamento_id_antigo`, lidos dos nós anteriores com `try/catch`. O `try/catch` é necessário porque o n8n lança se o nó referenciado não executou naquele caminho.

---

## `Unificar ID Paciente`

**Consome:** os dois caminhos do IF `Paciente Existe?`.
**Devolve:** `id_paciente_final`, `telefone_prontuario`, `data_agendada_iso`, `to_time`.

Tenta primeiro `Criar Novo Paciente`, depois `Buscar Paciente Agendar`, cada um em `try/catch` — só um dos dois executou. Aceita `id`, `PatientId` e `personId` como nome do campo, porque a API varia entre endpoints.

`to_time` = horário + `duracao_servico`. É o que fecha o bloco na agenda.

---

## `Filtrar Agmt Cancelar`

Escolhe, dentro da janela de ±1 dia, qual agendamento cancelar. Primeiro tenta casar `fromTime` com o horário informado; não achando, pega o primeiro com `Deleted !== 'X'`.

O fallback é deliberado: o agente já confirmou com o paciente qual consulta é, e falhar por diferença de horário obrigaria transbordo desnecessário.

---

## `Filtrar Agmt Antigo`

Localiza o agendamento que a remarcação vai substituir e guarda `data_hora_antiga` (`AppointmentDate + fromTime`), usada na resposta "Era X, ficou para Y". Esse texto é o que dá ao paciente a confirmação de que a mudança foi entendida.

---

## `Recuperar Reagendamento`

Remonta o payload de criação **depois** de o antigo ter sido cancelado. `id_paciente_final` vem de `patient_id_remarcar` — quem remarca já é paciente, não há caminho de criação aqui.

---

## `Filtrar Proximo Agmt`

Devolve `proximo_data`, `proximo_hora`, `proximo_id` do primeiro agendamento não deletado. Alimenta os quatro cenários do E7. O agente responde **só** com o que veio — nunca com data suposta, por conta do invariante 12.

---

## `Montar Card` e `Montar Card (Cancelar)`

Detalhe em `CRM_HELENA.md`. O ponto de atenção é o `fields` do `moveBody`, que protege `title` e `description` de serem sobrescritos.

---

## Convenções ao editar um template

- **`DateTime` é o Luxon global do n8n.** Está disponível sem import em Code node.
- **`Buffer` também está disponível** — é como o header Basic é montado.
- **Nunca use `Date.now()` para lógica de agenda.** Use `DateTime.now().setZone(timezone)`, senão o servidor em UTC desloca o dia.
- **Sempre `try/catch` ao referenciar nó de outro caminho.** `$('Nome')` lança se aquele nó não executou.
- **Evite template literal com `${}` se o arquivo passar por substituição de token.** Estes templates usam concatenação com `+` justamente por isso.
- **Depois de editar, valide a sintaxe:**

```bash
for f in templates/*.js; do node --check "$f" && echo "ok $f"; done
```
