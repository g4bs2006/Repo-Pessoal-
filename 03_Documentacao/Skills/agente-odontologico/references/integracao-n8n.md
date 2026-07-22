# IntegraÃ§Ã£o n8n + Clinicorp (Agendamento)

Documenta o workflow n8n que serve as habilidades de agendamento quando a clÃ­nica usa a agenda **Clinicorp**. ReferÃªncia: `AGENDAMENTOS-OBCLINIC.json` (OB Clinic) e `workflow_referencia_yamar.md` (template de origem, clÃ­nica Yamar â€” nÃ£o usar config dela em outras clÃ­nicas).

---

## Arquitetura Geral

```
WTS (habilidade Acionar API)
   â†’ Webhook n8n (POST /agendamentos-[clinica])
   â†’ Node "Configuracao Unidades" (Code: normalizaÃ§Ã£o + config da clÃ­nica)
   â†’ Node "Guarda de Transito" (Switch por acao_fluxo)
   â†’ Branch da operaÃ§Ã£o â†’ API Clinicorp â†’ resposta formatada para o agente
```

As 5 habilidades de agendamento do agente mapeiam 1:1 para as aÃ§Ãµes do workflow:
`verificar_disponibilidade`, `realizar_agendamento`, `remarcar_agendamento`, `cancelar_agendamento`, `verificar_agendamento_paciente`.

---

## ConfiguraÃ§Ã£o por ClÃ­nica (hardcoded no node de Code)

Coletar estes dados no onboarding da clÃ­nica:

```javascript
{
  subscriber_id:            'oralbemjoinville',      // ID da assinatura Clinicorp
  business_id:              '4837083882979328',
  nome_unidade:             'OBClinic',
  link_agenda:              '769456',                // code_link da agenda
  duracao_servico:          45,                      // minutos da avaliaÃ§Ã£o
  capacidade_simultanea:    2,                       // pacientes por horÃ¡rio
  timezone:                 'America/Sao_Paulo',
  limite_dias_busca_normal: 7,                       // janela de busca (Yamar usa 10)
  profissional:          { id: '6619432407662592', nome: 'Dr. Valter Semiano Vavassori' },
  profissional_fallback: { id: '5707738089127936', nome: 'Dra. Eduarda Rodrigues' },
  authorization: 'Basic ' + Buffer.from('subscriber_id:***API_KEY_REMOVIDA***').toString('base64')
}
```

> A duraÃ§Ã£o da avaliaÃ§Ã£o, capacidade e janela de busca sÃ£o **hardcoded por clÃ­nica** â€” confirmar no briefing. Dias restritos por profissional (ex: Valter â‰  terÃ§a, Eduarda â‰  segunda/sexta) ficam na lÃ³gica do workflow e nas regras internas do E4 â€” nunca revelados ao paciente.

---

## Payload de Entrada (Webhook)

Campos aceitos no body (o node de normalizaÃ§Ã£o aceita aliases):

| Campo | Aliases | Uso |
|---|---|---|
| `acao_fluxo` | `action` | Roteia a operaÃ§Ã£o no Switch |
| `nome_cliente` | `nome_contato` | Nome completo do paciente |
| `telefone_cliente` | `telefone_contato` | Normalizado com `replace(/\D/g, '')` |
| `data_iso` | `data_inicio`, `data_agendada` | ISO `YYYY-MM-DD`, ISO+hora, ou `DD/MM/YYYY HH:MM` (parser aceita os trÃªs) |
| `horario_preferido` | `horario_agendado`, `horario` | HorÃ¡rio exato "HH:MM" **ou** perÃ­odo "manhÃ£"/"tarde" (regex case-insensitive com acentuaÃ§Ã£o) |
| `data_antiga_iso` | â€” | Somente remarcaÃ§Ã£o |
| `bairro_cliente` | â€” | ClÃ­nicas que coletam bairro (ex: Vassoler) |
| `spin` | â€” | Resumo SPIN gravado na observaÃ§Ã£o do agendamento |

**NormalizaÃ§Ãµes do node de Code:** telefone limpo, parse de data multi-formato, detecÃ§Ã£o manhÃ£/tarde, data inicial = hoje no timezone da clÃ­nica, data final = hoje + `limite_dias_busca_normal`.

---

## Roteamento por `acao_fluxo` (Switch "Guarda de Transito")

| `acao_fluxo` | Branch | Endpoint Clinicorp |
|---|---|---|
| `verificar_disponibilidade` | Consultar | `GET /appointment/get_avaliable_days?subscriber_id&code_link&from&to&showAvailableTimes=true` |
| `realizar_agendamento` | Agendar | criaÃ§Ã£o de agendamento (nome, telefone, data/hora, profissional) |
| `remarcar_agendamento` | Remarcar | atualizaÃ§Ã£o (localiza pelo telefone + `data_antiga`, move para `data_alvo`) |
| `cancelar_agendamento` | Cancelar | exclusÃ£o/cancelamento do agendamento localizado |
| `verificar_agendamento_paciente` | Verificar Paciente | consulta por nome/telefone â†’ status (AGENDADO / NENHUM / paciente antigo) |

**Retornos importantes para o agente:**
- `verificar_disponibilidade` â†’ atÃ© 2 horÃ¡rios + **`nome_profissional_sugerido`** (o agente usa `{{nome_profissional_sugerido}}` no E8 e no `[DENTISTA]` da memÃ³ria)
- `verificar_agendamento_paciente` â†’ alimenta os 4 cenÃ¡rios do E7 (ativo / paciente antigo / nenhum / erro)
- Erro em qualquer operaÃ§Ã£o â†’ o agente responde com "probleminha tÃ©cnico" e executa `transferir_atendimento`

---

## Regras de NegÃ³cio do Workflow

1. **Timezone obrigatÃ³rio:** `America/Sao_Paulo` em todo parse e formataÃ§Ã£o
2. **Janela de busca:** prÃ³ximos N dias Ãºteis (7 padrÃ£o); nunca fim de semana/dias fechados da clÃ­nica
3. **AlmoÃ§o:** excluÃ­do da oferta (ex: OB 12:00â€“13:30; Vassoler 12:00â€“13:00)
4. **Feriados:** o agente filtra via `_BK_feriados.csv` no E4 (o workflow nÃ£o bloqueia sozinho)
5. **SeleÃ§Ã£o de profissional:** principal + fallback conforme dia da semana / disponibilidade â€” decisÃ£o do sistema, invisÃ­vel ao paciente
6. **Capacidade simultÃ¢nea:** respeitar `capacidade_simultanea` por slot
7. **Formato de data na resposta ao paciente:** dia da semana + data + horÃ¡rio (alimenta o Pacto de Honra)

---

## Adaptando para uma Nova ClÃ­nica

1. Duplicar o workflow de referÃªncia (OB Clinic Ã© o mais atual; Yamar Ã© o template original)
2. Trocar o path do webhook (`agendamentos-[clinica]`)
3. Atualizar o bloco de configuraÃ§Ã£o: subscriber_id, business_id, link_agenda, authorization, duraÃ§Ã£o, capacidade, janela, profissionais (IDs do Clinicorp)
4. Ajustar dias/horÃ¡rios de funcionamento e almoÃ§o
5. Testar as 5 aÃ§Ãµes com payloads reais antes de ativar as habilidades no WTS
6. Conferir que o retorno de `verificar_disponibilidade` traz `nome_profissional_sugerido`

> **AtenÃ§Ã£o:** `correto.md` (OB Clinic) Ã© a versÃ£o oficial do workflow da OB; `OB_workflow_clinicorp.md` Ã© variante/cÃ³pia â€” em divergÃªncia, `correto.md` manda. `workflow_referencia_yamar.md` tem config de outra clÃ­nica (subscriber_id `6091062965829632`, link `177299`, janela 10 dias) â€” usar apenas como referÃªncia de estrutura.
