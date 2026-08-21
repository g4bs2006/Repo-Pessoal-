// =============================================================
// RECUPERAR REAGENDAMENTO
// Depois de cancelar o antigo, remonta o payload de criação do novo.
// Remarcar na Clinicorp é cancelar + criar, não um update.
// =============================================================

const base = $('Validar Slot Remarcar').first().json;
const dur  = base.config_agenda?.duracao_servico || 30;

const dataISO = DateTime.fromFormat(
  base.data_agendada + ' ' + base.horario_agendado,
  'yyyy-MM-dd HH:mm',
  { zone: base.config_agenda?.timezone || 'America/Sao_Paulo' }
).toISO();

const toTime = DateTime.fromFormat(base.horario_agendado, 'HH:mm')
  .plus({ minutes: dur })
  .toFormat('HH:mm');

return {
  json: {
    ...base,
    id_paciente_final: base.patient_id_remarcar,
    data_agendada_iso: dataISO,
    to_time:           toTime
  }
};
