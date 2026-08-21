// =============================================================
// UNIFICAR ID PACIENTE
// Recebe os dois caminhos do IF "Paciente Existe?" e devolve um único
// id_paciente_final, mais a data ISO e o toTime que o create_appointment exige.
// =============================================================

let idFinal = null;
let telefoneFinal = null;

// Caminho novo paciente
try {
  const novo = $('Criar Novo Paciente').all();
  if (novo.length > 0) {
    idFinal = novo[0].json.id || novo[0].json.PatientId || novo[0].json.personId || null;
  }
} catch (e) {}

// Caminho paciente existente
if (!idFinal) {
  try {
    const exist = $('Buscar Paciente Agendar').all();
    if (exist.length > 0) {
      idFinal       = exist[0].json.id || exist[0].json.PatientId || exist[0].json.personId || null;
      telefoneFinal = exist[0].json.MobilePhone || exist[0].json.Phone || null;
    }
  } catch (e) {}
}

const base = $('Validar Slot Agendar').first().json;

if (!telefoneFinal) telefoneFinal = base.telefone_limpo;
telefoneFinal = telefoneFinal.toString().replace(/\D/g, '');

const dataISO = DateTime.fromFormat(
  base.data_agendada + ' ' + base.horario_agendado,
  'yyyy-MM-dd HH:mm',
  { zone: base.config_agenda?.timezone || 'America/Sao_Paulo' }
).toISO();

const dur = base.config_agenda?.duracao_servico || 30;
const toTime = DateTime.fromFormat(base.horario_agendado, 'HH:mm')
  .plus({ minutes: dur })
  .toFormat('HH:mm');

return {
  json: {
    ...base,
    id_paciente_final:   idFinal,
    telefone_prontuario: telefoneFinal,
    data_agendada_iso:   dataISO,
    to_time:             toTime
  }
};
