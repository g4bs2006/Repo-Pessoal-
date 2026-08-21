// =============================================================
// VALIDAR SLOT REMARCAR
// Mesma validação do Agendar, mais o patientId e o id do agendamento antigo,
// que a cadeia de remarcação precisa carregar adiante.
// =============================================================

let d = {};
try { d = $('Configuracao Unidades').first().json; } catch (e) { d = $input.item.json; }

const PROF_PRINCIPAL = {
  id:   String(d.config_agenda?.profissional?.id || ''),
  nome: d.config_agenda?.profissional?.nome || 'Profissional'
};
const PROF_FALLBACK = {
  id:   String(d.config_agenda?.profissional_fallback?.id || ''),
  nome: d.config_agenda?.profissional_fallback?.nome || ''
};

const inputItems    = $input.all().map(i => i.json);
const isNovoFormato = inputItems.length > 0 && Array.isArray(inputItems[0].AvaliableTimes);

let slots = [];
if (isNovoFormato) {
  slots = (inputItems[0].AvaliableTimes || []).filter(s => s.isSelectable !== false);
} else {
  slots = inputItems;
}

const norm = h => {
  if (!h) return '';
  const p = h.toString().split(':');
  return p[0].padStart(2, '0') + ':' + (p[1] || '00').padStart(2, '0');
};

const hAlvo = norm(d.horario_agendado || '');

function buscarSlot(profId) {
  return slots.find(s => {
    const id   = String(isNovoFormato ? s.professionalId : s.ProfessionalId);
    const from = norm(isNovoFormato ? s.from : s.From);
    return id === profId && from === hAlvo;
  }) || null;
}

let v = { aprovado: false, motivo: 'Horário indisponível.' };
let idF = null, nomeF = '';

if (!slots.length) {
  v.motivo = 'Não há agenda aberta ou horários disponíveis neste dia.';
} else if (!hAlvo) {
  v.motivo = 'Horário solicitado não informado.';
} else {
  let slotEncontrado = buscarSlot(PROF_PRINCIPAL.id);
  if (slotEncontrado) {
    v = { aprovado: true, motivo: 'Horário disponível.' };
    idF = PROF_PRINCIPAL.id; nomeF = PROF_PRINCIPAL.nome;
  } else if (PROF_FALLBACK.id) {
    slotEncontrado = buscarSlot(PROF_FALLBACK.id);
    if (slotEncontrado) {
      v = { aprovado: true, motivo: 'Horário disponível.' };
      idF = PROF_FALLBACK.id; nomeF = PROF_FALLBACK.nome;
    }
  }
  if (!v.aprovado) {
    v.motivo = 'O horário ' + d.horario_agendado + ' não está disponível.';
  }
}

let patientIdRemarcar = null;
try { patientIdRemarcar = $('Buscar Paciente Remarcar').first().json.PatientId; } catch (e) {}

let agendamentoIdAntigo = null;
try { agendamentoIdAntigo = $('Filtrar Agmt Antigo').first().json.agendamento_id_antigo; } catch (e) {}

const dataISO = DateTime.fromFormat(
  d.data_agendada + ' ' + d.horario_agendado,
  'yyyy-MM-dd HH:mm',
  { zone: d.config_agenda?.timezone || 'America/Sao_Paulo' }
).toISO();

return {
  json: {
    ...d,
    validacao:               v,
    id_profissional_final:   idF,
    nome_profissional_final: nomeF,
    hora_buscada:            hAlvo,
    slots_encontrados_total: slots.length,
    patient_id_remarcar:     patientIdRemarcar,
    agendamento_id_antigo:   agendamentoIdAntigo,
    data_agendada_iso:       dataISO
  }
};
