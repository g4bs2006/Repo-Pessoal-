# Integração CRM Helena (Cards + Etiquetas) — Padrão Luna

> ⚠️ **Na v4 este subsistema é obrigatório, não opcional.** O agente Luna não aplica etiqueta nenhuma e não move card nenhum. Se este subsistema não estiver montado, o atendimento acontece e **nada** aparece no CRM. Na v3 ele era um complemento; na v4 ele é o registro.

Referências de implementação: **Atos Odontologia** (`Atos/n8n/agendamento_ia_atos.json`, subsistema original), **Brasdent v2** (primeira portabilidade, a cópia mais limpa) e **Bazacas** (multi-unidade).

---

## O que muda na v4

| | v3 | v4 |
|---|---|---|
| Etiqueta de contato ao **agendar** | n8n (`agendado_contact_tag_id`) — já existia | igual |
| Etiqueta de contato ao **remarcar** | agente (`tag_Remarcou`) | **n8n — precisa ser adicionada** |
| Etiqueta de contato ao **cancelar** | agente (`tag_Cancelou`) | **n8n — precisa ser adicionada** |
| Mover card | n8n + `Cliente Agendou - IA` no agente (redundante) | só n8n |
| `id_atendimento` | necessário só se o subsistema existisse | obrigatório sempre |

**A adição concreta da portabilidade v4:** um node `Tag Remarcou Contato (Remarcar)` e um `Tag Cancelou Contato (Cancelar)`, espelhando o `Tag Agendou Contato (Agendar)` que já existe, com dois campos novos na tabela de config: `remarcado_contact_tag_id` e `cancelado_contact_tag_id`.

---

## Pré-requisitos

1. **`helena_company_id`** da clínica (UUID da conta Helena/WTS). Pedir ao usuário; se houver payload de exemplo salvo em `pinData`, validar contra o `h.tenantId` do `correlation-context` antes de perguntar.
2. **Linha em `automacao_clinicas`** (Supabase, projeto "Supa Gabriel"), filtrada por `helena_company_id`, com:
   - `helena_token` (Bearer da API Helena)
   - `panel_id`
   - `agendado_step_id` — etapa destino ao agendar ou remarcar
   - `cancelado_step_id` — etapa destino ao cancelar
   - `ia_card_tag_id` — etiqueta aplicada no **card**
   - `agendado_contact_tag_id` — etiqueta no **contato**, fluxo Agendar
   - **`remarcado_contact_tag_id`** — novo na v4, fluxo Remarcar
   - **`cancelado_contact_tag_id`** — novo na v4, fluxo Cancelar
   - opcionais: `agendado_em_field_key`, `agendado_para_field_key` (customFields DATETIME do card)
3. **`id_atendimento` capturado no node `Configuracao Unidades`.** Sem ele, `Buscar Sessao` não resolve o `contactId` e a cadeia toda para no IF — sem erro visível.

> Se a linha não existir, o subsistema **não quebra o agendamento** — ele falha fechada e fica inerte. Na v3 isso era aceitável. Na v4 significa um agente rodando sem nenhum registro no CRM, e é preciso avisar o usuário explicitamente.

---

## Passo 1 — Capturar `id_atendimento` e `helena_company_id`

No topo do node de Code `Configuracao Unidades`, antes de montar o `CONFIG`:

```javascript
const idAtendimento = body.id_atendimento || body.atendimento_id || body.session_id || body.sessionId || '';
```

E no `return { json: { ... } }`, logo após `acao_fluxo`:

```javascript
id_atendimento:    idAtendimento,
helena_company_id: '<UUID da clínica>',
```

> O `id_atendimento` depende do agente enviar a sessão no payload do webhook — é configuração do lado do WTS, fora do n8n. Na v4, incluir esse campo na descrição das 5 habilidades de agendamento.

---

## Passo 2 — As três cadeias

Cada cadeia é disparada **em paralelo** à resposta do webhook, a partir do node que confirma a operação na Clinicorp — nunca substituindo a resposta, sempre somando um segundo destino na mesma conexão:

```json
"Agendar Na Clinicorp": {
  "main": [[
    { "node": "Resp: Sucesso Agendamento", "type": "main", "index": 0 },
    { "node": "CRM Config (Agendar)",      "type": "main", "index": 0 }
  ]]
}
```

O mesmo padrão vale para `Cancelar Na Clinicorp` → + `CRM Config (Cancelar)` e `Reagendar Clinicorp` → + `CRM Config (Remarcar)`.

### Cadeia Agendar (9 nós)

`CRM Config (Agendar)` → `Buscar Sessao (Agendar)` → `Tem ContactId? (Agendar)` → `Tag Agendou Contato (Agendar)` → `Buscar Card (Agendar)` → `Montar Card (Agendar)` → `Card Existe? (Agendar)` → `Mover Card (Agendar)` **ou** `Criar Card (Agendar)`

| Nó | Tipo | O que faz |
|---|---|---|
| CRM Config (Agendar) | Supabase `getAll` | busca a linha de `automacao_clinicas` por `helena_company_id` |
| Buscar Sessao (Agendar) | HTTP GET | `GET /chat/v2/session/{id_atendimento}` → traz `contactId` |
| Tem ContactId? (Agendar) | IF | `contactId` `notEmpty` — só a saída **true** é conectada (falha fechada) |
| Tag Agendou Contato (Agendar) | HTTP POST | `POST /core/v1/contact/{contactId}/tags` com `{ tagIds: [agendado_contact_tag_id], operation: 'InsertIfNotExists' }` |
| Buscar Card (Agendar) | HTTP GET | `GET /crm/v1/panel/card?PanelId&ContactId` |
| Montar Card (Agendar) | Code | monta `moveBodyJson` / `createBodyJson` (Passo 3) |
| Card Existe? (Agendar) | IF | `hasCard` — true→Mover, false→Criar |
| Mover Card (Agendar) | HTTP PUT | `PUT /crm/v2/panel/card/{cardId}` com `moveBodyJson` |
| Criar Card (Agendar) | HTTP POST | `POST /crm/v1/panel/card` com `createBodyJson` |

### Cadeia Remarcar (9 nós na v4 — era 8)

`CRM Config (Remarcar)` → `Buscar Sessao (Remarcar)` → `Tem ContactId? (Remarcar)` → **`Tag Remarcou Contato (Remarcar)`** → `Buscar Card (Remarcar)` → `Montar Card (Remarcar)` → `Card Existe? (Remarcar)` → `Mover Card (Remarcar)` **ou** `Criar Card (Remarcar)`

O node novo é idêntico ao `Tag Agendou Contato`, trocando o campo:
```
POST /core/v1/contact/{contactId}/tags
{ "tagIds": ["{{ $json.remarcado_contact_tag_id }}"], "operation": "InsertIfNotExists" }
```

Card vai para `agendado_step_id` — remarcar continua sendo agendado.

### Cadeia Cancelar (8 nós na v4 — era 7)

`CRM Config (Cancelar)` → `Buscar Sessao (Cancelar)` → `Tem ContactId? (Cancelar)` → **`Tag Cancelou Contato (Cancelar)`** → `Buscar Card (Cancelar)` → `Montar Card (Cancelar)` → `Card Existe? (Cancelar)` → `Mover Card (Cancelar)`

Cancelar **só move, nunca cria** — a saída `false` do IF não é conectada a nada. `Montar Card (Cancelar)` é mais simples, sem tags nem customFields:

```javascript
const cfg = $('CRM Config (Cancelar)').first().json;
const resp = $('Buscar Card (Cancelar)').first().json;
const arr = Array.isArray(resp) ? resp : (resp.items ?? resp.data ?? []);
const card = (arr && arr.length) ? arr[0] : null;
const moveBody = { fields: ['stepId'], stepId: cfg.cancelado_step_id };
return [{ json: { hasCard: !!card, cardId: card ? card.id : null, moveBodyJson: JSON.stringify(moveBody) } }];
```

---

## Passo 3 — Code de "Montar Card" (Agendar e Remarcar, idêntico)

```javascript
const cfg = $('CRM Config (Agendar)').first().json; // ou (Remarcar)
const cu = $('Configuracao Unidades').first().json;
const contactId = $('Buscar Sessao (Agendar)').first().json.contactId; // ou (Remarcar)
const resp = $('Buscar Card (Agendar)').first().json; // ou (Remarcar)
const arr = Array.isArray(resp) ? resp : (resp.items ?? resp.data ?? []);
const card = (arr && arr.length) ? arr[0] : null;
const existTags = card && Array.isArray(card.tagIds) ? card.tagIds : [];
const tagIds = Array.from(new Set([...existTags, cfg.ia_card_tag_id].filter(Boolean)));
const title = (card && card.title) || cu.nome_paciente || 'Paciente';

// customFields DATETIME: agendado_em = agora; agendado_para = data/hora da consulta
const zone = 'America/Sao_Paulo';
const agoraISO = DateTime.now().setZone(zone).toISO();
const dtAg = DateTime.fromFormat(`${cu.data_agendada} ${cu.horario_agendado}`, 'yyyy-MM-dd HH:mm', { zone });
const paraISO = dtAg.isValid ? dtAg.toISO() : null;
const cf = {};
if (cfg.agendado_em_field_key) cf[cfg.agendado_em_field_key] = [agoraISO];
if (cfg.agendado_para_field_key && paraISO) cf[cfg.agendado_para_field_key] = [paraISO];
const temCF = Object.keys(cf).length > 0;

const moveBody = { fields: temCF ? ['stepId','tagIds','customFields'] : ['stepId','tagIds'], stepId: cfg.agendado_step_id, tagIds };
if (temCF) moveBody.customFields = cf;

const createBody = { stepId: cfg.agendado_step_id, title, contactIds: [contactId], tagIds: cfg.ia_card_tag_id ? [cfg.ia_card_tag_id] : [] };
if (temCF) createBody.customFields = cf;

return [{ json: { hasCard: !!card, cardId: card ? card.id : null, moveBodyJson: JSON.stringify(moveBody), createBodyJson: JSON.stringify(createBody) } }];
```

> Quando o card já existe (branch Mover), o `PUT` só toca os campos listados em `fields` — nunca sobrescreve `title` nem `description`. Atualização de `customFields` vinda de UTM ou campanha é **outro** subsistema (automação de origem de lead, disparada por `SESSION_NEW`), não este.

---

## Endpoints Helena usados

| Endpoint | Método | Uso |
|---|---|---|
| `/chat/v2/session/{id}` | GET | resolve `contactId` a partir do `id_atendimento` |
| `/crm/v1/panel/card?PanelId&ContactId` | GET | verifica se o contato já tem card no painel |
| `/crm/v1/panel/card` | POST | cria card |
| `/crm/v2/panel/card/{id}` | PUT | move/atualiza card existente (respeita `fields`) |
| `/core/v1/contact/{id}/tags` | POST | `{ tagIds, operation: 'InsertIfNotExists' }` — etiqueta o contato |

---

## Roteiro para portar

1. Validar o `helena_company_id` da clínica — não assumir, mesmo em multi-unidade que compartilha uma conta Helena.
2. Confirmar a linha em `automacao_clinicas`, **incluindo os dois campos novos da v4** (`remarcado_contact_tag_id`, `cancelado_contact_tag_id`). Se as etiquetas ainda não existem na Helena, criá-las antes.
3. No `Configuracao Unidades`: capturar `id_atendimento` (4 aliases) + `helena_company_id` fixo.
4. Copiar os nós de uma clínica de referência (Brasdent v2 é a cópia mais limpa) — **gerar `id` novos**, não reaproveitar UUID de outra clínica.
5. Adicionar os dois nós novos de etiqueta de contato (Remarcar e Cancelar).
6. Conectar: fan-out nos 3 nós de confirmação Clinicorp + as conexões internas de cada cadeia.
7. Validar o JSON:
   ```bash
   node -e "
   const j = JSON.parse(require('fs').readFileSync('<arquivo>.json','utf8'));
   const names = new Set(j.nodes.map(n => n.name));
   const seen = new Set(); const dup = [];
   j.nodes.forEach(n => { if (seen.has(n.id)) dup.push(n.id); seen.add(n.id); });
   console.log('nodes:', j.nodes.length, '| dup ids:', dup);
   const missing = [];
   for (const [src, val] of Object.entries(j.connections))
     for (const branch of val.main)
       for (const t of branch)
         if (!names.has(t.node)) missing.push(src + ' -> ' + t.node);
   console.log('missing targets:', missing);
   "
   ```
8. **Teste de ponta a ponta obrigatório na v4:** agendar, remarcar e cancelar um caso de teste, e conferir na Helena que cada operação etiquetou o contato e moveu o card. É o único lugar onde essa marcação existe agora.
9. Avisar o usuário sobre gaps preexistentes encontrados no arquivo — ex: branch sem node de resposta ao webhook.

---

## Erros comuns

- **`id_atendimento` faltando** → a cadeia roda, `Buscar Sessao` busca uma sessão vazia, o IF fecha em falso. Nada quebra e nada acontece. Na v4 é o erro mais caro do sistema, porque não há mais tag no agente para compensar.
- **Esquecer os dois nós novos de etiqueta** na portabilidade → agendamento aparece marcado no CRM, remarcação e cancelamento não. Sintoma: o painel mostra pacientes "agendados" que na verdade cancelaram.
- **Reaproveitar `helena_company_id` de outra clínica** → confere contra o `h.tenantId` do `correlation-context` quando houver `pinData`.
- **Confundir com a automação de origem de lead** → `SESSION_NEW` (Meta/Instagram/Orgânico) é fluxo separado, disparado por evento diferente.
- **Duplicar `id` de nó** dentro do mesmo arquivo → gerar prefixo novo por rodada de portabilidade.
