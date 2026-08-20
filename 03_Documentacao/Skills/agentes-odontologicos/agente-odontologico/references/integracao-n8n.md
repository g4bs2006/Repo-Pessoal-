# Integração n8n + Clinicorp (Agendamento)

Documenta o workflow n8n que serve as habilidades de agendamento quando a clínica usa a agenda **Clinicorp**. Referência: `AGENDAMENTOS-OBCLINIC.json` (OB Clinic) e `workflow_referencia_yamar.md` (template de origem, clínica Yamar — não usar config dela em outras clínicas).

---

## Arquitetura Geral

```
WTS (habilidade Acionar API)
   → Webhook n8n (POST /agendamentos-[clinica])
   → Node "Configuracao Unidades" (Code: normalização + config da clínica)
   → Node "Guarda de Transito" (Switch por acao_fluxo)
   → Branch da operação → API Clinicorp → resposta formatada para o agente
```

As 5 habilidades de agendamento do agente mapeiam 1:1 para as ações do workflow:
`verificar_disponibilidade`, `realizar_agendamento`, `remarcar_agendamento`, `cancelar_agendamento`, `verificar_agendamento_paciente`.

---

## Configuração por Clínica (hardcoded no node de Code)

Coletar estes dados no onboarding da clínica:

```javascript
{
  subscriber_id:            'oralbemjoinville',      // ID da assinatura Clinicorp
  business_id:              '4837083882979328',
  nome_unidade:             'OBClinic',
  link_agenda:              '769456',                // code_link da agenda
  duracao_servico:          45,                      // minutos da avaliação
  capacidade_simultanea:    2,                       // pacientes por horário
  timezone:                 'America/Sao_Paulo',
  limite_dias_busca_normal: 7,                       // janela de busca (Yamar usa 10)
  profissional:          { id: '6619432407662592', nome: 'Dr. Valter Semiano Vavassori' },
  profissional_fallback: { id: '5707738089127936', nome: 'Dra. Eduarda Rodrigues' },
  authorization: 'Basic ' + Buffer.from('subscriber_id:API_KEY').toString('base64')
}
```

> A duração da avaliação, capacidade e janela de busca são **hardcoded por clínica** — confirmar no briefing. Dias restritos por profissional (ex: Valter ≠ terça, Eduarda ≠ segunda/sexta) ficam na lógica do workflow e nas regras internas do E4 — nunca revelados ao paciente.

---

## Payload de Entrada (Webhook)

Campos aceitos no body (o node de normalização aceita aliases):

| Campo | Aliases | Uso |
|---|---|---|
| `acao_fluxo` | `action` | Roteia a operação no Switch |
| `nome_cliente` | `nome_contato` | Nome completo do paciente |
| `telefone_cliente` | `telefone_contato` | Normalizado com `replace(/\D/g, '')` |
| `data_iso` | `data_inicio`, `data_agendada` | ISO `YYYY-MM-DD`, ISO+hora, ou `DD/MM/YYYY HH:MM` (parser aceita os três) |
| `horario_preferido` | `horario_agendado`, `horario` | Horário exato "HH:MM" **ou** período "manhã"/"tarde" (regex case-insensitive com acentuação) |
| `data_antiga_iso` | — | Somente remarcação |
| `bairro_cliente` | — | Clínicas que coletam bairro (ex: Vassoler) |
| `spin` | — | Resumo SPIN gravado na observação do agendamento |

**Normalizações do node de Code:** telefone limpo, parse de data multi-formato, detecção manhã/tarde, data inicial = hoje no timezone da clínica, data final = hoje + `limite_dias_busca_normal`.

---

## Roteamento por `acao_fluxo` (Switch "Guarda de Transito")

| `acao_fluxo` | Branch | Endpoint Clinicorp |
|---|---|---|
| `verificar_disponibilidade` | Consultar | `GET /appointment/get_avaliable_days?subscriber_id&code_link&from&to&showAvailableTimes=true` |
| `realizar_agendamento` | Agendar | criação de agendamento (nome, telefone, data/hora, profissional) |
| `remarcar_agendamento` | Remarcar | atualização (localiza pelo telefone + `data_antiga`, move para `data_alvo`) |
| `cancelar_agendamento` | Cancelar | exclusão/cancelamento do agendamento localizado |
| `verificar_agendamento_paciente` | Verificar Paciente | consulta por nome/telefone → status (AGENDADO / NENHUM / paciente antigo) |

**Retornos importantes para o agente:**
- `verificar_disponibilidade` → até 2 horários + **`nome_profissional_sugerido`** (o agente usa `{{nome_profissional_sugerido}}` no E8 e no `[DENTISTA]` da memória)
- `verificar_agendamento_paciente` → alimenta os 4 cenários do E7 (ativo / paciente antigo / nenhum / erro)
- Erro em qualquer operação → o agente responde com "probleminha técnico" e executa `transferir_atendimento`

---

## Regras de Negócio do Workflow

1. **Timezone obrigatório:** `America/Sao_Paulo` em todo parse e formatação
2. **Janela de busca:** próximos N dias úteis (7 padrão); nunca fim de semana/dias fechados da clínica
3. **Almoço:** excluído da oferta (ex: OB 12:00–13:30; Vassoler 12:00–13:00)
4. **Feriados:** o agente filtra via `_BK_feriados.csv` no E4 (o workflow não bloqueia sozinho)
5. **Seleção de profissional:** principal + fallback conforme dia da semana / disponibilidade — decisão do sistema, invisível ao paciente
6. **Capacidade simultânea:** respeitar `capacidade_simultanea` por slot
7. **Formato de data na resposta ao paciente:** dia da semana + data + horário (alimenta o Pacto de Honra)

---

## Adaptando para uma Nova Clínica

1. Duplicar o workflow de referência (OB Clinic é o mais atual; Yamar é o template original)
2. Trocar o path do webhook (`agendamentos-[clinica]`)
3. Atualizar o bloco de configuração: subscriber_id, business_id, link_agenda, authorization, duração, capacidade, janela, profissionais (IDs do Clinicorp)
4. Ajustar dias/horários de funcionamento e almoço
5. Testar as 5 ações com payloads reais antes de ativar as habilidades no WTS
6. Conferir que o retorno de `verificar_disponibilidade` traz `nome_profissional_sugerido`

> **Atenção:** `correto.md` (OB Clinic) é a versão oficial do workflow da OB; `OB_workflow_clinicorp.md` é variante/cópia — em divergência, `correto.md` manda. `workflow_referencia_yamar.md` tem config de outra clínica (subscriber_id `6091062965829632`, link `177299`, janela 10 dias) — usar apenas como referência de estrutura.
