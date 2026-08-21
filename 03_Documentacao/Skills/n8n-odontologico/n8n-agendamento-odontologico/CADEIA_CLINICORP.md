# As 5 Cadeias Clinicorp — nó por nó

Base: `https://api.clinicorp.com/rest/v1`
Auth: header `Authorization: Basic base64(auth_user:api_key)`, montado em `Configuracao Unidades` e lido por expressão em todo nó HTTP.

Toda cadeia começa numa saída do `Guarda de Transito` (Switch por `acao_fluxo`) e termina num `respondToWebhook` seguido de um log no Supabase.

---

## Core

### `INICIO` — webhook

`POST /<path>`, `responseMode: responseNode`. O modo é obrigatório: as 5 habilidades do WTS são síncronas e leem o corpo da resposta.

### `Configuracao Unidades` — Code

Faz cinco coisas:

1. **Captura `id_atendimento`** com os 4 aliases (`id_atendimento`, `atendimento_id`, `session_id`, `sessionId`).
2. **Monta o `CONFIG`** da clínica, incluindo o header Basic.
3. **Normaliza o telefone** com `replace(/\D/g,'')`.
4. **Faz o parse de data multi-formato**: ISO, `yyyy-MM-dd HH:mm`, `dd/MM/yyyy HH:mm`, `dd/MM/yyyy`. O agente manda em formatos diferentes conforme o estágio, e o parse tolerante é o que evita erro bobo.
5. **Detecta período** (`manhã` / `tarde`) por regex com acentuação, separando "período" de "horário específico".

Também deriva `data_fim` = `data_agendada + limite_dias_busca_normal`, que é a janela do `get_avaliable_days`.

### `Guarda de Transito` — Switch

Cinco saídas nomeadas, comparando `$json.acao_fluxo` com igualdade estrita:

| Saída | `acao_fluxo` |
|---|---|
| 0 Consultar | `verificar_disponibilidade` |
| 1 Agendar | `realizar_agendamento` |
| 2 Cancelar | `cancelar_agendamento` |
| 3 Remarcar | `remarcar_agendamento` |
| 4 Verificar Paciente | `verificar_agendamento_paciente` |

Sem saída de fallback: `acao_fluxo` errado simplesmente não roteia, e a habilidade estoura timeout. Se isso acontecer em teste, confira o nome da ação na descrição da habilidade no WTS.

---

## 1. Consultar disponibilidade — 4 nós

```
Verificar Agenda Disponibilidade → Logica Inteligente → Resp: Disponibilidade → LOG Disponibilidade
```

**`Verificar Agenda Disponibilidade`** — `GET /appointment/get_avaliable_days`

| Query | Valor |
|---|---|
| `code_link` | `config_agenda.link_agenda` |
| `from` | `data_inicio` (hoje no timezone) |
| `to` | `data_fim` |
| `showAvailableTimes` | `True` — sem isso a API devolve só os dias, sem os horários |
| `subscriber_id` | `config_agenda.subscriber_id` |

Retorno: array de dias, cada um com `jsonDate`, `Week` e `AvaliableTimes[]` (`from`, `to`, `professionalId`, `isSelectable`).

**`Logica Inteligente`** — o cérebro da oferta. Detalhe em `CODE_NODES.md`. Devolve `resultado` (texto pronto), `sugestoes_horarios[]` e **`nome_profissional_sugerido`**.

**`Resp: Disponibilidade`** — devolve o `$json` inteiro. É a única resposta que não é um objeto montado à mão, porque o agente usa vários campos dela.

---

## 2. Agendar — 12 nós

```
Verificar Agenda Agendar → Validar Slot Agendar → Slot Valido?
   ├─ true  → Buscar Paciente Agendar → Paciente Existe?
   │            ├─ true  → Unificar ID Paciente
   │            └─ false → Criar Novo Paciente → Unificar ID Paciente
   │          → Agendar Na Clinicorp
   │              ├─ Resp: Sucesso Agendamento → LOG Sucesso Agendamento
   │              └─ CRM Config (Agendar)            ← fan-out
   └─ false → Resp: Erro ao Agendar → LOG Erro Agendar
```

**`Verificar Agenda Agendar`** — `GET /appointment/get_avaliable_times_calendar?subscriber_id&code_link&date`

Segundo endpoint de disponibilidade, e ele **não** está documentado em lugar nenhum além dos JSONs. Serve para revalidar o slot específico no momento de gravar. Existe porque entre a oferta e o "Sim" do paciente passam minutos, e a vaga pode ter sido tomada.

**`Validar Slot Agendar`** — confere que o horário pedido existe de fato, no principal ou no fallback. É a barreira que impede gravar em slot inventado. Devolve `validacao.aprovado`, `id_profissional_final`, `nome_profissional_final`.

**`Buscar Paciente Agendar`** — `GET /patient/get?subscriber_id&Name&Phone`

**`Paciente Existe?`** — IF em `$json.PatientId` com operador `exists`.

**`Criar Novo Paciente`** — `POST /patient/create`

```json
{
  "subscriber_id": "...",
  "Name": "...",
  "MobilePhone": "...",
  "Notes": "<nota_novo_paciente> (<unidade>) - Bairro: <bairro>"
}
```

**`Unificar ID Paciente`** — junta os dois caminhos num `id_paciente_final`, e calcula `data_agendada_iso` e `to_time` (= horário + `duracao_servico`).

**`Agendar Na Clinicorp`** — `POST /appointment/create_appointment_by_api`

```json
{
  "Clinic_BusinessId": <business_id>,
  "Patient_PersonId": <id_paciente_final>,
  "Dentist_PersonId": <id_profissional_final>,
  "PatientName": "...",
  "MobilePhone": "...",
  "date": "<ISO>",
  "fromTime": "HH:mm",
  "toTime": "HH:mm",
  "Notes": "<nota> (<unidade>) | Bairro: ... | SPIN: ...",
  "CategoryColor": "#...",
  "CategoryDescription": "Avaliação"
}
```

> `Clinic_BusinessId`, `Patient_PersonId` e `Dentist_PersonId` vão **sem aspas** — são números. Envolver em string é rejeitado pela API.

Este é o nó que faz **fan-out**: uma saída vai para a resposta ao agente, a outra para `CRM Config (Agendar)`. As duas saem da mesma conexão `main[0]`, em paralelo. O CRM nunca substitui a resposta.

---

## 3. Cancelar — 9 nós

```
Buscar Paciente Cancelar → Listar Agmts Cancelar → Filtrar Agmt Cancelar → Achou Para Cancelar?
   ├─ true  → Cancelar Na Clinicorp
   │             ├─ Resp: Cancelamento Feito → LOG Sucesso Cancelamento
   │             └─ CRM Config (Cancelar)          ← fan-out
   └─ false → Resp: Agmt Nao Encontrado Cancelar → LOG Erro Cancelar
```

**`Listar Agmts Cancelar`** — `GET /appointment/list`

| Query | Valor |
|---|---|
| `subscriber_id` | config |
| `from` | `data_agendada - 1 dia` |
| `to` | `data_agendada + 1 dia` |
| `businessId` | config |
| `patientId` | `$json.PatientId` da busca anterior |

A janela de ±1 dia existe porque o paciente erra a data por um dia com frequência, e porque timezone pode deslocar o registro.

**`Filtrar Agmt Cancelar`** — tenta casar `fromTime` com o horário informado; não achando, pega o primeiro não deletado (`Deleted !== 'X'`) da janela. É deliberadamente tolerante: o agente já confirmou com o paciente qual agendamento é.

**`Cancelar Na Clinicorp`** — `POST /appointment/cancel_appointment` com `{ subscriber_id, id }`. O `id` vai sem aspas.

---

## 4. Remarcar — 16 nós

```
Buscar Paciente Remarcar → Listar Agmts Remarcar → Filtrar Agmt Antigo → Achou o Antigo?
   ├─ false → Resp: Antigo Nao Encontrado → LOG Erro Busca Antigo
   └─ true  → Verificar Slots Remarcar → Validar Slot Remarcar → Novo Horario Valido?
                 ├─ false → Resp: Novo Horario Invalido → LOG Erro Novo Horario
                 └─ true  → Cancelar Antigo Remarcar → Recuperar Reagendamento
                            → Reagendar Clinicorp
                                ├─ Resp: Remarcado Sucesso → LOG Sucesso Remarcacao
                                └─ CRM Config (Remarcar)        ← fan-out
```

> ⚠️ **Remarcar na Clinicorp é cancelar e criar, não um update.** É a cadeia mais longa e a mais delicada: entre `Cancelar Antigo Remarcar` e `Reagendar Clinicorp` o paciente fica momentaneamente **sem agendamento nenhum**. Por isso a ordem é inviolável: validar o novo slot **antes** de cancelar o antigo. Inverter isso e falhar no meio deixa o paciente sem vaga e sem aviso.

**`Listar Agmts Remarcar`** usa a janela em volta de **`data_antiga`**, não de `data_agendada`. Trocar as duas é o erro que faz a remarcação nunca achar o agendamento original.

**`Validar Slot Remarcar`** faz a mesma validação do Agendar e ainda carrega adiante o `PatientId` e o `agendamento_id_antigo`, porque a cadeia precisa dos dois lá na frente.

**`Recuperar Reagendamento`** remonta o payload de criação depois do cancelamento, com `id_paciente_final` = o paciente já existente. Não há caminho de "criar paciente" aqui: quem remarca já é paciente.

---

## 5. Verificar agendamento do paciente — 8 nós

```
Buscar Paciente Verificar → Listar Agmts Verificar → Filtrar Proximo Agmt → Encontrou Proximo?
   ├─ true  → Resp: Agmt Encontrado → LOG Verificar Encontrado
   └─ false → Resp: Agmt Nao Encontrado → LOG Verificar Nao Encontrado
```

**`Listar Agmts Verificar`** busca de `data_agendada` (ou hoje, se o agente não mandou data) até hoje + `limite_dias_busca_normal`. A versão dos workflows antigos usava `from` e `to` iguais, o que só achava agendamento se o paciente acertasse o dia exato — e o gatilho do E7 é justamente "esqueci o dia".

**`Filtrar Proximo Agmt`** devolve `proximo_data`, `proximo_hora`, `proximo_id`. O agente responde **só** com o que veio, nunca com data suposta.

Os quatro cenários do E7 (ativo / paciente antigo / nenhum / erro) são resolvidos no prompt do agente a partir do `status` da resposta. O cenário "paciente antigo" depende de a Clinicorp devolver essa marca; se não devolver, o agente trata pelo E0 e pela pergunta de qualificação.

---

## Tratamento de erro

Nenhum nó usa `continueOnFail`. Erro HTTP na Clinicorp derruba a execução, o webhook não responde, e a habilidade estoura timeout no WTS. O agente trata isso como erro técnico: frase de probleminha, `Salvar_Contexto` com `[ALERTA]` e transbordo.

Isso é intencional. A alternativa — engolir o erro e responder "não deu certo" — faz o agente às vezes seguir como se tivesse dado, e é justamente o que o invariante 3 do padrão Luna proíbe.

Os caminhos de **falha de negócio** (slot inválido, agendamento não encontrado) têm resposta própria, com `status` legível, porque não são erro: são resultado.
