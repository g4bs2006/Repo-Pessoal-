// =============================================================
// FILTRAR AGMT ANTIGO
// Localiza o agendamento original que a remarcação vai substituir.
// Guarda data_hora_antiga para a resposta "Era X, ficou para Y".
// =============================================================

const config = $('Configuracao Unidades').first().json;
const agmts  = $input.all().map(i => i.json);

let enc = null;
for (const a of agmts) {
  if (a.id && a.Deleted !== 'X') { enc = a; break; }
}

return {
  json: {
    ...config,
    agendamento_id_antigo:    enc ? enc.id : null,
    agendamento_encontrado:   !!enc,
    dados_agendamento_antigo: enc || null,
    data_hora_antiga:         enc ? (enc.AppointmentDate + ' ' + enc.fromTime) : null
  }
};
