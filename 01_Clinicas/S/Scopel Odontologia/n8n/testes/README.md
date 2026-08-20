# Payloads de teste — Scopel Odontologia

Os 5 payloads das 5 ações do agente, na ordem certa (3, 4 e 5 dependem do agendamento criado pelo 2). Vêm de `VALIDACAO.md` da skill `n8n-agendamento-odontologico`.

## Como disparar

O workflow importado (`AGENDAMENTOS - Scopel Odontologia (novo)`) está **desativado**. Pra testar sem ativar:

1. Abra o workflow no n8n.
2. Clique no nó `INICIO` (webhook) → **"Listen for test event"**.
3. Copie a URL de teste que aparece (é diferente da URL de produção — só funciona uma vez, enquanto estiver "escutando").
4. Dispare o payload:

```bash
curl -X POST "<URL_DE_TESTE>" -H "Content-Type: application/json" -d @01_verificar_disponibilidade.json
```

Repita "Listen for test event" antes de cada chamada — ele escuta uma execução por vez.

Se preferir ativar de verdade em vez de testar um por um: ativa na UI e usa a URL de produção (`https://n8n.dentistapower.com.br/webhook/agendamentos-scopel`) direto, sem precisar clicar em "Listen" a cada chamada.

## Ordem e o que conferir

| # | Arquivo | O que checar na resposta |
|---|---|---|
| 1 | `01_verificar_disponibilidade.json` | `sugestoes_horarios` preenchido, `nome_profissional_sugerido` = Dr Hugo Barretto |
| 2 | `02_realizar_agendamento.json` | `status: sucesso`, o agendamento aparece na agenda Clinicorp de verdade |
| 3 | `03_verificar_agendamento_paciente.json` | Encontra o agendamento criado no passo 2, com a data/hora certas |
| 4 | `04_remarcar_agendamento.json` | `status: sucesso`, "Era 24/08, ficou para 26/08" |
| 5 | `05_cancelar_agendamento.json` | `status: sucesso`, agendamento sai da agenda Clinicorp |

## Sobre `id_atendimento`

Todos usam `"TESTE-SCOPEL-001"` — um valor fixo, não uma sessão real do WTS. Isso é suficiente pra testar as **5 ações contra a Clinicorp de verdade**, mas a parte de **CRM da Helena** (etiqueta + card) não vai funcionar com esse id, porque `Buscar Sessao` não vai achar nenhum `contactId` real — vai falhar fechado, sem erro visível, exatamente como documentado em `CRM_HELENA.md`. Pra testar o CRM de ponta a ponta, precisa de um `id_atendimento` de uma sessão de chat real no WTS.

## ⚠️ Isso cria e altera um agendamento de verdade

O passo 2 cria um agendamento real no Clinicorp da Scopel (paciente "Paciente Teste", telefone fictício `41999990000`). Os passos 4 e 5 remarcam e depois cancelam esse mesmo agendamento, então ao final da sequência **não sobra nada pendente na agenda real**. Se parar no meio (por exemplo, só rodar 1 e 2), vai ficar um agendamento de teste na agenda — cancelar manualmente se não for continuar a sequência.
