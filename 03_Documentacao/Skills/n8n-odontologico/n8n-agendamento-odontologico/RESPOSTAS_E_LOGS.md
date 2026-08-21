# Respostas ao Agente e Logs

## O contrato

As 5 habilidades do WTS são **síncronas**: o agente aciona, fica em silêncio, e lê o corpo da resposta. O webhook roda em `responseMode: responseNode`, e cada caminho da execução termina num `respondToWebhook`.

Se um caminho não alcançar um nó de resposta, a habilidade fica pendurada até o timeout, e o agente trata como erro técnico. O validador checa isso branch por branch.

Toda resposta tem um campo **`status`**, que é como o agente decide o que fazer. E toda resposta tem **`resultado`**, texto em português que o agente pode parafrasear — não colar literalmente, porque as regras de formatação do prompt têm precedência sobre o texto que vem daqui.

---

## As 10 respostas

| Nó | `status` | Quando |
|---|---|---|
| `Resp: Disponibilidade` | — devolve o `$json` inteiro | consulta de horários |
| `Resp: Sucesso Agendamento` | `sucesso` | agendamento gravado |
| `Resp: Erro ao Agendar` | `erro_validacao` | slot pedido não existe na agenda |
| `Resp: Cancelamento Feito` | `sucesso` | cancelamento efetivado |
| `Resp: Agmt Nao Encontrado Cancelar` | `nao_encontrado` | não achou o agendamento a cancelar |
| `Resp: Remarcado Sucesso` | `sucesso` | remarcação efetivada |
| `Resp: Antigo Nao Encontrado` | `agendamento_nao_encontrado` | não achou o agendamento original |
| `Resp: Novo Horario Invalido` | `erro_validacao_novo` | achou o antigo, novo horário indisponível |
| `Resp: Agmt Encontrado` | `encontrado` | E7 com agendamento ativo |
| `Resp: Agmt Nao Encontrado` | `nao_encontrado` | E7 sem agendamento |

---

## `Resp: Disponibilidade` — a única que devolve tudo

```
={{ JSON.stringify($json) }}
```

O agente usa vários campos do `Logica Inteligente`:

| Campo | Uso no agente |
|---|---|
| `resultado` | o texto com as opções, base para o E4 |
| `sugestoes_horarios[]` | os horários que ele pode oferecer, e **só eles** |
| `nome_profissional_sugerido` | guardado para o E8 e para `[DENTISTA]` na nota |
| `exact_match` | se `true`, o horário pedido existe: pode confirmar direto |
| `data_distante_bloqueada` | se `true`, a data pedida foi recusada por distância. O agente pode reenviar com `insistiu: true` |
| `total_blocos_validos` | `0` conta como "data sem vaga" para o limite de 3 datas do E4 |
| `usando_fallback` | diagnóstico: o principal não tinha vaga |

> O invariante 2 do padrão Luna — nunca oferecer horário que não veio no retorno — se apoia em `sugestoes_horarios`. Se o agente oferecer algo fora dessa lista, o problema está no prompt, não aqui.

---

## `Resp: Sucesso Agendamento`

```json
{
  "resultado": "Agendamento confirmado! ✅\n\n🗓️ Data: ...\n⏰ Horario: ...\n👨‍⚕️ Dentista: ...\n📍 Unidade: ...",
  "status": "sucesso",
  "nome_profissional_sugerido": "...",
  "data_agendamento": "...",
  "hora_agendamento": "..."
}
```

Os três campos estruturados existem para o agente não precisar extrair nada do `resultado`. O E8 monta a confirmação visual dele com esses campos, no formato do bloco duro da clínica.

**Só este `status: sucesso` autoriza o agente a dizer que está confirmado** — é o invariante 3.

Os emojis vão escapados em `\uXXXX` no JSON gerado. É proposital: emoji literal dentro de expressão n8n às vezes quebra na importação, dependendo do encoding do arquivo.

---

## `Resp: Remarcado Sucesso`

```json
{
  "resultado": "Agendamento remarcado com sucesso! 🔄\n\nEra: <data_hora_antiga>\nFicou para: <nova> as <hora>",
  "status": "sucesso",
  "nome_profissional_sugerido": "..."
}
```

O "Era X, ficou para Y" é o que confirma ao paciente que a mudança foi entendida — e é o que evita a pergunta "mas então cancelou o outro?".

---

## Respostas de falha de negócio

Falha de negócio **não é erro técnico**. Slot indisponível e agendamento não encontrado são resultados legítimos, e o agente segue a conversa:

- `erro_validacao` → o agente volta ao E4 e oferece outro horário.
- `nao_encontrado` no cancelamento → pede confirmação da data.
- `agendamento_nao_encontrado` na remarcação → pede a data atual do agendamento.
- `nao_encontrado` no E7 → oferece agendar (cenário C).

**Erro técnico** é diferente: erro HTTP na Clinicorp derruba a execução, o webhook não responde, a habilidade estoura timeout. Aí sim o agente diz "probleminha técnico", grava `[ALERTA]` e transborda. Ver `CADEIA_CLINICORP.md`, seção de tratamento de erro.

---

## Logs — `metricas_ia`

13 nós Supabase, um depois de cada resposta. O log vem **depois** do `respondToWebhook`, nunca antes: o paciente não espera o banco.

Colunas gravadas:

| Coluna | Valor |
|---|---|
| `clinica` | `config_agenda.nome_empresa` |
| `unidade` | `config_agenda.nome_unidade` |
| `acao` | ver tabela abaixo |
| `status` | `sucesso`, `erro`, `nao_encontrado`, `encontrado` |
| `telefone_paciente` | telefone normalizado |
| `nome_paciente` | nome recebido |
| `detalhes` | texto livre, específico do caminho |

| Nó de log | `acao` | `status` |
|---|---|---|
| `LOG Disponibilidade` | `consulta_disponibilidade` | `sucesso` |
| `LOG Sucesso Agendamento` | `agendamento_realizado` | `sucesso` |
| `LOG Erro Agendar` | `agendamento_realizado` | `erro` |
| `LOG Sucesso Cancelamento` | `cancelamento` | `sucesso` |
| `LOG Erro Cancelar` | `cancelamento` | `nao_encontrado` |
| `LOG Sucesso Remarcacao` | `remarcacao` | `sucesso` |
| `LOG Erro Busca Antigo` | `remarcacao` | `nao_encontrado` |
| `LOG Erro Novo Horario` | `remarcacao` | `erro` |
| `LOG Verificar Encontrado` | `verificar_agendamento` | `encontrado` |
| `LOG Verificar Nao Encontrado` | `verificar_agendamento` | `nao_encontrado` |

Manter `acao` igual entre sucesso e erro da mesma operação é o que permite calcular taxa de conversão por operação com um `group by acao, status`.

---

## As duas credenciais Supabase

| Tabela | Credencial | Papel |
|---|---|---|
| `automacao_clinicas` | "Supa Gabriel" | **lê** a config do CRM |
| `metricas_ia` | "ANDRE ( DASH CONTACT )" | **escreve** o log |

São bancos diferentes. Apontar as duas para a mesma credencial faz uma das duas metades falhar silenciosamente — e a que falha é a que você não estava olhando.

---

## O que o log não cobre

O log registra o que o **workflow** fez. Ele não registra o que o **CRM** fez: as três cadeias de Helena não têm nó de log. Se o card não mover, não há linha em `metricas_ia` dizendo isso.

É uma lacuna conhecida. O diagnóstico do CRM é pelo histórico de execução do n8n e pelo próprio painel — ver a tabela de diagnóstico em `CRM_HELENA.md`. Adicionar log nas cadeias de CRM é uma melhoria em aberto; se for feito, o log tem que vir **depois** do nó de mover ou criar, para não atrasar a resposta ao agente.
