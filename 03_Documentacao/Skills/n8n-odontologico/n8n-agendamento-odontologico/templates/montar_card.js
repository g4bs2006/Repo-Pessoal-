// =============================================================
// MONTAR CARD (__CHAIN__)
// Decide entre mover e criar o card, acumulando as tags já existentes.
// O PUT só toca os campos listados em "fields" — nunca sobrescreve
// title nem description de um card que já existe.
// =============================================================

const cfg = $('CRM Config (__CHAIN__)').first().json;
const cu  = $('Configuracao Unidades').first().json;
const contactId = $('Buscar Sessao (__CHAIN__)').first().json.contactId;

const resp = $('Buscar Card (__CHAIN__)').first().json;
const arr  = Array.isArray(resp) ? resp : (resp.items ?? resp.data ?? []);
const card = (arr && arr.length) ? arr[0] : null;

const existTags = card && Array.isArray(card.tagIds) ? card.tagIds : [];
const tagIds = Array.from(new Set([...existTags, cfg.ia_card_tag_id].filter(Boolean)));
const title  = (card && card.title) || cu.nome_paciente || 'Paciente';

// customFields DATETIME: agendado_em = agora, agendado_para = data/hora da consulta
const zone     = cu.config_agenda?.timezone || 'America/Sao_Paulo';
const agoraISO = DateTime.now().setZone(zone).toISO();
const dtAg     = DateTime.fromFormat(cu.data_agendada + ' ' + cu.horario_agendado, 'yyyy-MM-dd HH:mm', { zone });
const paraISO  = dtAg.isValid ? dtAg.toISO() : null;

const cf = {};
if (cfg.agendado_em_field_key) cf[cfg.agendado_em_field_key] = [agoraISO];
if (cfg.agendado_para_field_key && paraISO) cf[cfg.agendado_para_field_key] = [paraISO];
const temCF = Object.keys(cf).length > 0;

const moveBody = {
  fields: temCF ? ['stepId', 'tagIds', 'customFields'] : ['stepId', 'tagIds'],
  stepId: cfg.agendado_step_id,
  tagIds
};
if (temCF) moveBody.customFields = cf;

const createBody = {
  stepId: cfg.agendado_step_id,
  title,
  contactIds: [contactId],
  tagIds: cfg.ia_card_tag_id ? [cfg.ia_card_tag_id] : []
};
if (temCF) createBody.customFields = cf;

return [{
  json: {
    hasCard:        !!card,
    cardId:         card ? card.id : null,
    moveBodyJson:   JSON.stringify(moveBody),
    createBodyJson: JSON.stringify(createBody)
  }
}];
