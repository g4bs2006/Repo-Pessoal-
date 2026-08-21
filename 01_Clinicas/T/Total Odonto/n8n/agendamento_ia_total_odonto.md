# Workflow n8n — Agendamento IA | Total Odonto (Clinicorp)

Documentação do fluxo de agendamento para a Total Odonto, baseada no padrão de `references/integracao-n8n.md` e nos workflows de referência da Vassoler e da OB Clinic. Este documento descreve como montar o workflow no n8n, não é um export `.json`.

---

## 1. Arquitetura Geral

```
WTS (habilidade Acionar API)
   → Webhook n8n (POST /agendamentos-totalodonto)
   → Node "Configuracao Total Odonto" (Code: normalização + config da clínica)
   → Node "Guarda de Transito" (Switch por acao_fluxo)
   → Branch da operação → API Clinicorp → resposta formatada para o agente
```

As 5 habilidades de agendamento do agente Thaina mapeiam 1:1 para as ações do workflow:
`verificar_disponibilidade`, `realizar_agendamento`, `remarcar_agendamento`, `cancelar_agendamento`, `verificar_agendamento_paciente`.

---

## 2. Configuração da Clínica (hardcoded no node de Code)

Dados reais coletados via API Clinicorp nesta conversa de onboarding:

```javascript
const CONFIGS = {
  totalodonto: {
    subscriber_id:            'totalclin',
    business_id:              '6341293490438144',   // "TotalOdonto Odontologia" (nome retornado pela API)
    nome_unidade:              'Total Odonto',
    nome_empresa:              'Total Odonto',
    link_agenda:               '253298',             // code_link — https://agenda.link/253298
    duracao_servico:           30,                   // minutos da avaliação
    capacidade_simultanea:     2,                    // pacientes por horário
    timezone:                  'America/Sao_Paulo',
    limite_dias_busca_normal:  7,
    idade_minima:              12,                   // não atende odontopediatria — validar antes de agendar
    profissional: {
      id:   '6329761874378752',
      nome: 'Dra. Kaira Lopes Campos'                // única com fromOnlineScheduling=true
    },
    profissional_fallback: null,                      // não há profissional fallback nesta clínica
    authorization: 'Basic ' + Buffer.from('totalclin:fd2d6a1d-2e01-4aa0-9e7b-c8fe08848eef').toString('base64')
  }
};
```

> **Base URL da API Clinicorp:** `https://api.clinicorp.com/rest/v1` (Basic Auth, ver `03_Documentacao/clinicorp-api-docs/00_autenticacao.md`).
> **Único profissional:** diferente da OB Clinic (2 profissionais com fallback), a Total Odonto tem apenas a Dra. Kaira Lopes Campos cadastrada para agendamento online (`fromOnlineScheduling=true`, ver `11_professional.md`). Não há lógica de fallback entre profissionais neste workflow — todo agendamento é direcionado a `profissional.id`.

---

## 3. Regras de Negócio Específicas da Total Odonto (aplicadas no Code)

1. **Regra da segunda-feira (CRÍTICO):** ao filtrar os slots retornados pela Clinicorp, descartar qualquer horário de segunda-feira com `fromTime` anterior a `10:00`, mesmo que a API retorne o slot como disponível. Essa regra é exclusiva desta clínica (reunião geral da equipe pela manhã).
   ```javascript
   function filtrarSegundaAntes10h(blocos) {
     return blocos.filter(b => {
       const diaSemana = DateTime.fromFormat(b.data, 'yyyy-MM-dd').weekday; // 1 = segunda
       if (diaSemana === 1 && b.minutos < 10 * 60) return false;
       return true;
     });
   }
   ```
2. **Sábado sem fechamento fixo:** não aplicar corte de horário de fechamento hardcoded para sábado — usar exatamente o que a Clinicorp retornar como disponível para o dia (`AvaliableTimes`). Não impor `18:00` nem qualquer outro horário de corte.
3. **Domingo fechado:** a própria agenda da Clinicorp não deve ter slots cadastrados no domingo. Ainda assim, como segurança, filtrar `weekday === 7` no Code antes de repassar ao agente.
4. **Almoço:** não há intervalo de almoço fixo cadastrado no BK desta clínica — não aplicar nenhum filtro de horário de almoço no Code. Repassar fielmente o que a Clinicorp retornar.
5. **Idade mínima (12 anos):** validação feita no **agente** (E1/E9/E10), a partir da data de nascimento coletada. O workflow n8n não precisa validar idade, mas pode opcionalmente rejeitar `realizar_agendamento` se receber `idade < 12` no payload, retornando erro amigável.
6. **Feriados:** filtrados pelo agente via `TO_BK_feriados.csv` no E4, o workflow não bloqueia datas de feriado sozinho.
7. **Capacidade simultânea:** respeitar `capacidade_simultanea = 2` por slot (2 avaliações no mesmo horário).
8. **Encaixes:** somente emergências — não há lógica automática de encaixe no workflow, tratado manualmente pela clínica quando necessário.

---

## 4. Payload de Entrada (Webhook)

`POST /agendamentos-totalodonto`

Campos aceitos no body (o node de normalização aceita aliases herdados do padrão v3):

| Campo | Aliases | Uso |
|---|---|---|
| `acao_fluxo` | `action` | Roteia a operação no Switch |
| `nome_cliente` | `nome_contato` | Nome completo do paciente |
| `nascimento_cliente` | `data_nascimento` | Data de nascimento do paciente — **campo próprio da Total Odonto**, formato `YYYY-MM-DD` |
| `telefone_cliente` | `telefone_contato` | Normalizado com `replace(/\D/g, '')`. Na maioria dos casos já vem preenchido pelo número de WhatsApp do contato |
| `data_iso` | `data_inicio`, `data_agendada` | ISO `YYYY-MM-DD`, ISO+hora, ou `DD/MM/YYYY HH:MM` (parser aceita os três) |
| `horario_preferido` | `horario_agendado`, `horario` | Horário exato "HH:MM" **ou** período "manhã"/"tarde" (regex case-insensitive com acentuação) |
| `data_antiga_iso` | — | Somente remarcação |
| `cidade_cliente` | — | Observação opcional — não bloqueia o agendamento se ausente |
| `spin` | — | Resumo SPIN gravado na observação (`Notes`) do agendamento |

**Normalizações do node de Code:** telefone limpo, parse de data multi-formato, detecção manhã/tarde, data inicial = hoje no timezone da clínica, data final = hoje + `limite_dias_busca_normal`, filtro da regra de segunda antes das 10h.

---

## 5. Roteamento por `acao_fluxo` (Switch "Guarda de Transito")

| `acao_fluxo` | Branch | Endpoint Clinicorp |
|---|---|---|
| `verificar_disponibilidade` | Consultar | `GET /appointment/get_avaliable_days?subscriber_id=totalclin&professionalId=6329761874378752&businessId=6341293490438144&fromDate=YYYYMMDD&toDate=YYYYMMDD` |
| `realizar_agendamento` | Agendar | `POST /appointment/create_appointment_by_api` (após checar/criar paciente via `/patient/get` e `/patient/create`) |
| `remarcar_agendamento` | Remarcar | localizar via `/appointment/list` pelo `patientId` + `data_antiga`, cancelar (`/appointment/cancel_appointment`) e recriar (`/appointment/create_appointment_by_api`) na `data_alvo` |
| `cancelar_agendamento` | Cancelar | `POST /appointment/cancel_appointment` (após localizar o `appointmentId` via `/appointment/list`) |
| `verificar_agendamento_paciente` | Verificar Paciente | `GET /patient/get` (por telefone) + `GET /patient/list_appointments` para status (AGENDADO / NENHUM / paciente antigo) |

> **Atenção ao endpoint de disponibilidade:** `GET /appointment/get_avaliable_days` exige `fromDate`/`toDate` no formato `YYYYMMDD` (sem hífen), diferente da maioria dos endpoints da Clinicorp que usam `YYYY-MM-DD` — ver `03_Documentacao/clinicorp-api-docs/05_appointment.md`.

**Retornos importantes para o agente:**
- `verificar_disponibilidade` → até 2 horários + `nome_profissional_sugerido` (sempre "Dra. Kaira Lopes Campos" nesta clínica, único profissional cadastrado para agendamento online). O agente usa `{{nome_profissional_sugerido}}` no E8 e no `[DENTISTA]` da memória.
- `verificar_agendamento_paciente` → alimenta os 4 cenários do E7 (ativo / paciente antigo / nenhum / erro).
- Erro em qualquer operação → o agente responde com "probleminha técnico" e executa `transferir_atendimento`.

---

## 6. Fluxo Detalhado — `verificar_disponibilidade`

1. Node "Configuracao Total Odonto" normaliza o payload e monta `config_agenda`.
2. `GET /appointment/get_avaliable_days` com `professionalId=6329761874378752`, `businessId=6341293490438144`, `fromDate`/`toDate` em `YYYYMMDD`.
3. Node de Code "Logica Inteligente Total Odonto":
   - Filtra slots por `professionalId` da Dra. Kaira (não há fallback).
   - Aplica o filtro da regra da segunda-feira (descarta slots de segunda antes das 10h).
   - Se `periodo_preferencia` informado (manhã/tarde), filtra pela faixa horária e ordena por proximidade.
   - Se `data_agendada` + `horario_agendado` específicos informados, tenta match exato; se não houver, retorna o slot antes e o slot depois mais próximos.
   - Monta a resposta com no máximo 2 sugestões (`sugestoes_horarios`) e o campo `nome_profissional_sugerido: "Dra. Kaira Lopes Campos"`.
4. `Resp: Disponibilidade` retorna JSON ao WTS.

---

## 7. Fluxo Detalhado — `realizar_agendamento`

1. `GET /appointment/get_avaliable_times_calendar` (ou reaproveitar o retorno do passo de disponibilidade) para validar que o slot pedido ainda está livre com `professionalId=6329761874378752`.
2. Se o slot não estiver mais disponível: `Resp: Erro ao Agendar` com mensagem amigável, o agente reoferece novo horário via E4.
3. `GET /patient/get?subscriber_id=totalclin&Phone={telefone_limpo}` para checar se o paciente já existe.
4. Se não existir: `POST /patient/create` com `Name`, `Phone` e `BirthDate` (campo `nascimento_cliente` do payload — **obrigatório nesta clínica**, diferente do padrão v3 que normalmente não usa este campo).
5. `POST /appointment/create_appointment_by_api` com:
   ```json
   {
     "Clinic_BusinessId": 6341293490438144,
     "Dentist_PersonId": 6329761874378752,
     "Patient_PersonId": "{{id_paciente_final}}",
     "PatientName": "{{nome_paciente}}",
     "MobilePhone": "{{telefone_limpo}}",
     "date": "{{data_agendada_iso}}",
     "fromTime": "{{horario_agendado}}",
     "toTime": "{{horario_agendado + 30min}}",
     "Notes": "Agendamento realizado via IA (Total Odonto) — SPIN: {{spin}}",
     "CategoryDescription": "Avaliação"
   }
   ```
6. `Resp: Sucesso Agendamento` retorna confirmação com data, horário e `nome_profissional_sugerido`.

---

## 8. Fluxo Detalhado — `remarcar_agendamento`

1. `GET /patient/get?subscriber_id=totalclin&Phone={telefone_limpo}` para obter `PatientId`.
2. `GET /appointment/list?subscriber_id=totalclin&from={data_antiga-1dia}&to={data_antiga+1dia}&businessId=6341293490438144&patientId={PatientId}` para localizar o agendamento pela `data_antiga`.
3. Validar novo slot livre (`verificar_disponibilidade` reaproveitado ou nova consulta a `get_avaliable_times_calendar`).
4. `POST /appointment/cancel_appointment` no agendamento antigo (`subscriber_id`, `id`/`appointmentId`).
5. `POST /appointment/create_appointment_by_api` no novo horário (mesma estrutura do agendamento normal).
6. `Resp: Sucesso Remarcação` retorna confirmação com a nova data e horário.

---

## 9. Fluxo Detalhado — `cancelar_agendamento`

1. `GET /patient/get?subscriber_id=totalclin&Phone={telefone_limpo}` para obter `PatientId`.
2. `GET /appointment/list?subscriber_id=totalclin&from={data_agendada-1dia}&to={data_agendada+1dia}&businessId=6341293490438144&patientId={PatientId}` para localizar o `appointmentId`.
3. Se encontrado: `POST /appointment/cancel_appointment` com `subscriber_id` e `appointmentId`.
4. Se não encontrado: `Resp: Agmt Nao Encontrado Cancelar` — o agente pede confirmação da data ao paciente.
5. `Resp: Cancelamento Feito` retorna confirmação de sucesso.

---

## 10. Fluxo Detalhado — `verificar_agendamento_paciente`

1. `GET /patient/get?subscriber_id=totalclin&Phone={telefone_limpo}` (ou por nome, se telefone ausente).
2. Se paciente não encontrado → retornar `status: nenhum` (Cenário C do E7).
3. Se paciente encontrado → `GET /patient/list_appointments?subscriber_id=totalclin&patientId={PatientId}`.
   - Se houver agendamento futuro ativo com `Notes` contendo "via IA" → `status: agendado_ia` (Cenário A).
   - Se houver histórico de agendamentos antigos sem vínculo com a IA → `status: paciente_antigo` (Cenário B) → o agente transfere direto.
   - Se não houver nenhum agendamento → `status: nenhum` (Cenário C).
4. Erro de conexão com a API → `status: erro` (Cenário D) → o agente transfere.

---

## 11. Adaptando este Workflow (checklist de implementação)

1. Duplicar o workflow de referência mais completo (Vassoler ou OB Clinic) como ponto de partida.
2. Trocar o path do webhook para `agendamentos-totalodonto`.
3. Atualizar o bloco de configuração com os dados reais: `subscriber_id=totalclin`, `business_id=6341293490438144`, `link_agenda=253298`, `authorization` em base64 de `totalclin:fd2d6a1d-2e01-4aa0-9e7b-c8fe08848eef`.
4. Configurar `profissional = { id: '6329761874378752', nome: 'Dra. Kaira Lopes Campos' }` e **remover** qualquer lógica de `profissional_fallback` (não há segundo profissional online nesta clínica).
5. Implementar o filtro da regra da segunda-feira (bloquear slots antes das 10h em segundas) no node de lógica de disponibilidade.
6. **Não** implementar corte de horário de almoço nem de fechamento de sábado — repassar fielmente o retorno da Clinicorp para esses casos.
7. Adicionar o campo `BirthDate`/`nascimento_cliente` no fluxo de `patient/create` e no corpo salvo do agendamento — obrigatório nesta clínica.
8. Testar as 5 ações com payloads reais antes de ativar as habilidades no WTS, com atenção especial a:
   - Um horário de segunda-feira às 08:00 (deve ser bloqueado).
   - Um horário de segunda-feira às 10:30 (deve ser aceito).
   - Um horário de sábado à tarde (deve respeitar o que a Clinicorp de fato tiver cadastrado, sem corte artificial).
9. Conferir que o retorno de `verificar_disponibilidade` traz `nome_profissional_sugerido: "Dra. Kaira Lopes Campos"` em todos os casos de sucesso.

---

## 12. Referência Cruzada

- Guia geral do padrão n8n v3: `03_Documentacao/Skills/agentes-odontologicos/agente-odontologico/references/integracao-n8n.md`
- Workflow de referência mais completo (estrutura de nodes): `01_Clinicas/V/Vassoler/n8n/agendamento_ia_vassoler.json`
- Workflow de referência com lógica de fallback entre profissionais (não aplicável à Total Odonto, mas útil para entender a estrutura de nodes): `01_Clinicas/O/OB Clinic/n8n/correto.md`
- Documentação oficial dos endpoints Clinicorp usados: `03_Documentacao/clinicorp-api-docs/00_autenticacao.md`, `05_appointment.md`, `09_patient.md`, `11_professional.md`
