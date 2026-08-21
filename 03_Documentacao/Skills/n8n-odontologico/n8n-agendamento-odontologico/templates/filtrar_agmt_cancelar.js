// =============================================================
// FILTRAR AGMT CANCELAR
// De appointment/list, escolhe o agendamento a cancelar: primeiro tenta
// casar o horário informado, senão pega o primeiro não deletado do intervalo.
// =============================================================

const config   = $('Configuracao Unidades').first().json;
const horaAlvo = config.horario_agendado;
const agmts    = $input.all().map(i => i.json);

const norm = h => {
  if (!h) return '';
  const p = h.toString().split(':');
  return p[0].padStart(2, '0') + ':' + (p[1] || '00').padStart(2, '0');
};

let enc = null;

for (const a of agmts) {
  if (a.id && a.Deleted !== 'X' && norm(a.fromTime) === norm(horaAlvo)) { enc = a; break; }
}

if (!enc) {
  for (const a of agmts) {
    if (a.id && a.Deleted !== 'X') { enc = a; break; }
  }
}

const agendamentoId = enc ? enc.id : null;

return {
  json: {
    ...config,
    agendamento_id:         agendamentoId,
    agendamento_encontrado: !!agendamentoId,
    dados_agendamento:      enc || null
  }
};
