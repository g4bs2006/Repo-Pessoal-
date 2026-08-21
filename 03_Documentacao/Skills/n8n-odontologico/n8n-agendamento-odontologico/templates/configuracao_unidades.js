// =============================================================
// CONFIGURAÇÃO MESTRE — __NOME_EMPRESA__
// Gerado por n8n-agendamento-odontologico. Editar a config, não este arquivo.
// =============================================================

const body = $input.item.json.body || $input.item.json;

// id_atendimento — OBRIGATÓRIO na v4. Sem ele o subsistema de CRM não resolve
// o contactId e nenhuma etiqueta ou card é aplicado, silenciosamente.
const idAtendimento = body.id_atendimento || body.atendimento_id || body.session_id || body.sessionId || '';

const telefoneRaw        = body.telefone_cliente || body.telefone_contato || body.telefone || '';
const telefoneLimpo      = telefoneRaw.toString().replace(/\D/g, '');
const nomePaciente       = body.nome_cliente || body.nome_contato || 'Paciente';
const bairroPaciente     = body.bairro_cliente || body.bairro || '';
const spinResumo         = body.spin || body.resumo_spin || '';
const insistiu           = body.insistiu === true || body.insistiu === 'true';
const horarioPreferido   = (body.horario_preferido || '').trim();
const isPeriodo          = /manh[aã]|tarde/i.test(horarioPreferido);
const periodoPreferencia = isPeriodo ? (/tarde/i.test(horarioPreferido) ? 'tarde' : 'manha') : '';

const TIMEZONE = '__TIMEZONE__';

const CONFIG = {
  subscriber_id:             '__SUBSCRIBER_ID__',
  business_id:               '__BUSINESS_ID__',
  nome_unidade:              '__NOME_UNIDADE__',
  nome_empresa:              '__NOME_EMPRESA__',
  link_agenda:               '__LINK_AGENDA__',
  duracao_servico:           __DURACAO__,
  capacidade_simultanea:     __CAPACIDADE__,
  timezone:                  TIMEZONE,
  limite_dias_busca_normal:  __LIMITE_DIAS__,
  threshold_proximidade_min: __THRESHOLD__,
  janela_manha:              __JANELA_MANHA__,
  janela_tarde:              __JANELA_TARDE__,
  categoria_cor:             '__CATEGORIA_COR__',
  categoria_descricao:       '__CATEGORIA_DESCRICAO__',
  nota_agendamento:          '__NOTA_AGENDAMENTO__',
  nota_reagendamento:        '__NOTA_REAGENDAMENTO__',
  nota_novo_paciente:        '__NOTA_NOVO_PACIENTE__',
  profissional:              __PROFISSIONAL_JSON__,
  profissional_fallback:     __PROFISSIONAL_FALLBACK_JSON__,
  authorization: 'Basic ' + Buffer.from('__AUTH_USER__:__AUTH_KEY__').toString('base64')
};

const hoje       = DateTime.now().setZone(CONFIG.timezone);
const dataInicio = hoje.toFormat('yyyy-MM-dd');

const dataRaw = body.data_iso || body.data_inicio || body.data_agendada || '';
let dtP = null;

if (dataRaw) {
  dtP = DateTime.fromISO(dataRaw, { zone: CONFIG.timezone });
  if (!dtP.isValid) dtP = DateTime.fromFormat(dataRaw, 'yyyy-MM-dd HH:mm', { zone: CONFIG.timezone });
  if (!dtP.isValid) dtP = DateTime.fromFormat(dataRaw, 'dd/MM/yyyy HH:mm', { zone: CONFIG.timezone });
  if (!dtP.isValid) dtP = DateTime.fromFormat(dataRaw, 'dd/MM/yyyy', { zone: CONFIG.timezone });
}

const horaDoISO = (dtP && dtP.isValid && (dtP.hour > 0 || dtP.minute > 0))
  ? dtP.toFormat('HH:mm') : '';

const horaEspecifica = !isPeriodo && horarioPreferido.includes(':') ? horarioPreferido : '';
const horaFinal = horaEspecifica
  || ((body.horario_agendado && body.horario_agendado.length >= 4) ? body.horario_agendado : '')
  || ((body.horario && body.horario.length >= 4) ? body.horario : '')
  || horaDoISO;

const dataFinal = (dtP && dtP.isValid) ? dtP.toFormat('yyyy-MM-dd') : '';
const dataFim   = (dtP && dtP.isValid)
  ? dtP.plus({ days: CONFIG.limite_dias_busca_normal }).toFormat('yyyy-MM-dd')
  : hoje.plus({ days: CONFIG.limite_dias_busca_normal }).toFormat('yyyy-MM-dd');

// data_antiga — só remarcação. Aceita ISO e dd/MM/yyyy.
let dataAntiga = body.data_antiga_iso || body.data_antiga || body['data-antiga'] || '';
if (dataAntiga) {
  let dtA = DateTime.fromISO(dataAntiga, { zone: CONFIG.timezone });
  if (!dtA.isValid) dtA = DateTime.fromFormat(dataAntiga, 'dd/MM/yyyy HH:mm', { zone: CONFIG.timezone });
  if (!dtA.isValid) dtA = DateTime.fromFormat(dataAntiga, 'dd/MM/yyyy', { zone: CONFIG.timezone });
  if (dtA.isValid) dataAntiga = dtA.toFormat('yyyy-MM-dd');
}

return {
  json: {
    acao_fluxo:          body.action || body.acao_fluxo,
    id_atendimento:      idAtendimento,
    helena_company_id:   '__HELENA_COMPANY_ID__',
    nome_paciente:       nomePaciente,
    telefone_limpo:      telefoneLimpo,
    bairro_paciente:     bairroPaciente,
    spin_resumo:         spinResumo,
    insistiu:            insistiu,
    data_inicio:         dataInicio,
    data_agendada:       dataFinal,
    data_antiga:         dataAntiga,
    data_fim:            dataFim,
    horario_agendado:    horaFinal,
    horario_preferido:   horarioPreferido,
    periodo_preferencia: periodoPreferencia,
    config_agenda: {
      subscriber_id:             CONFIG.subscriber_id,
      business_id:               CONFIG.business_id,
      nome_unidade:              CONFIG.nome_unidade,
      nome_empresa:              CONFIG.nome_empresa,
      link_agenda:               CONFIG.link_agenda,
      duracao_servico:           CONFIG.duracao_servico,
      capacidade_simultanea:     CONFIG.capacidade_simultanea,
      timezone:                  CONFIG.timezone,
      limite_dias_busca_normal:  CONFIG.limite_dias_busca_normal,
      threshold_proximidade_min: CONFIG.threshold_proximidade_min,
      janela_manha:              CONFIG.janela_manha,
      janela_tarde:              CONFIG.janela_tarde,
      categoria_cor:             CONFIG.categoria_cor,
      categoria_descricao:       CONFIG.categoria_descricao,
      nota_agendamento:          CONFIG.nota_agendamento,
      nota_reagendamento:        CONFIG.nota_reagendamento,
      nota_novo_paciente:        CONFIG.nota_novo_paciente,
      profissional:              CONFIG.profissional,
      profissional_fallback:     CONFIG.profissional_fallback,
      authorization:             CONFIG.authorization
    }
  }
};
