# WORKFLOW N8N — ELEGANCE CAMPO GRANDE

## Status

> **Aguardando base do workflow da Elegance Guanabara para adaptação.**
>
> O workflow de agendamento será adaptado da base existente com as seguintes configurações específicas da Elegance Campo Grande.

---

## CONFIGURAÇÕES A PREENCHER

Após receber o workflow base, substituir as seguintes variáveis:

```javascript
// Identificação da unidade
subscriber_id: '[a preencher]'
business_id: '[a preencher]'
nome_unidade: 'EleganceCampoGrande'
link_agenda: '[a preencher — ID da agenda no Controle Odonto]'

// Profissional único
profissional: {
  id: '[a preencher]',
  nome: 'Dr. Vinicius'
}
// Sem profissional_fallback — atendimento exclusivo Dr. Vinicius

// Autorização
authorization: 'Basic [a preencher]'

// Timezone
timezone: 'America/Sao_Paulo'
```

---

## AÇÕES DO WORKFLOW

| Ação | Habilidade Contact.IA | Endpoint Controle Odonto |
|------|----------------------|--------------------------|
| Verificar disponibilidade | `verificar_disponibilidade` | GET /appointment/get_avaliable_days |
| Realizar agendamento | `realizar_agendamento` | POST /appointment/create_appointment_by_api |
| Remarcar agendamento | `remarcar_agendamento` | PATCH + POST |
| Cancelar agendamento | `cancelar_agendamento` | POST /appointment/cancel_appointment |
| Verificar agendamento | `verificar_agendamento_paciente` | GET /appointment/list |

---

## REGRAS DO WORKFLOW

- **Profissional único:** Dr. Vinicius — sem lógica de alternância entre profissionais
- **Dados obrigatórios:** Nome Completo + Telefone (sem data de nascimento)
- **Duração da avaliação:** 15 minutos
- **Horários válidos:**
  - Segunda a sexta: 08:00 às 18:00 (sem bloqueio de almoço)
  - Sábado: 08:00 às 11:45 (último slot para avaliação de 15 min até 12:00)
  - Domingo: BLOQUEADO
- **Feriados:** Verificar ECG_BK_feriados.csv antes de sugerir datas

---

## WEBHOOK

- Path: `agendamentos-elegancecampinas`
- Método: POST
- ID: `elegance-cg-wh-001`
