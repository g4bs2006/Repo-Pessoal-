# Integração n8n + Clinicorp (Agendamento) — Padrão Luna

Workflow que serve as 5 habilidades de agendamento. Referências de implementação: OB Clinic (`AGENDAMENTOS-OBCLINIC.json` / `correto.md`), Atos (`agendamento_ia_atos.json`), Yamar (template de origem — usar só como estrutura, a config é de outra clínica).

## O que muda na v4

O workflow em si é o mesmo. Duas exigências passam de "recomendado" a **obrigatório**:

1. **`id_atendimento` no payload de toda ação.** Na v3 ele só era necessário se a clínica usasse o subsistema de CRM. Na v4 o CRM é o único lugar onde etiquetas e cards são aplicados, então sem `id_atendimento` o agente perde a marcação inteira — silenciosamente, sem erro.
2. **Fan-out de CRM nas três operações.** Ver `integracao-crm-cards.md`.

---

## Arquitetura geral

```
WTS (habilidade Acionar API)
   → Webhook n8n (POST /agendamentos-[clinica])
   → Node "Configuracao Unidades" (Code: normalização + config da clínica)
   → Node "Guarda de Transito" (Switch por acao_fluxo)
   → Branch da operação → API Clinicorp → resposta formatada para o agente
                                        └→ (fan-out) subsistema de CRM da Helena
```

As 5 habilidades mapeiam 1:1 para as ações: `verificar_disponibilidade`, `realizar_agendamento`, `remarcar_agendamento`, `cancelar_agendamento`, `verificar_agendamento_paciente`.

---

## Configuração por clínica (hardcoded no node de Code)

Coletar no onboarding:

```javascript
{
  subscriber_id:            'oralbemjoinville',      // ID da assinatura Clinicorp
  business_id:              '4837083882979328',
  nome_unidade:             'OBClinic',
  link_agenda:              '769456',                // code_link da agenda
  duracao_servico:          45,                      // minutos da avaliação
  capacidade_simultanea:    2,                       // pacientes por horário
  timezone:                 'America/Sao_Paulo',
  limite_dias_busca_normal: 7,                       // janela de busca
  profissional:          { id: '6619432407662592', nome: 'Dr. Valter Semiano Vavassori' },
  profissional_fallback: { id: '5707738089127936', nome: 'Dra. Eduarda Rodrigues' },
  helena_company_id:        '<UUID da clínica>',     // obrigatório na v4
  authorization: 'Basic ' + Buffer.from('subscriber_id:API_KEY').toString('base64')
}
```

Duração, capacidade e janela de busca são hardcoded por clínica — confirmar no briefing. Dias restritos por profissional ficam na lógica do workflow, nunca revelados ao paciente.

---

## Payload de entrada (webhook)

| Campo | Aliases | Uso |
|---|---|---|
| `acao_fluxo` | `action` | Roteia a operação no Switch |
| `id_atendimento` | `atendimento_id`, `session_id`, `sessionId` | **Obrigatório na v4** — resolve o `contactId` para o CRM |
| `nome_cliente` | `nome_contato` | Nome completo do paciente |
| `telefone_cliente` | `telefone_contato` | Normalizado com `replace(/\D/g, '')` |
| `data_iso` | `data_inicio`, `data_agendada` | ISO `YYYY-MM-DD`, ISO+hora, ou `DD/MM/YYYY HH:MM` |
| `horario_preferido` | `horario_agendado`, `horario` | "HH:MM" **ou** período "manhã"/"tarde" |
| `data_antiga_iso` | — | Só remarcação |
| `bairro_cliente` | — | Clínicas que coletam bairro |
| `unidade` | — | Clínicas multi-unidade |
| `spin` | — | Resumo do SPIN, gravado na observação do agendamento |

**Normalizações do node de Code:** telefone limpo; parse de data multi-formato; detecção de manhã/tarde por regex com acentuação; data inicial = hoje no timezone da clínica; data final = hoje + `limite_dias_busca_normal`.

> No campo `spin`, o Luna escreve um resumo melhor do que os modelos anteriores — vale investir nesse campo. O dentista abre a agenda e já sabe a dor, a frase-chave e a urgência do paciente. Pedir explicitamente na descrição de `realizar_agendamento`: dor, frase marcante do lead, urgência e o que motivou o contato.

---

## Roteamento por `acao_fluxo`

| `acao_fluxo` | Branch | Endpoint Clinicorp |
|---|---|---|
| `verificar_disponibilidade` | Consultar | `GET /appointment/get_avaliable_days?subscriber_id&code_link&from&to&showAvailableTimes=true` |
| `realizar_agendamento` | Agendar | criação de agendamento (nome, telefone, data/hora, profissional) |
| `remarcar_agendamento` | Remarcar | atualização (localiza por telefone + `data_antiga`, move para `data_alvo`) |
| `cancelar_agendamento` | Cancelar | cancelamento do agendamento localizado |
| `verificar_agendamento_paciente` | Verificar Paciente | consulta por nome/telefone → AGENDADO / NENHUM / paciente antigo |

**Retornos que o agente usa:**
- `verificar_disponibilidade` → até 2 horários + **`nome_profissional_sugerido`** (usado no E8 e no campo `[DENTISTA]` da nota)
- `verificar_agendamento_paciente` → alimenta os 4 cenários do E7
- Erro em qualquer operação → o agente diz "probleminha técnico", grava `[ALERTA]` e transfere

---

## Regras de negócio do workflow

1. **Timezone** `America/Sao_Paulo` em todo parse e formatação.
2. **Janela de busca:** próximos N dias úteis (7 padrão); nunca fim de semana nem dias fechados.
3. **Almoço** excluído da oferta (ex: 12:00–13:30).
4. **Feriados:** filtrados **pelo agente** via `_BK_feriados.csv`. O workflow não bloqueia sozinho.
5. **Seleção de profissional:** principal + fallback conforme dia e disponibilidade — decisão do sistema, invisível ao paciente.
6. **Capacidade simultânea** respeitada por slot.
7. **Formato da data na resposta:** dia da semana + data + horário, que é o que alimenta o Pacto de Honra.

---

## Adaptando para uma clínica nova

1. Duplicar o workflow de referência mais atual.
2. Trocar o path do webhook (`agendamentos-[clinica]`).
3. Atualizar o bloco de configuração: subscriber_id, business_id, link_agenda, authorization, duração, capacidade, janela, profissionais, **`helena_company_id`**.
4. Ajustar horários de funcionamento e almoço.
5. Adicionar a captura de `id_atendimento` no `Configuracao Unidades` (os 4 aliases).
6. Portar o subsistema de CRM com as **três** cadeias etiquetando o contato — ver `integracao-crm-cards.md`.
7. Testar as 5 ações com payload real antes de ativar as habilidades no WTS.
8. Conferir que `verificar_disponibilidade` devolve `nome_profissional_sugerido`.
9. **Teste de ponta a ponta:** um agendamento de teste deve mover o card e etiquetar o contato na Helena. Se não mover, provavelmente é `id_atendimento` faltando no payload da habilidade — a falha é silenciosa.

> Cuidado com as variantes de arquivo: na OB Clinic, `correto.md` é a versão oficial e `OB_workflow_clinicorp.md` é cópia — em divergência, `correto.md` manda. O `workflow_referencia_yamar.md` tem config de outra clínica (janela de 10 dias, outro `link_agenda`) — serve como referência de estrutura, nunca de valores.
