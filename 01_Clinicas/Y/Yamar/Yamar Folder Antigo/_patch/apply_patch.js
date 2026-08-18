const fs = require('fs');
const path = require('path');

const workflowPath = path.join(__dirname, '..', 'workflow.json');
const wf = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

// ─── PATCH 1: Configuracao Unidades — lê `periodo` do body ───────────────────
const cfgNode = wf.nodes.find(n => n.name === 'Configuracao Unidades');
if (!cfgNode) throw new Error('Node "Configuracao Unidades" não encontrado');

cfgNode.parameters.jsCode = cfgNode.parameters.jsCode
  // Adiciona leitura de `periodo` logo após `insistiu`
  .replace(
    "const insistiu = body.insistiu === true || body.insistiu === 'true';",
    "const insistiu = body.insistiu === true || body.insistiu === 'true';\nconst periodo = (body.periodo || body.horario_preferido || '').toString().toLowerCase();"
  )
  // Expõe `periodo` no objeto de retorno (logo antes do `config_agenda`)
  .replace(
    "    acao_fluxo:        body.action || body.acao_fluxo,",
    "    acao_fluxo:        body.action || body.acao_fluxo,\n    periodo:           periodo,"
  );

if (!cfgNode.parameters.jsCode.includes('periodo:           periodo,')) {
  throw new Error('PATCH 1 falhou: campo periodo não inserido no retorno de Configuracao Unidades');
}

// ─── PATCH 2: Logica Inteligente — novo código completo ──────────────────────
const logicNode = wf.nodes.find(n => n.name === 'Logica Inteligente');
if (!logicNode) throw new Error('Node "Logica Inteligente" não encontrado');

const newLogicCode = `// =============================================================
// LÓGICA INTELIGENTE — Yamar (multi-day)
// REGRA DE OFERTA: sempre 2 opções — 1 manhã + 1 tarde — exceto
// quando o lead pediu horário específico ou preferência de período.
// =============================================================

// ── 1. CONFIGURAÇÃO ───────────────────────────────────────────
const cfgNode = $('Configuracao Unidades').first().json;
const ca = cfgNode.config_agenda || {};

const TIMEZONE    = ca.timezone || 'America/Sao_Paulo';
const DUR_MIN     = ca.duracao_servico || 45;
const LIMITE_DIAS = ca.limite_dias_busca_normal || 7;

const PROF_ID   = String(ca.profissional?.id || '');
const PROF_NOME = ca.profissional?.nome || 'Profissional';

// ── 2. INPUT ──────────────────────────────────────────────────
const diasAPI = $input.all().map(i => i.json);

// ── 3. DADOS DO PEDIDO ────────────────────────────────────────
const insistiu   = cfgNode.insistiu === true;
const hRaw       = cfgNode.horario_agendado || '';
const dRaw       = cfgNode.data_agendada   || '';
const agora      = DateTime.now().setZone(TIMEZONE);

// Período solicitado pelo lead: 'manha' | 'tarde' | ''
const periodoRaw = (cfgNode.periodo || '').toString().toLowerCase()
  .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
const PERIODO        = (periodoRaw === 'manha' || periodoRaw === 'tarde') ? periodoRaw : '';
const PERIODO_LABEL  = PERIODO === 'manha' ? 'manhã' : 'tarde';
const PERIODO_OPOSTO = PERIODO === 'manha' ? 'tarde' : 'manhã';

let dtSolicitado = null;
if (dRaw && hRaw) {
  dtSolicitado = DateTime.fromFormat(\`\${dRaw} \${hRaw}\`, 'yyyy-MM-dd HH:mm', { zone: TIMEZONE });
} else if (dRaw) {
  dtSolicitado = DateTime.fromFormat(dRaw, 'yyyy-MM-dd', { zone: TIMEZONE });
}

let diffDias = 0, bloqueado = false;
if (dtSolicitado?.isValid) {
  diffDias = dtSolicitado.startOf('day').diff(agora.startOf('day'), 'days').days;
  if (diffDias > LIMITE_DIAS && !insistiu) bloqueado = true;
}

// ── 4. HELPERS ────────────────────────────────────────────────
function horaParaMin(str) {
  if (!str) return -1;
  const p = str.split(':');
  return parseInt(p[0]) * 60 + parseInt(p[1] || '0');
}

const ehManha = b => b.minutos < 720;   // antes das 12:00
const ehTarde = b => b.minutos >= 720;  // 12:00 em diante

const ordenar = blocos => [...blocos].sort((a, b) =>
  a.data === b.data ? a.minutos - b.minutos : (a.data < b.data ? -1 : 1));

// Duplo vínculo: vaga de manhã mais próxima + vaga de tarde mais próxima.
// Se um dos períodos não tiver vaga, completa com o próximo disponível.
function duploVinculo(blocos) {
  const ord = ordenar(blocos);
  const manha = ord.find(ehManha);
  const tarde  = ord.find(ehTarde);
  const opcoes = [];
  if (manha) opcoes.push(manha);
  if (tarde)  opcoes.push(tarde);
  for (const b of ord) {
    if (opcoes.length >= 2) break;
    if (!opcoes.includes(b)) opcoes.push(b);
  }
  return ordenar(opcoes);
}

// Lead escolheu um período: as 2 vagas mais próximas daquele período
function doPeriodo(blocos, periodo) {
  const filtro = periodo === 'manha' ? ehManha : ehTarde;
  return ordenar(blocos.filter(filtro)).slice(0, 2);
}

// Horário específico indisponível: 1 vaga antes + 1 vaga depois no mesmo dia
function vizinhos(blocosDia, minAlvo) {
  const antes  = ordenar(blocosDia).filter(b => b.minutos < minAlvo).pop();
  const depois = ordenar(blocosDia).find(b => b.minutos > minAlvo);
  return [antes, depois].filter(Boolean);
}

// Seleção central: aplica período se houver; senão, duplo vínculo manhã/tarde
function escolherOpcoes(blocos) {
  if (PERIODO) {
    const op = doPeriodo(blocos, PERIODO);
    if (op.length > 0) return { opcoes: op, periodoEsgotado: false };
    return { opcoes: doPeriodo(blocos, PERIODO === 'manha' ? 'tarde' : 'manha'), periodoEsgotado: true };
  }
  return { opcoes: duploVinculo(blocos), periodoEsgotado: false };
}

const avisoPeriodoEsgotado =
  \`\\n\\n_(No período da \${PERIODO_LABEL} a agenda está cheia — estas opções são da \${PERIODO_OPOSTO}.)_\`;

// ── 5. PROCESSAR UM DIA ───────────────────────────────────────
function processarDia(dia) {
  const slots = (dia.AvaliableTimes || []).filter(s => s.isSelectable !== false);
  const blocos = [];
  for (const slot of slots) {
    if (String(slot.professionalId) !== PROF_ID) continue;
    blocos.push({
      data:        dia.jsonDate,
      semana:      dia.Week,
      minutos:     horaParaMin(slot.from),
      horario:     slot.from,
      horario_fim: slot.to,
      profId:      PROF_ID,
      profNome:    PROF_NOME
    });
  }
  return blocos.sort((a, b) => a.minutos - b.minutos);
}

// ── 6. TODOS OS BLOCOS ────────────────────────────────────────
let todosBlocos = [];
for (const dia of diasAPI) todosBlocos = todosBlocos.concat(processarDia(dia));

// ── 7. FORMATAÇÃO ─────────────────────────────────────────────
const fmtBloco = b => {
  const [yyyy, mm, dd] = b.data.split('-');
  const turno = ehManha(b) ? 'manhã' : 'tarde';
  return \`🗓️ *\${dd}/\${mm} (\${b.semana})* às *\${b.horario}* – *\${b.horario_fim}* (\${turno}) com \${b.profNome}\`;
};

const dtLabel = dtSolicitado?.isValid
  ? dtSolicitado.setLocale('pt-BR').toFormat('dd/MM (cccc)')
  : (dRaw || 'data solicitada');

// ── 8. DECISÃO PRINCIPAL ──────────────────────────────────────
let resultado, exactMatch = false;
const sugestoesHorarios = [];

// CAMINHO A — Data distante + NÃO insistiu
if (bloqueado) {
  const limiteData = agora.startOf('day').plus({ days: LIMITE_DIAS }).toFormat('yyyy-MM-dd');
  const { opcoes, periodoEsgotado } = escolherOpcoes(todosBlocos.filter(b => b.data <= limiteData));
  if (opcoes.length === 0) {
    resultado = \`😕 Não há horários disponíveis nos próximos \${LIMITE_DIAS} dias.\\n\\nPosso verificar outra data?\`;
  } else {
    opcoes.forEach(b => sugestoesHorarios.push(\`\${b.data} \${b.horario}\`));
    resultado =
      \`⚠️ A data que você pediu (*\${dtLabel}*) está a *\${Math.ceil(diffDias)} dias* de hoje.\\n\\n\` +
      \`Para garantir um atendimento mais rápido, separei os horários disponíveis mais próximos:\\n\\n\` +
      opcoes.map(fmtBloco).join('\\n');
    if (periodoEsgotado) resultado += avisoPeriodoEsgotado;
  }
}

// CAMINHO B — Data distante + insistiu
else if (diffDias > LIMITE_DIAS && insistiu) {
  const dataAlvo = dtSolicitado.toFormat('yyyy-MM-dd');
  const minSolicitado = (hRaw && hRaw !== '00:00') ? horaParaMin(hRaw) : -1;
  const blocosDoDia = todosBlocos.filter(b => b.data === dataAlvo);
  const blocoExato  = minSolicitado >= 0 ? blocosDoDia.find(b => b.minutos === minSolicitado) : null;

  if (blocoExato) {
    exactMatch = true;
    sugestoesHorarios.push(\`\${blocoExato.data} \${blocoExato.horario}\`);
    resultado = \`✅ Consegui o horário que você pediu!\\n\\n\${fmtBloco(blocoExato)}\\n\\nConfirmo o agendamento?\`;
  } else if (blocosDoDia.length === 0) {
    resultado = \`😕 Não há horários disponíveis em *\${dtLabel}*.\\n\\nPosso verificar um dia antes ou depois?\`;
  } else {
    let opcoes, periodoEsgotado = false;
    if (minSolicitado >= 0) {
      opcoes = vizinhos(blocosDoDia, minSolicitado);
      if (opcoes.length === 0) ({ opcoes, periodoEsgotado } = escolherOpcoes(blocosDoDia));
    } else {
      ({ opcoes, periodoEsgotado } = escolherOpcoes(blocosDoDia));
    }
    opcoes.forEach(b => sugestoesHorarios.push(\`\${b.data} \${b.horario}\`));
    const intro = minSolicitado >= 0
      ? \`O horário das *\${hRaw}* não está disponível em *\${dtLabel}*, mas encontrei estas opções neste mesmo dia:\`
      : \`Encontrei estas opções em *\${dtLabel}*:\`;
    resultado = \`\${intro}\\n\\n\` + opcoes.map(fmtBloco).join('\\n') + \`\\n\\nQual prefere? Ou verifico outro dia?\`;
    if (periodoEsgotado) resultado += avisoPeriodoEsgotado;
  }
}

// CAMINHOS C / D — Data normal (≤ limite de dias)
else {
  const dataAlvo = dtSolicitado?.isValid ? dtSolicitado.toFormat('yyyy-MM-dd') : null;
  const minSolicitado = (hRaw && hRaw !== '00:00') ? horaParaMin(hRaw) : -1;
  const blocosDoDia   = dataAlvo ? todosBlocos.filter(b => b.data === dataAlvo) : todosBlocos;
  const blocoExato    = (minSolicitado >= 0 && blocosDoDia.length > 0)
    ? blocosDoDia.find(b => b.minutos === minSolicitado) : null;

  if (blocoExato) {
    exactMatch = true;
    sugestoesHorarios.push(\`\${blocoExato.data} \${blocoExato.horario}\`);
    resultado =
      \`✅ Ótima notícia! O horário *\${dtLabel} às \${blocoExato.horario}* está disponível \` +
      \`com *\${blocoExato.profNome}*.\\n\\nPosso confirmar sua avaliação?\`;
  } else if (blocosDoDia.length === 0) {
    const { opcoes, periodoEsgotado } = escolherOpcoes(todosBlocos);
    if (opcoes.length === 0) {
      resultado = \`😕 Não há horários disponíveis no período consultado. Posso verificar outras datas?\`;
    } else {
      opcoes.forEach(b => sugestoesHorarios.push(\`\${b.data} \${b.horario}\`));
      resultado =
        \`😕 Não há horários disponíveis em *\${dtLabel}*.\\n\\nEncontrei estas opções nos próximos dias:\\n\\n\` +
        opcoes.map(fmtBloco).join('\\n') + \`\\n\\nQual desses fica melhor para você?\`;
      if (periodoEsgotado) resultado += avisoPeriodoEsgotado;
    }
  } else {
    let opcoes, periodoEsgotado = false;
    if (minSolicitado >= 0) {
      // Pediu horário específico indisponível: 1 antes + 1 depois no mesmo dia
      opcoes = vizinhos(blocosDoDia, minSolicitado);
      if (opcoes.length === 0) ({ opcoes, periodoEsgotado } = escolherOpcoes(blocosDoDia));
    } else {
      // Sem horário específico: 1 manhã + 1 tarde (ou só o período pedido)
      ({ opcoes, periodoEsgotado } = escolherOpcoes(blocosDoDia));
    }
    opcoes.forEach(b => sugestoesHorarios.push(\`\${b.data} \${b.horario}\`));
    const intro = minSolicitado >= 0
      ? \`O horário das *\${hRaw}* não está disponível para *\${dtLabel}*, mas tenho estas opções:\`
      : (dataAlvo
        ? \`Encontrei os seguintes horários disponíveis para *\${dtLabel}*:\`
        : \`Encontrei os seguintes horários disponíveis:\`);
    resultado = \`📅 \${intro}\\n\\n\` + opcoes.map(fmtBloco).join('\\n') + \`\\n\\nQual desses fica melhor para você?\`;
    if (periodoEsgotado) resultado += avisoPeriodoEsgotado;
  }
}

// ── 9. OUTPUT ─────────────────────────────────────────────────
return {
  json: {
    resultado,
    sugestoes_horarios:      sugestoesHorarios,
    periodo_solicitado:      PERIODO ? PERIODO_LABEL : 'sem preferência',
    data_distante_bloqueada: bloqueado,
    exact_match:             exactMatch,
    diff_dias:               Math.ceil(diffDias),
    total_dias_api:          diasAPI.length,
    total_blocos_validos:    todosBlocos.length
  }
};`;

logicNode.parameters.jsCode = newLogicCode;

// ─── VERIFICAÇÕES ─────────────────────────────────────────────────────────────
if (!logicNode.parameters.jsCode.includes('duploVinculo'))
  throw new Error('PATCH 2 falhou: função duploVinculo não encontrada');
if (!logicNode.parameters.jsCode.includes('escolherOpcoes'))
  throw new Error('PATCH 2 falhou: função escolherOpcoes não encontrada');

// ─── SALVAR ───────────────────────────────────────────────────────────────────
fs.writeFileSync(workflowPath, JSON.stringify(wf, null, 2), 'utf8');
console.log('OK: workflow.json atualizado com sucesso.');
console.log('  - Configuracao Unidades: campo "periodo" adicionado');
console.log('  - Logica Inteligente: novo código com duplo vínculo manhã/tarde');
