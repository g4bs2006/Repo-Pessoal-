// =============================================================
// MONTAR CARD (Cancelar)
// Cancelar só move, nunca cria. Sem tags de card e sem customFields:
// um contato que cancelou não deve ganhar card novo no painel.
// =============================================================

const cfg  = $('CRM Config (Cancelar)').first().json;
const resp = $('Buscar Card (Cancelar)').first().json;
const arr  = Array.isArray(resp) ? resp : (resp.items ?? resp.data ?? []);
const card = (arr && arr.length) ? arr[0] : null;

const moveBody = { fields: ['stepId'], stepId: cfg.cancelado_step_id };

return [{
  json: {
    hasCard:      !!card,
    cardId:       card ? card.id : null,
    moveBodyJson: JSON.stringify(moveBody)
  }
}];
