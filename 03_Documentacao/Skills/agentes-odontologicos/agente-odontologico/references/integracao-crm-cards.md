# Integração CRM Helena (Cards + Etiquetas de Contato)

Documenta o subsistema que espelha o resultado do agendamento (Clinicorp) no **CRM/Kanban da Helena** (wts.chat): move o card do contato para a etapa certa e aplica etiquetas — tanto no card quanto no contato. É um complemento ao workflow de agendamento descrito em `integracao-n8n.md`, não um substituto.

Referências de implementação: **Atos Odontologia** (`Atos/n8n/agendamento_ia_atos.json`, subsistema original), **Brasdent v2** (`Brasdent v2/n8n/agendamento_ia_brasdent.json`, primeira portabilidade) e **Bazacas** (`Bazacas/n8n/agendamento_ia_bazacas.json`, multi-unidade). Em divergência, Atos é a fonte da estrutura; Brasdent v2/Bazacas confirmam que o padrão é copiável 1:1 entre clínicas.

---

## Quando usar

Sempre que a clínica tiver painel de CRM configurado na Helena (`automacao_clinicas` no Supabase com `panel_id`) e o pedido for para que o agendamento/remarcação/cancelamento via IA **também** reflita no Kanban — mover card de etapa e/ou etiquetar o contato. Não confundir com a automação de **etiqueta de origem de lead** (Meta/Instagram/Facebook/Orgânico no `SESSION_NEW`), que é um fluxo totalmente separado.

---

## Pré-requisitos (checar antes de portar)

1. **`helena_company_id`** da clínica (UUID da conta Helena/WTS) — pedir ao usuário; validar contra o `h.tenantId` do `correlation-context` se houver algum payload de exemplo salvo em `pinData`.
2. **Linha já cadastrada** na tabela Supabase `automacao_clinicas` (projeto "Supa Gabriel", credencial `p1F5hpLgSQHugw7M`) filtrada por `helena_company_id`, com pelo menos:
   - `helena_token` (Bearer da API Helena)
   - `panel_id`
   - `agendado_step_id` (etapa destino ao agendar/remarcar)
   - `cancelado_step_id` (etapa destino ao cancelar)
   - `ia_card_tag_id` (etiqueta aplicada no **card**)
   - `agendado_contact_tag_id` (etiqueta aplicada no **contato**, só no fluxo Agendar)
   - opcionais: `agendado_em_field_key`, `agendado_para_field_key` (chaves de customFields DATETIME do card)
   - Se a linha não existir, o subsistema **não falha o agendamento** — só fica sem efeito (falha fechada via IF `hasCard`/`contactId`).
3. **`id_atendimento` capturado no node `Configuracao Unidades`** — sem isso, `Buscar Sessao` não resolve `contactId` e a cadeia toda para no `Tem ContactId?`.

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

> `id_atendimento` depende do **agente de IA** enviar a sessão/atendimento no payload do webhook — isso é configuração do lado do agente (fora do n8n). Se a clínica não manda esse campo hoje, o subsistema fica montado mas inerte até o agente ser ajustado.

---

## Passo 2 — Os 24 nós do subsistema (3 subcadeias)

Cada subcadeia (Agendar/Remarcar/Cancelar) é disparada **em paralelo** à resposta do webhook, a partir do nó que confirma a operação na Clinicorp — nunca substituindo a resposta, sempre somando um segundo destino na mesma conexão:

```
"Agendar Na Clinicorp": {
  "main": [[
    { "node": "Resp: Sucesso Agendamento", "type": "main", "index": 0 },
    { "node": "CRM Config (Agendar)",      "type": "main", "index": 0 }
  ]]
}
```

O mesmo padrão vale para o nó que confirma o **cancelamento** (`Cancelar Na Clinicorp` → + `CRM Config (Cancelar)`) e o que confirma a **remarcação** (`Reagendar Clinicorp` / `Reagendar Clinicorp1` → + `CRM Config (Remarcar)`).

### Cadeia "Agendar" (9 nós — a única com etiqueta de contato)

`CRM Config (Agendar)` → `Buscar Sessao (Agendar)` → `Tem ContactId? (Agendar)` → `Tag Agendou Contato (Agendar)` → `Buscar Card (Agendar)` → `Montar Card (Agendar)` → `Card Existe? (Agendar)` → `Mover Card (Agendar)` **ou** `Criar Card (Agendar)`

| Nó | Tipo | O que faz |
|---|---|---|
| CRM Config (Agendar) | Supabase `getAll` | busca a linha de `automacao_clinicas` por `helena_company_id` |
| Buscar Sessao (Agendar) | HTTP GET | `GET /chat/v2/session/{id_atendimento}` → traz `contactId` |
| Tem ContactId? (Agendar) | IF | `contactId` `notEmpty` — só a saída **true** é conectada; false não faz nada (falha fechada) |
| Tag Agendou Contato (Agendar) | HTTP POST | `POST /core/v1/contact/{contactId}/tags` — `{ tagIds: [agendado_contact_tag_id], operation: 'InsertIfNotExists' }` |
| Buscar Card (Agendar) | HTTP GET | `GET /crm/v1/panel/card?PanelId&ContactId` |
| Montar Card (Agendar) | Code | monta `moveBodyJson`/`createBodyJson` (ver Passo 3) |
| Card Existe? (Agendar) | IF | `hasCard` — true→Mover, false→Criar |
| Mover Card (Agendar) | HTTP PUT | `PUT /crm/v2/panel/card/{cardId}` com `moveBodyJson` |
| Criar Card (Agendar) | HTTP POST | `POST /crm/v1/panel/card` com `createBodyJson` |

### Cadeia "Remarcar" (8 nós — igual à Agendar, sem a etapa de tag no contato)

`CRM Config (Remarcar)` → `Buscar Sessao (Remarcar)` → `Tem ContactId? (Remarcar)` → `Buscar Card (Remarcar)` → `Montar Card (Remarcar)` → `Card Existe? (Remarcar)` → `Mover Card (Remarcar)` **ou** `Criar Card (Remarcar)`

### Cadeia "Cancelar" (7 nós — só move, nunca cria, sem tag)

`CRM Config (Cancelar)` → `Buscar Sessao (Cancelar)` → `Tem ContactId? (Cancelar)` → `Buscar Card (Cancelar)` → `Montar Card (Cancelar)` → `Card Existe? (Cancelar)` → `Mover Card (Cancelar)`

`Montar Card (Cancelar)` é mais simples — só move `stepId`, sem tags nem customFields:

```javascript
const cfg = $('CRM Config (Cancelar)').first().json;
const resp = $('Buscar Card (Cancelar)').first().json;
const arr = Array.isArray(resp) ? resp : (resp.items ?? resp.data ?? []);
const card = (arr && arr.length) ? arr[0] : null;
const moveBody = { fields: ['stepId'], stepId: cfg.cancelado_step_id };
return [{ json: { hasCard: !!card, cardId: card ? card.id : null, moveBodyJson: JSON.stringify(moveBody) } }];
```

Se `hasCard` for `false` no cancelamento, a saída **false** do IF não é conectada a nada — não existe "criar card" para cancelamento.

---

## Passo 3 — Code de "Montar Card" (Agendar e Remarcar, idêntico nos dois)

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

// Campos personalizados (DATETIME): agendado_em = agora; agendado_para = data/hora da consulta
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

> Importante: quando o card **já existe** (branch Mover), o `PUT /crm/v2/panel/card/{id}` só toca os campos listados em `fields` (`stepId`, `tagIds`, e `customFields` se houver chave configurada) — nunca sobrescreve `title`/`description` do card. Se a clínica também precisar atualizar `customFields` fora desse fluxo (ex: campanha/headline vinda de UTM), isso é um subsistema **diferente** — ver a automação de etiqueta de origem, não este documento.

---

## Endpoints Helena usados neste subsistema

| Endpoint | Método | Uso |
|---|---|---|
| `/chat/v2/session/{id}` | GET | resolve `contactId` a partir do `id_atendimento` |
| `/crm/v1/panel/card?PanelId&ContactId` | GET | verifica se o contato já tem card no painel |
| `/crm/v1/panel/card` | POST | cria card novo |
| `/crm/v2/panel/card/{id}` | PUT | move/atualiza card existente (respeita `fields`) |
| `/core/v1/contact/{id}/tags` | POST | `{ tagIds, operation: 'InsertIfNotExists' }` — etiqueta o contato |

---

## Roteiro para portar para uma nova clínica

1. Perguntar/validar `helena_company_id` da clínica (não assumir — cada clínica tem o seu, mesmo multi-unidade compartilhando uma única conta Helena, como a Bazacas).
2. Confirmar com o usuário se a linha em `automacao_clinicas` já existe com os campos do Pré-requisito 2. Se não existir, o subsistema pode ser portado mesmo assim — só fica sem efeito até a linha ser cadastrada.
3. No node `Configuracao Unidades`: adicionar captura de `id_atendimento` (com os 4 aliases) e o campo `helena_company_id` fixo no `return`.
4. Copiar os 24 nós de uma clínica de referência (Brasdent v2 é a cópia mais limpa) para o `nodes[]` da clínica nova — **gerar novos `id` únicos** (não reaproveitar os UUIDs de outra clínica no mesmo arquivo/instância n8n).
5. Adicionar as conexões: fan-out nos 3 nós de confirmação Clinicorp (Agendar/Remarcar/Cancelar) + as conexões internas de cada subcadeia (ver Passo 2).
6. Validar o JSON antes de considerar pronto — script mínimo:
   ```bash
   node -e "
   const j = JSON.parse(require('fs').readFileSync('<arquivo>.json','utf8'));
   const names = new Set(j.nodes.map(n => n.name));
   const dupIds = new Set(); let dup = [];
   j.nodes.forEach(n => { if (dupIds.has(n.id)) dup.push(n.id); dupIds.add(n.id); });
   console.log('nodes:', j.nodes.length, '| dup ids:', dup);
   let missing = [];
   for (const [src, val] of Object.entries(j.connections))
     for (const branch of val.main)
       for (const t of branch)
         if (!names.has(t.node)) missing.push(src + ' -> ' + t.node);
   console.log('missing targets:', missing);
   "
   ```
7. Avisar o usuário sobre gaps pré-existentes encontrados no arquivo (ex.: a Bazacas não tinha nenhum nó de resposta ao webhook no branch "Agendar" antes desta portabilidade — bug preexistente e fora do escopo do subsistema de cards).

---

## Erros comuns

- **Esquecer o `id_atendimento`** no `Configuracao Unidades` → toda a cadeia roda, mas `Buscar Sessao` busca uma sessão vazia e `Tem ContactId?` sempre fecha em falso. Nada quebra, mas nada acontece — sintoma silencioso, difícil de notar sem logs.
- **Reaproveitar `helena_company_id` de outra clínica** → a Bazacas confirmou o UUID certo batendo com `h.tenantId` no `correlation-context` de um payload de exemplo salvo em `pinData`; usar esse truque quando disponível antes de perguntar ao usuário.
- **Tentar atualizar `customFields` no fluxo de agendamento pensando que é o mesmo subsistema da etiqueta de campanha/origem** — são fluxos diferentes, acionados por eventos diferentes (`SESSION_NEW` da Helena vs. sucesso de `realizar_agendamento`/`remarcar_agendamento`/`cancelar_agendamento` do agente).
- **Duplicar `id` de nó** entre clínicas dentro do mesmo arquivo n8n (não é problema entre arquivos/workflows diferentes, mas evite mesmo assim por clareza) — sempre gerar um prefixo novo por rodada de portabilidade.
