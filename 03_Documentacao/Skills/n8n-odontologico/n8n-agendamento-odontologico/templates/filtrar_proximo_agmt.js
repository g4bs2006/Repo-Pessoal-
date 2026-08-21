// =============================================================
// FILTRAR PROXIMO AGMT
// Alimenta os 4 cenários do E7. Devolve apenas o que veio da API,
// nunca uma data suposta.
// =============================================================

const config = $('Configuracao Unidades').first().json;
const agmts  = $input.all().map(i => i.json);

let prox = null;
for (const a of agmts) {
  if (a.id && a.Deleted !== 'X') { prox = a; break; }
}

return {
  json: {
    ...config,
    proximo_encontrado: !!prox,
    proximo_data:       prox ? prox.AppointmentDate : null,
    proximo_hora:       prox ? prox.fromTime : null,
    proximo_id:         prox ? prox.id : null,
    dados_proximo:      prox || null
  }
};
