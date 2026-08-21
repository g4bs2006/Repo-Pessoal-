#!/usr/bin/env node
/**
 * gerar_workflow.js — n8n-agendamento-odontologico
 *
 * Gera o workflow n8n completo de agendamento odontológico (Clinicorp)
 * já com o subsistema de CRM da Helena nas TRÊS cadeias, padrão Luna v4.
 *
 *   node gerar_workflow.js <config.json> <saida.json>
 *
 * 78 nós: 3 core + 4 consultar + 12 agendar + 9 cancelar + 16 remarcar
 *         + 8 verificar + 9 CRM Agendar + 9 CRM Remarcar + 8 CRM Cancelar
 *
 * Os ids dos nós são derivados por hash de (prefixo + nome do nó): rodar duas
 * vezes com a mesma config dá o mesmo arquivo, e duas clínicas diferentes nunca
 * colidem id. Nunca reaproveite ids de outra clínica manualmente.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─────────────────────────────────────────────────────────── entrada

const [configPath, outPath] = process.argv.slice(2);
if (!configPath || !outPath) {
  console.error('uso: node gerar_workflow.js <config.json> <saida.json>');
  process.exit(1);
}

const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const obrigatorios = [
  'clinica.nome_empresa', 'clinica.prefixo', 'webhook.path',
  'clinicorp.subscriber_id', 'clinicorp.api_key', 'clinicorp.business_id',
  'clinicorp.link_agenda', 'clinicorp.profissional.id', 'clinicorp.profissional.nome',
  'agenda.duracao_servico', 'helena.company_id'
];
const falt = obrigatorios.filter(k => k.split('.').reduce((o, p) => (o == null ? o : o[p]), cfg) == null);
if (falt.length) {
  console.error('config incompleta, faltam:\n  ' + falt.join('\n  '));
  process.exit(1);
}

const PREFIX = cfg.clinica.prefixo;
const TPL = f => fs.readFileSync(path.join(__dirname, '..', 'templates', f), 'utf8');

// ─────────────────────────────────────────────────────────── helpers

const uid = seed => {
  const h = crypto.createHash('md5').update(PREFIX + '|' + seed).digest('hex');
  return [h.slice(0, 8), h.slice(8, 12), '4' + h.slice(13, 16), 'a' + h.slice(17, 20), h.slice(20, 32)].join('-');
};

const nodes = [];
const conns = {};

function add(name, type, typeVersion, parameters, position, extra) {
  const n = { parameters, type, typeVersion, position, id: uid(name), name };
  if (extra) Object.assign(n, extra);
  nodes.push(n);
  return name;
}
function link(from, to, out) {
  out = out || 0;
  conns[from] = conns[from] || { main: [] };
  while (conns[from].main.length <= out) conns[from].main.push([]);
  conns[from].main[out].push({ node: to, type: 'main', index: 0 });
}
function chain() {
  const seq = Array.from(arguments);
  for (let i = 0; i < seq.length - 1; i++) link(seq[i], seq[i + 1]);
}

const CU = "$('Configuracao Unidades').first().json";
const AUTH = `={{ ${CU}.config_agenda.authorization }}`;
const CLINICORP = 'https://api.clinicorp.com/rest/v1';
const HELENA = 'https://api.wts.chat';

const qp = obj => ({
  parameters: Object.keys(obj).map(name => ({ name, value: obj[name] }))
});

function httpGet(name, url, query, pos) {
  return add(name, 'n8n-nodes-base.httpRequest', 4.3, {
    url,
    sendQuery: true,
    queryParameters: qp(query),
    sendHeaders: true,
    headerParameters: qp({ Authorization: AUTH }),
    options: {}
  }, pos);
}
function httpPost(name, url, jsonBody, pos) {
  return add(name, 'n8n-nodes-base.httpRequest', 4.3, {
    method: 'POST',
    url,
    sendHeaders: true,
    headerParameters: qp({ Authorization: AUTH }),
    sendBody: true,
    specifyBody: 'json',
    jsonBody,
    options: {}
  }, pos);
}
function code(name, jsCode, pos) {
  return add(name, 'n8n-nodes-base.code', 2, { jsCode }, pos);
}
function ifNode(name, leftValue, operation, pos) {
  const operator = operation === 'true'
    ? { type: 'boolean', operation: 'true', singleValue: true }
    : { type: 'string', operation };
  return add(name, 'n8n-nodes-base.if', 2.2, {
    conditions: {
      options: { version: 2, leftValue: '', caseSensitive: true, typeValidation: 'loose' },
      conditions: [{ id: uid(name + '-c1'), leftValue, rightValue: '', operator }],
      combinator: 'and'
    },
    options: {}
  }, pos);
}
function respond(name, responseBody, pos) {
  return add(name, 'n8n-nodes-base.respondToWebhook', 1.4, {
    respondWith: 'json', responseBody, options: {}
  }, pos);
}
function log(name, acao, status, detalhes, pos) {
  return add(name, 'n8n-nodes-base.supabase', 1, {
    tableId: cfg.supabase.tabela_metricas,
    fieldsUi: {
      fieldValues: [
        { fieldId: 'clinica', fieldValue: `={{ ${CU}.config_agenda.nome_empresa }}` },
        { fieldId: 'unidade', fieldValue: `={{ ${CU}.config_agenda.nome_unidade }}` },
        { fieldId: 'acao', fieldValue: acao },
        { fieldId: 'status', fieldValue: status },
        { fieldId: 'telefone_paciente', fieldValue: `={{ ${CU}.telefone_limpo }}` },
        { fieldId: 'nome_paciente', fieldValue: `={{ ${CU}.nome_paciente }}` },
        { fieldId: 'detalhes', fieldValue: detalhes }
      ]
    }
  }, pos, { credentials: { supabaseApi: cfg.supabase.credencial_metricas } });
}

// ─────────────────────────────────────────────────────────── 1. core

add('INICIO', 'n8n-nodes-base.webhook', 2.1, {
  httpMethod: 'POST',
  path: cfg.webhook.path,
  responseMode: 'responseNode',
  options: {}
}, [-620, 900], { webhookId: uid('webhook') });

const cuCode = TPL('configuracao_unidades.js')
  .replace(/__TIMEZONE__/g, cfg.agenda.timezone || 'America/Sao_Paulo')
  .replace(/__SUBSCRIBER_ID__/g, cfg.clinicorp.subscriber_id)
  .replace(/__BUSINESS_ID__/g, cfg.clinicorp.business_id)
  .replace(/__NOME_UNIDADE__/g, cfg.clinica.nome_unidade || cfg.clinica.nome_empresa)
  .replace(/__NOME_EMPRESA__/g, cfg.clinica.nome_empresa)
  .replace(/__LINK_AGENDA__/g, cfg.clinicorp.link_agenda)
  .replace(/__DURACAO__/g, cfg.agenda.duracao_servico)
  .replace(/__CAPACIDADE__/g, cfg.agenda.capacidade_simultanea || 1)
  .replace(/__LIMITE_DIAS__/g, cfg.agenda.limite_dias_busca_normal || 7)
  .replace(/__THRESHOLD__/g, cfg.agenda.threshold_proximidade_min != null ? cfg.agenda.threshold_proximidade_min : 90)
  .replace(/__JANELA_MANHA__/g, JSON.stringify(cfg.agenda.janela_manha || { inicio: '08:00', fim: '12:00' }))
  .replace(/__JANELA_TARDE__/g, JSON.stringify(cfg.agenda.janela_tarde || { inicio: '13:00', fim: '19:00' }))
  .replace(/__CATEGORIA_COR__/g, cfg.textos.categoria_cor)
  .replace(/__CATEGORIA_DESCRICAO__/g, cfg.textos.categoria_descricao)
  .replace(/__NOTA_AGENDAMENTO__/g, cfg.textos.nota_agendamento)
  .replace(/__NOTA_REAGENDAMENTO__/g, cfg.textos.nota_reagendamento)
  .replace(/__NOTA_NOVO_PACIENTE__/g, cfg.textos.nota_novo_paciente)
  .replace(/__PROFISSIONAL_JSON__/g, JSON.stringify(cfg.clinicorp.profissional))
  .replace(/__PROFISSIONAL_FALLBACK_JSON__/g, JSON.stringify(cfg.clinicorp.profissional_fallback || null))
  .replace(/__AUTH_USER__/g, cfg.clinicorp.auth_user || cfg.clinicorp.subscriber_id)
  .replace(/__AUTH_KEY__/g, cfg.clinicorp.api_key)
  .replace(/__HELENA_COMPANY_ID__/g, cfg.helena.company_id);

code('Configuracao Unidades', cuCode, [-400, 900]);

const ACOES = ['verificar_disponibilidade', 'realizar_agendamento', 'cancelar_agendamento',
               'remarcar_agendamento', 'verificar_agendamento_paciente'];
const SAIDAS = ['Consultar', 'Agendar', 'Cancelar', 'Remarcar', 'Verificar Paciente'];

add('Guarda de Transito', 'n8n-nodes-base.switch', 3.3, {
  rules: {
    values: ACOES.map((acao, i) => ({
      conditions: {
        options: { version: 2, leftValue: '', caseSensitive: true, typeValidation: 'strict' },
        conditions: [{
          id: 'r' + (i + 1),
          leftValue: '={{ $json.acao_fluxo }}',
          rightValue: acao,
          operator: { type: 'string', operation: 'equals' }
        }],
        combinator: 'and'
      },
      renameOutput: true,
      outputKey: SAIDAS[i]
    }))
  },
  options: {}
}, [-180, 850]);

chain('INICIO', 'Configuracao Unidades', 'Guarda de Transito');

// ───────────────────────────────────────────── 2. cadeia Consultar

const X = i => 100 + i * 230;

httpGet('Verificar Agenda Disponibilidade', `${CLINICORP}/appointment/get_avaliable_days`, {
  code_link: `={{ ${CU}.config_agenda.link_agenda }}`,
  from: '={{ $json.data_inicio }}',
  to: '={{ $json.data_fim }}',
  showAvailableTimes: 'True',
  subscriber_id: `={{ ${CU}.config_agenda.subscriber_id }}`
}, [X(0), 0]);

code('Logica Inteligente', TPL('logica_inteligente.js'), [X(1), 0]);
respond('Resp: Disponibilidade', '={{ JSON.stringify($json) }}', [X(2), 0]);
log('LOG Disponibilidade', 'consulta_disponibilidade', 'sucesso',
    `=Sugestoes: {{ $('Logica Inteligente').first().json.sugestoes_horarios }}`, [X(3), 0]);

chain('Guarda de Transito', 'Verificar Agenda Disponibilidade', 'Logica Inteligente',
      'Resp: Disponibilidade', 'LOG Disponibilidade');

// ───────────────────────────────────────────── 3. cadeia Agendar

const Y_AG = 320;

httpGet('Verificar Agenda Agendar', `${CLINICORP}/appointment/get_avaliable_times_calendar`, {
  subscriber_id: `={{ ${CU}.config_agenda.subscriber_id }}`,
  code_link: `={{ ${CU}.config_agenda.link_agenda }}`,
  date: '={{ $json.data_agendada }}'
}, [X(0), Y_AG]);

code('Validar Slot Agendar', TPL('validar_slot_agendar.js'), [X(1), Y_AG]);
ifNode('Slot Valido?', '={{ $json.validacao.aprovado }}', 'true', [X(2), Y_AG]);

httpGet('Buscar Paciente Agendar', `${CLINICORP}/patient/get`, {
  subscriber_id: `={{ ${CU}.config_agenda.subscriber_id }}`,
  Name: `={{ ${CU}.nome_paciente }}`,
  Phone: `={{ ${CU}.telefone_limpo }}`
}, [X(3), Y_AG - 100]);

ifNode('Paciente Existe?', '={{ $json.PatientId }}', 'exists', [X(4), Y_AG - 100]);

httpPost('Criar Novo Paciente', `${CLINICORP}/patient/create`, `={
  "subscriber_id": "{{ ${CU}.config_agenda.subscriber_id }}",
  "Name": "{{ ${CU}.nome_paciente }}",
  "MobilePhone": "{{ ${CU}.telefone_limpo }}",
  "Notes": "{{ ${CU}.config_agenda.nota_novo_paciente }} ({{ ${CU}.config_agenda.nome_unidade }}){{ ${CU}.bairro_paciente ? ' - Bairro: ' + ${CU}.bairro_paciente : '' }}"
}`, [X(5), Y_AG]);

code('Unificar ID Paciente', TPL('unificar_id_paciente.js'), [X(6), Y_AG - 100]);

httpPost('Agendar Na Clinicorp', `${CLINICORP}/appointment/create_appointment_by_api`, `={
  "Clinic_BusinessId": {{ $json.config_agenda.business_id }},
  "Patient_PersonId": {{ $json.id_paciente_final }},
  "Dentist_PersonId": {{ $json.id_profissional_final }},
  "PatientName": "{{ ${CU}.nome_paciente }}",
  "MobilePhone": "{{ $json.telefone_prontuario }}",
  "date": "{{ $json.data_agendada_iso }}",
  "fromTime": "{{ $json.horario_agendado }}",
  "toTime": "{{ $json.to_time }}",
  "Notes": "{{ $json.config_agenda.nota_agendamento }} ({{ $json.config_agenda.nome_unidade }}){{ ${CU}.bairro_paciente ? ' | Bairro: ' + ${CU}.bairro_paciente : '' }}{{ ${CU}.spin_resumo ? ' | SPIN: ' + ${CU}.spin_resumo : '' }}",
  "CategoryColor": "{{ $json.config_agenda.categoria_cor }}",
  "CategoryDescription": "{{ $json.config_agenda.categoria_descricao }}"
}`, [X(7), Y_AG - 100]);

respond('Resp: Sucesso Agendamento', `={
  "resultado": "Agendamento confirmado! \\u2705\\n\\n\\ud83d\\uddd3\\ufe0f Data: {{ ${CU}.data_agendada }}\\n\\u23f0 Horario: {{ ${CU}.horario_agendado }}\\n\\ud83d\\udc68\\u200d\\u2695\\ufe0f Dentista: {{ $('Unificar ID Paciente').first().json.nome_profissional_final }}\\n\\ud83d\\udccd Unidade: {{ ${CU}.config_agenda.nome_unidade }}",
  "status": "sucesso",
  "nome_profissional_sugerido": "{{ $('Unificar ID Paciente').first().json.nome_profissional_final }}",
  "data_agendamento": "{{ ${CU}.data_agendada }}",
  "hora_agendamento": "{{ ${CU}.horario_agendado }}"
}`, [X(8), Y_AG - 100]);

log('LOG Sucesso Agendamento', 'agendamento_realizado', 'sucesso',
    `=Data: {{ ${CU}.data_agendada }} - Hora: {{ ${CU}.horario_agendado }} - Bairro: {{ ${CU}.bairro_paciente }}`,
    [X(9), Y_AG - 100]);

respond('Resp: Erro ao Agendar', `={
  "resultado": "Nao foi possivel confirmar o agendamento para {{ $json.data_agendada }} as {{ $json.horario_agendado }}. Motivo: {{ $json.validacao.motivo }}. Escolha outro horario.",
  "status": "erro_validacao"
}`, [X(3), Y_AG + 160]);

log('LOG Erro Agendar', 'agendamento_realizado', 'erro',
    `=Motivo: {{ $('Validar Slot Agendar').first().json.validacao.motivo }}`, [X(4), Y_AG + 160]);

link('Guarda de Transito', 'Verificar Agenda Agendar', 1);
chain('Verificar Agenda Agendar', 'Validar Slot Agendar', 'Slot Valido?');
link('Slot Valido?', 'Buscar Paciente Agendar', 0);
link('Slot Valido?', 'Resp: Erro ao Agendar', 1);
link('Resp: Erro ao Agendar', 'LOG Erro Agendar');
chain('Buscar Paciente Agendar', 'Paciente Existe?');
link('Paciente Existe?', 'Unificar ID Paciente', 0);
link('Paciente Existe?', 'Criar Novo Paciente', 1);
link('Criar Novo Paciente', 'Unificar ID Paciente');
chain('Unificar ID Paciente', 'Agendar Na Clinicorp');
link('Agendar Na Clinicorp', 'Resp: Sucesso Agendamento');
link('Agendar Na Clinicorp', 'CRM Config (Agendar)');
link('Resp: Sucesso Agendamento', 'LOG Sucesso Agendamento');

// ───────────────────────────────────────────── 4. cadeia Cancelar

const Y_CA = 840;
const janela = (campo, dias) =>
  `={{ DateTime.fromISO(${CU}.${campo}).${dias < 0 ? 'minus' : 'plus'}({ days: ${Math.abs(dias)} }).toFormat('yyyy-MM-dd') }}`;

httpGet('Buscar Paciente Cancelar', `${CLINICORP}/patient/get`, {
  subscriber_id: `={{ ${CU}.config_agenda.subscriber_id }}`,
  Phone: `={{ ${CU}.telefone_limpo }}`
}, [X(0), Y_CA]);

httpGet('Listar Agmts Cancelar', `${CLINICORP}/appointment/list`, {
  subscriber_id: `={{ ${CU}.config_agenda.subscriber_id }}`,
  from: janela('data_agendada', -1),
  to: janela('data_agendada', 1),
  businessId: `={{ ${CU}.config_agenda.business_id }}`,
  patientId: '={{ $json.PatientId }}'
}, [X(1), Y_CA]);

code('Filtrar Agmt Cancelar', TPL('filtrar_agmt_cancelar.js'), [X(2), Y_CA]);
ifNode('Achou Para Cancelar?', '={{ $json.agendamento_encontrado }}', 'true', [X(3), Y_CA]);

httpPost('Cancelar Na Clinicorp', `${CLINICORP}/appointment/cancel_appointment`, `={
  "subscriber_id": "{{ ${CU}.config_agenda.subscriber_id }}",
  "id": {{ $json.agendamento_id }}
}`, [X(4), Y_CA - 100]);

respond('Resp: Cancelamento Feito', `={
  "resultado": "Agendamento cancelado com sucesso! \\u2705\\nData: {{ ${CU}.data_agendada }}\\nHorario: {{ ${CU}.horario_agendado }}",
  "status": "sucesso"
}`, [X(5), Y_CA - 100]);

log('LOG Sucesso Cancelamento', 'cancelamento', 'sucesso',
    `=Data: {{ ${CU}.data_agendada }} - Hora: {{ ${CU}.horario_agendado }}`, [X(6), Y_CA - 100]);

respond('Resp: Agmt Nao Encontrado Cancelar', `={
  "resultado": "Nao encontrei agendamento para {{ ${CU}.data_agendada }} as {{ ${CU}.horario_agendado }}. Poderia confirmar a data?",
  "status": "nao_encontrado"
}`, [X(4), Y_CA + 160]);

log('LOG Erro Cancelar', 'cancelamento', 'nao_encontrado',
    `=Data buscada: {{ ${CU}.data_agendada }}`, [X(5), Y_CA + 160]);

link('Guarda de Transito', 'Buscar Paciente Cancelar', 2);
chain('Buscar Paciente Cancelar', 'Listar Agmts Cancelar', 'Filtrar Agmt Cancelar', 'Achou Para Cancelar?');
link('Achou Para Cancelar?', 'Cancelar Na Clinicorp', 0);
link('Achou Para Cancelar?', 'Resp: Agmt Nao Encontrado Cancelar', 1);
link('Cancelar Na Clinicorp', 'Resp: Cancelamento Feito');
link('Cancelar Na Clinicorp', 'CRM Config (Cancelar)');
link('Resp: Cancelamento Feito', 'LOG Sucesso Cancelamento');
link('Resp: Agmt Nao Encontrado Cancelar', 'LOG Erro Cancelar');

// ───────────────────────────────────────────── 5. cadeia Remarcar

const Y_RE = 1300;

httpGet('Buscar Paciente Remarcar', `${CLINICORP}/patient/get`, {
  subscriber_id: `={{ ${CU}.config_agenda.subscriber_id }}`,
  Phone: `={{ ${CU}.telefone_limpo }}`
}, [X(0), Y_RE]);

httpGet('Listar Agmts Remarcar', `${CLINICORP}/appointment/list`, {
  subscriber_id: `={{ ${CU}.config_agenda.subscriber_id }}`,
  from: janela('data_antiga', -1),
  to: janela('data_antiga', 1),
  businessId: `={{ ${CU}.config_agenda.business_id }}`,
  patientId: '={{ $json.PatientId }}'
}, [X(1), Y_RE]);

code('Filtrar Agmt Antigo', TPL('filtrar_agmt_antigo.js'), [X(2), Y_RE]);
ifNode('Achou o Antigo?', '={{ $json.agendamento_encontrado }}', 'true', [X(3), Y_RE]);

httpGet('Verificar Slots Remarcar', `${CLINICORP}/appointment/get_avaliable_times_calendar`, {
  subscriber_id: `={{ ${CU}.config_agenda.subscriber_id }}`,
  code_link: `={{ ${CU}.config_agenda.link_agenda }}`,
  date: '={{ $json.data_agendada }}'
}, [X(4), Y_RE - 100]);

code('Validar Slot Remarcar', TPL('validar_slot_remarcar.js'), [X(5), Y_RE - 100]);
ifNode('Novo Horario Valido?', '={{ $json.validacao.aprovado }}', 'true', [X(6), Y_RE - 100]);

httpPost('Cancelar Antigo Remarcar', `${CLINICORP}/appointment/cancel_appointment`, `={
  "subscriber_id": "{{ ${CU}.config_agenda.subscriber_id }}",
  "id": {{ $json.agendamento_id_antigo }}
}`, [X(7), Y_RE - 200]);

code('Recuperar Reagendamento', TPL('recuperar_reagendamento.js'), [X(8), Y_RE - 200]);

httpPost('Reagendar Clinicorp', `${CLINICORP}/appointment/create_appointment_by_api`, `={
  "Clinic_BusinessId": {{ $json.config_agenda.business_id }},
  "Patient_PersonId": {{ $json.id_paciente_final }},
  "Dentist_PersonId": {{ $json.id_profissional_final }},
  "PatientName": "{{ ${CU}.nome_paciente }}",
  "MobilePhone": "{{ ${CU}.telefone_limpo }}",
  "date": "{{ $json.data_agendada_iso }}",
  "fromTime": "{{ $json.horario_agendado }}",
  "toTime": "{{ $json.to_time }}",
  "Notes": "{{ $json.config_agenda.nota_reagendamento }} ({{ $json.config_agenda.nome_unidade }}){{ ${CU}.spin_resumo ? ' | SPIN: ' + ${CU}.spin_resumo : '' }}",
  "CategoryColor": "{{ $json.config_agenda.categoria_cor }}",
  "CategoryDescription": "{{ $json.config_agenda.categoria_descricao }}"
}`, [X(9), Y_RE - 200]);

respond('Resp: Remarcado Sucesso', `={
  "resultado": "Agendamento remarcado com sucesso! \\ud83d\\udd04\\n\\nEra: {{ $('Filtrar Agmt Antigo').first().json.data_hora_antiga }}\\nFicou para: {{ ${CU}.data_agendada }} as {{ ${CU}.horario_agendado }}",
  "status": "sucesso",
  "nome_profissional_sugerido": "{{ $('Validar Slot Remarcar').first().json.nome_profissional_final }}"
}`, [X(10), Y_RE - 200]);

log('LOG Sucesso Remarcacao', 'remarcacao', 'sucesso',
    `=De: {{ $('Filtrar Agmt Antigo').first().json.data_hora_antiga }} para: {{ ${CU}.data_agendada }} {{ ${CU}.horario_agendado }}`,
    [X(11), Y_RE - 200]);

respond('Resp: Antigo Nao Encontrado', `={
  "resultado": "Nao encontrei agendamento para remarcar. Poderia confirmar a data atual do agendamento?",
  "status": "agendamento_nao_encontrado"
}`, [X(4), Y_RE + 180]);

log('LOG Erro Busca Antigo', 'remarcacao', 'nao_encontrado',
    `=Data antiga buscada: {{ ${CU}.data_antiga }}`, [X(5), Y_RE + 180]);

respond('Resp: Novo Horario Invalido', `={
  "resultado": "Encontrei seu agendamento atual, mas nao consegui mudar para o novo horario. Motivo: {{ $json.validacao.motivo }}.",
  "status": "erro_validacao_novo"
}`, [X(7), Y_RE + 60]);

log('LOG Erro Novo Horario', 'remarcacao', 'erro',
    `=Motivo: {{ $('Validar Slot Remarcar').first().json.validacao.motivo }}`, [X(8), Y_RE + 60]);

link('Guarda de Transito', 'Buscar Paciente Remarcar', 3);
chain('Buscar Paciente Remarcar', 'Listar Agmts Remarcar', 'Filtrar Agmt Antigo', 'Achou o Antigo?');
link('Achou o Antigo?', 'Verificar Slots Remarcar', 0);
link('Achou o Antigo?', 'Resp: Antigo Nao Encontrado', 1);
link('Resp: Antigo Nao Encontrado', 'LOG Erro Busca Antigo');
chain('Verificar Slots Remarcar', 'Validar Slot Remarcar', 'Novo Horario Valido?');
link('Novo Horario Valido?', 'Cancelar Antigo Remarcar', 0);
link('Novo Horario Valido?', 'Resp: Novo Horario Invalido', 1);
link('Resp: Novo Horario Invalido', 'LOG Erro Novo Horario');
chain('Cancelar Antigo Remarcar', 'Recuperar Reagendamento', 'Reagendar Clinicorp');
link('Reagendar Clinicorp', 'Resp: Remarcado Sucesso');
link('Reagendar Clinicorp', 'CRM Config (Remarcar)');
link('Resp: Remarcado Sucesso', 'LOG Sucesso Remarcacao');

// ───────────────────────────────────────────── 6. cadeia Verificar

const Y_VE = 1900;

httpGet('Buscar Paciente Verificar', `${CLINICORP}/patient/get`, {
  subscriber_id: `={{ ${CU}.config_agenda.subscriber_id }}`,
  Phone: `={{ ${CU}.telefone_limpo }}`
}, [X(0), Y_VE]);

httpGet('Listar Agmts Verificar', `${CLINICORP}/appointment/list`, {
  subscriber_id: `={{ ${CU}.config_agenda.subscriber_id }}`,
  from: `={{ ${CU}.data_agendada ? ${CU}.data_agendada : ${CU}.data_inicio }}`,
  to: `={{ DateTime.fromISO(${CU}.data_inicio).plus({ days: ${cfg.agenda.limite_dias_busca_normal || 7} }).toFormat('yyyy-MM-dd') }}`,
  businessId: `={{ ${CU}.config_agenda.business_id }}`,
  patientId: '={{ $json.PatientId }}'
}, [X(1), Y_VE]);

code('Filtrar Proximo Agmt', TPL('filtrar_proximo_agmt.js'), [X(2), Y_VE]);
ifNode('Encontrou Proximo?', '={{ $json.proximo_encontrado }}', 'true', [X(3), Y_VE]);

respond('Resp: Agmt Encontrado', `={
  "resultado": "Sim! \\u2705 Encontrei seu agendamento para {{ $json.proximo_data }} as {{ $json.proximo_hora }} na {{ ${CU}.config_agenda.nome_unidade }}.",
  "status": "encontrado",
  "data_agendamento": "{{ $json.proximo_data }}",
  "hora_agendamento": "{{ $json.proximo_hora }}"
}`, [X(4), Y_VE - 100]);

log('LOG Verificar Encontrado', 'verificar_agendamento', 'encontrado',
    `=Data: {{ $('Filtrar Proximo Agmt').first().json.proximo_data }} {{ $('Filtrar Proximo Agmt').first().json.proximo_hora }}`,
    [X(5), Y_VE - 100]);

respond('Resp: Agmt Nao Encontrado', `={
  "resultado": "Nao encontrei agendamento futuro na {{ ${CU}.config_agenda.nome_unidade }}. Vamos agendar sua avaliacao?",
  "status": "nao_encontrado"
}`, [X(4), Y_VE + 160]);

log('LOG Verificar Nao Encontrado', 'verificar_agendamento', 'nao_encontrado',
    `=Telefone: {{ ${CU}.telefone_limpo }}`, [X(5), Y_VE + 160]);

link('Guarda de Transito', 'Buscar Paciente Verificar', 4);
chain('Buscar Paciente Verificar', 'Listar Agmts Verificar', 'Filtrar Proximo Agmt', 'Encontrou Proximo?');
link('Encontrou Proximo?', 'Resp: Agmt Encontrado', 0);
link('Encontrou Proximo?', 'Resp: Agmt Nao Encontrado', 1);
link('Resp: Agmt Encontrado', 'LOG Verificar Encontrado');
link('Resp: Agmt Nao Encontrado', 'LOG Verificar Nao Encontrado');

// ───────────────────────────────── 7. subsistema CRM Helena (v4)

/**
 * Três cadeias, uma por operação. Na v4 as TRÊS etiquetam o contato:
 * o agente não aplica mais tag nenhuma, então o que não estiver aqui
 * simplesmente não é registrado em lugar nenhum.
 */
function cadeiaCRM(chainName, tagField, criaCard, y) {
  const C = ` (${chainName})`;
  const cfgNode = 'CRM Config' + C;
  const token = `$('${cfgNode}').first().json.helena_token`;
  const helenaAuth = `=Bearer {{ ${token} }}`;

  add(cfgNode, 'n8n-nodes-base.supabase', 1, {
    operation: 'getAll',
    tableId: cfg.supabase.tabela_automacao,
    limit: 1,
    filters: {
      conditions: [{
        keyName: 'helena_company_id',
        condition: 'eq',
        keyValue: `={{ ${CU}.helena_company_id }}`
      }]
    }
  }, [X(0), y], { credentials: { supabaseApi: cfg.supabase.credencial_automacao } });

  add('Buscar Sessao' + C, 'n8n-nodes-base.httpRequest', 4.3, {
    url: `=${HELENA}/chat/v2/session/{{ ${CU}.id_atendimento }}`,
    sendHeaders: true,
    headerParameters: qp({ Authorization: helenaAuth }),
    options: {}
  }, [X(1), y]);

  ifNode('Tem ContactId?' + C, `={{ $json.contactId }}`, 'notEmpty', [X(2), y]);

  const contactId = `$('Buscar Sessao${C}').first().json.contactId`;

  add('Tag ' + tagField.label + ' Contato' + C, 'n8n-nodes-base.httpRequest', 4.3, {
    method: 'POST',
    url: `=${HELENA}/core/v1/contact/{{ ${contactId} }}/tags`,
    sendHeaders: true,
    headerParameters: qp({ Authorization: helenaAuth, 'Content-Type': 'application/json' }),
    sendBody: true,
    specifyBody: 'json',
    jsonBody: `={
  "tagIds": ["{{ $('${cfgNode}').first().json.${tagField.column} }}"],
  "operation": "InsertIfNotExists"
}`,
    options: {}
  }, [X(3), y]);

  add('Buscar Card' + C, 'n8n-nodes-base.httpRequest', 4.3, {
    url: `=${HELENA}/crm/v1/panel/card?PanelId={{ $('${cfgNode}').first().json.panel_id }}&ContactId={{ ${contactId} }}`,
    sendHeaders: true,
    headerParameters: qp({ Authorization: helenaAuth }),
    options: {}
  }, [X(4), y]);

  const tplCard = chainName === 'Cancelar'
    ? TPL('montar_card_cancelar.js')
    : TPL('montar_card.js').replace(/__CHAIN__/g, chainName);
  code('Montar Card' + C, tplCard, [X(5), y]);

  ifNode('Card Existe?' + C, '={{ $json.hasCard }}', 'true', [X(6), y]);

  add('Mover Card' + C, 'n8n-nodes-base.httpRequest', 4.3, {
    method: 'PUT',
    url: `=${HELENA}/crm/v2/panel/card/{{ $('Montar Card${C}').first().json.cardId }}`,
    sendHeaders: true,
    headerParameters: qp({ Authorization: helenaAuth, 'Content-Type': 'application/json' }),
    sendBody: true,
    specifyBody: 'json',
    jsonBody: `={{ $('Montar Card${C}').first().json.moveBodyJson }}`,
    options: {}
  }, [X(7), y - 80]);

  chain(cfgNode, 'Buscar Sessao' + C, 'Tem ContactId?' + C);
  // só a saída true do IF é conectada: falha fechada se não houver contactId
  link('Tem ContactId?' + C, 'Tag ' + tagField.label + ' Contato' + C, 0);
  chain('Tag ' + tagField.label + ' Contato' + C, 'Buscar Card' + C, 'Montar Card' + C, 'Card Existe?' + C);
  link('Card Existe?' + C, 'Mover Card' + C, 0);

  if (criaCard) {
    add('Criar Card' + C, 'n8n-nodes-base.httpRequest', 4.3, {
      method: 'POST',
      url: `${HELENA}/crm/v1/panel/card`,
      sendHeaders: true,
      headerParameters: qp({ Authorization: helenaAuth, 'Content-Type': 'application/json' }),
      sendBody: true,
      specifyBody: 'json',
      jsonBody: `={{ $('Montar Card${C}').first().json.createBodyJson }}`,
      options: {}
    }, [X(7), y + 80]);
    link('Card Existe?' + C, 'Criar Card' + C, 1);
  }
  // Cancelar: a saída false NÃO é conectada. Quem cancelou não ganha card novo.
}

cadeiaCRM('Agendar',  { label: 'Agendou',  column: 'agendado_contact_tag_id' },  true,  2350);
cadeiaCRM('Remarcar', { label: 'Remarcou', column: 'remarcado_contact_tag_id' }, true,  2700);
cadeiaCRM('Cancelar', { label: 'Cancelou', column: 'cancelado_contact_tag_id' }, false, 3050);

// ─────────────────────────────────────────────────────────── saída

const workflow = {
  name: cfg.clinica.nome_workflow || `AGENDAMENTOS - ${cfg.clinica.nome_empresa}`,
  nodes,
  connections: conns,
  settings: { executionOrder: 'v1' }
};

fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2), 'utf8');

const porTipo = {};
nodes.forEach(n => { const t = n.type.replace('n8n-nodes-base.', ''); porTipo[t] = (porTipo[t] || 0) + 1; });

console.log(`✅ ${outPath}`);
console.log(`   ${nodes.length} nós | webhook: POST /${cfg.webhook.path}`);
console.log('   ' + Object.entries(porTipo).map(([t, c]) => `${t}:${c}`).join('  '));
