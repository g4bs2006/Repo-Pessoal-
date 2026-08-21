# Subsistema de CRM Helena — cards e etiquetas

> ⚠️ **Na v4 este subsistema é o registro, não um complemento.** O agente Luna não aplica etiqueta nenhuma e não move card nenhum. Se estas três cadeias não estiverem montadas e funcionando, o atendimento acontece, o agendamento entra na Clinicorp, e **nada** aparece no CRM.

Base: `https://api.wts.chat`
Auth: `Authorization: Bearer {{ helena_token }}`, com o token vindo da linha em `automacao_clinicas`.

---

## Como as três cadeias entram no workflow

Cada cadeia é disparada em **fan-out** a partir do nó que confirma a operação na Clinicorp. Ela nunca substitui a resposta ao agente — soma um segundo destino na mesma conexão:

```json
"Agendar Na Clinicorp": {
  "main": [[
    { "node": "Resp: Sucesso Agendamento", "type": "main", "index": 0 },
    { "node": "CRM Config (Agendar)",      "type": "main", "index": 0 }
  ]]
}
```

| Dispara de | Cadeia |
|---|---|
| `Agendar Na Clinicorp` | CRM Agendar |
| `Reagendar Clinicorp` | CRM Remarcar |
| `Cancelar Na Clinicorp` | CRM Cancelar |

Se o fan-out faltar, a operação funciona e o CRM não registra. O validador checa os três.

---

## Cadeia Agendar — 9 nós

```
CRM Config (Agendar)
  → Buscar Sessao (Agendar)
  → Tem ContactId? (Agendar)         [só a saída true é conectada]
  → Tag Agendou Contato (Agendar)
  → Buscar Card (Agendar)
  → Montar Card (Agendar)
  → Card Existe? (Agendar)
      ├─ true  → Mover Card (Agendar)
      └─ false → Criar Card (Agendar)
```

| Nó | Tipo | O que faz |
|---|---|---|
| `CRM Config (Agendar)` | Supabase `getAll` | busca a linha de `automacao_clinicas` por `helena_company_id`, `limit: 1` |
| `Buscar Sessao (Agendar)` | HTTP GET | `GET /chat/v2/session/{id_atendimento}` → devolve `contactId` |
| `Tem ContactId? (Agendar)` | IF `notEmpty` | **só a saída true é conectada** — falha fechada |
| `Tag Agendou Contato (Agendar)` | HTTP POST | `POST /core/v1/contact/{contactId}/tags` |
| `Buscar Card (Agendar)` | HTTP GET | `GET /crm/v1/panel/card?PanelId&ContactId` |
| `Montar Card (Agendar)` | Code | decide mover ou criar, acumula tags, monta os corpos |
| `Card Existe? (Agendar)` | IF `hasCard` | true → mover, false → criar |
| `Mover Card (Agendar)` | HTTP PUT | `PUT /crm/v2/panel/card/{cardId}` |
| `Criar Card (Agendar)` | HTTP POST | `POST /crm/v1/panel/card` |

Corpo da etiqueta de contato:

```json
{
  "tagIds": ["{{ agendado_contact_tag_id }}"],
  "operation": "InsertIfNotExists"
}
```

`InsertIfNotExists` é o que torna a operação idempotente: reagendar duas vezes não duplica etiqueta.

---

## Cadeia Remarcar — 9 nós

Idêntica à Agendar, com **`Tag Remarcou Contato (Remarcar)`** lendo `remarcado_contact_tag_id`.

O card vai para **`agendado_step_id`**, não para uma etapa própria: quem remarcou continua agendado.

> **Este nó de etiqueta é a adição concreta da v4.** Nos workflows v3, `tag_Remarcou` era habilidade do agente, e a cadeia de CRM ia direto de `Tem ContactId?` para `Buscar Card`. Portar para v4 sem adicionar este nó faz a etiqueta simplesmente deixar de existir. É o erro mais provável de uma migração, e o sintoma é sutil: o card move, o contato fica com a etiqueta antiga.

---

## Cadeia Cancelar — 8 nós

Idêntica, com **`Tag Cancelou Contato (Cancelar)`** lendo `cancelado_contact_tag_id`. Duas diferenças:

1. O card vai para **`cancelado_step_id`**.
2. **Cancelar só move, nunca cria.** A saída `false` de `Card Existe? (Cancelar)` fica **desconectada de propósito**. Quem cancelou não deve ganhar card novo no painel — se não havia card, não há o que registrar.

`Montar Card (Cancelar)` é mais simples: sem tags de card, sem customFields.

```javascript
const moveBody = { fields: ['stepId'], stepId: cfg.cancelado_step_id };
```

---

## `Montar Card` — o que o `fields` protege

```javascript
const moveBody = {
  fields: temCF ? ['stepId','tagIds','customFields'] : ['stepId','tagIds'],
  stepId: cfg.agendado_step_id,
  tagIds
};
```

O `PUT` só toca o que está listado em `fields`. É isso que impede o workflow de sobrescrever `title` e `description` de um card que alguém da clínica editou à mão. Adicionar campo ao `fields` sem necessidade é destrutivo.

As tags são acumuladas, não substituídas:

```javascript
const tagIds = Array.from(new Set([...existTags, cfg.ia_card_tag_id].filter(Boolean)));
```

Os `customFields` DATETIME são opcionais e só entram se as colunas existirem na config:

| Campo | Valor |
|---|---|
| `agendado_em_field_key` | agora, ISO no timezone da clínica |
| `agendado_para_field_key` | data e hora da consulta, ISO |

Ambos vão como **array de um elemento** (`[agoraISO]`) — é o formato que a API espera para customField.

> Atualização de customField vinda de UTM ou campanha é **outro** subsistema: a automação de origem de lead, disparada por `SESSION_NEW`. Não misture os dois.

---

## Endpoints WTS usados

| Endpoint | Método | Uso |
|---|---|---|
| `/chat/v2/session/{id}` | GET | resolve `contactId` a partir do `id_atendimento` |
| `/crm/v1/panel/card?PanelId&ContactId` | GET | verifica se o contato já tem card no painel |
| `/crm/v1/panel/card` | POST | cria card |
| `/crm/v2/panel/card/{id}` | PUT | move ou atualiza card existente, respeitando `fields` |
| `/core/v1/contact/{id}/tags` | POST | etiqueta o contato |

Note as versões: card é `v1` para criar e listar, mas **`v2` para atualizar**. Usar `v1` no PUT ignora o `fields` e sobrescreve o card.

---

## Por que a saída `false` de `Tem ContactId?` fica desconectada

Sem `contactId`, não há a quem aplicar etiqueta. As opções seriam adivinhar o contato pelo telefone, ou não fazer nada. A escolha é não fazer nada — **falha fechada** — porque etiquetar o contato errado corrompe relatório e dispara automação na pessoa errada.

O custo dessa escolha é que a falha é silenciosa. Por isso `id_atendimento` é obrigatório nas 5 habilidades e o validador checa a presença dele.

---

## Teste de ponta a ponta — obrigatório antes de ativar

Este é o único lugar onde etiqueta e card existem agora. Teste as três operações, não só a primeira.

```
[ ] AGENDAR um caso de teste
    [ ] agendamento aparece na agenda Clinicorp
    [ ] card aparece ou move para agendado_step_id
    [ ] card recebe ia_card_tag_id
    [ ] contato recebe agendado_contact_tag_id
    [ ] customFields de data preenchidos, se configurados

[ ] REMARCAR o mesmo caso
    [ ] agenda Clinicorp reflete a nova data
    [ ] card permanece em agendado_step_id
    [ ] contato recebe remarcado_contact_tag_id      ← o que falha em migração

[ ] CANCELAR o mesmo caso
    [ ] agendamento sai da agenda Clinicorp
    [ ] card move para cancelado_step_id
    [ ] contato recebe cancelado_contact_tag_id      ← o que falha em migração
    [ ] nenhum card novo foi criado
```

---

## Diagnóstico

| Sintoma | Causa provável |
|---|---|
| Agendamento entra na Clinicorp, card não move | `id_atendimento` faltando no payload da habilidade |
| Nem na Clinicorp entra | problema na cadeia Clinicorp, não no CRM |
| Card move, contato fica com etiqueta antiga | falta o nó `Tag Remarcou` ou `Tag Cancelou` |
| Nada acontece, sem erro no n8n | linha em `automacao_clinicas` inexistente, ou `helena_company_id` errado |
| Card perdeu o título que alguém editou | `fields` do PUT com campo a mais, ou PUT em `v1` |
| Relatório conta como agendado quem cancelou | as etiquetas de remarcado e cancelado não existem na Helena |
| Etiqueta aplicada no contato errado | `helena_company_id` reaproveitado de outra clínica |
