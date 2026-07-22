const fs = require('fs');
const path = require('path');

const workflowPath = path.join(__dirname, '..', 'workflow.json');
const wf = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

const logicNode = wf.nodes.find(n => n.name === 'Logica Inteligente');
if (!logicNode) throw new Error('Node "Logica Inteligente" não encontrado');

// Novo código — mais simples:
// - Sem duplo vínculo automático (o prompt agora sempre pede o período primeiro)
// - Com período informado: as 2 vagas mais próximas daquele período
// - Com horário específico: verifica exato ou retorna 1 antes + 1 depois
// - Hard cap de 2 em TODOS os caminhos
const newCode = `// =============================================================
// LÓGICA INTELIGENTE — Yamar (multi-day)
// REGRA: máximo 2 opções sempre.
// O prompt já pergunta o período antes de chamar esta habilidade.
// =============================================================

// ── 1. CONFIGURAÇÃO ───────────────────────────────────────────
const cfgNode = $('Configuracao Unidades').first().json;
const ca = cfgNode.config_agenda || {};

const TIMEZONE    = ca.timezone || 'America/Sao_Paulo';
const LIMITE_DIAS = ca.limite_dias_busca_normal || 7;

const PROF_ID   = String(ca.profissional?.id || '');
const PROF_NOME = ca.profissional?.nome || 'Profissional';

// ── 2. INPUT ──────────────────────────────────────────────────
const diasAPI = $input.all().map(i => i.json);

// ── 3. DADOS DO PEDIDO ────────────────────────────────────────
const insistiu = cfgNode.insistiu === true;
const hRaw     = cfgNode.horario_agendado || '';
const dRaw     = cfgNode.data_agendada   || '';
const agora    = DateTime.now().setZone(TIMEZONE);

// Período: 'manha' | 'tarde' | '' — sempre informado pelo prompt antes desta chamada
const periodoRaw = (cfgNode.periodo || '').toString().toLowerCase()
  .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
const PERIODO       = (periodoRaw === 'manha' || periodoRaw === 'tarde') ? periodoRaw : '';
const PERIODO_LABEL = PERIODO === 'manha' ? 'manhã' : 'tarde';

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

const ehManha = b => b.minutos < 720;
const ehTarde = b => b.minutos >= 720;

const ordenar = arr => [...arr].sort((a, b) =>
  a.data === b.data ? a.minutos - b.minutos : (a.data < b.data ? -1 : 1));

// Retorna no máximo 2 vagas do período informado (ou qualquer período se vazio)
function opcoesDoPeriodo(blocos) {
  const filtro = PERIODO === 'manha' ? ehManha : PERIODO === 'tarde' ? ehTarde : () => true;
  const candidatos = ordenar(blocos.filter(filtro));
  if (candidatos.length >= 2) return candidatos.slice(0, 2);
  // Período esgotado — tenta o outro
  if (PERIODO) {
    const outro = PERIODO === 'manha' ? ehTarde : ehManha;
    return ordenar(blocos.filter(outro)).slice(0, 2);
  }
  return candidatos.slice(0, 2);
}

// Horário específico indisponível: 1 antes + 1 depois no mesmo dia (max 2)
function vizinhos(blocosDia, minAlvo) {
  const antes  = ordenar(blocosDia).filter(b => b.minutos < minAlvo).pop();
  const depois = ordenar(blocosDia).find(b => b.minutos > minAlvo);
  return [antes, depois].filter(Boolean).slice(0, 2);
}

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
  const opcoes = opcoesDoPeriodo(todosBlocos.filter(b => b.data <= limiteData));
  if (opcoes.length === 0) {
    resultado = \`😕 Não há horários disponíveis nos próximos \${LIMITE_DIAS} dias.\\n\\nPosso verificar outra data?\`;
  } else {
    opcoes.forEach(b => sugestoesHorarios.push(\`\${b.data} \${b.horario}\`));
    resultado =
      \`⚠️ A data que você pediu (*\${dtLabel}*) está a *\${Math.ceil(diffDias)} dias* de hoje.\\n\\n\` +
      \`Para garantir um atendimento mais rápido, separei os horários mais próximos:\${PERIODO ? ' (período da ' + PERIODO_LABEL + ')' : ''}\\n\\n\` +
      opcoes.map(fmtBloco).join('\\n');
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
    const opcoes = minSolicitado >= 0
      ? vizinhos(blocosDoDia, minSolicitado)
      : opcoesDoPeriodo(blocosDoDia);
    opcoes.forEach(b => sugestoesHorarios.push(\`\${b.data} \${b.horario}\`));
    const intro = minSolicitado >= 0
      ? \`O horário das *\${hRaw}* não está disponível em *\${dtLabel}*, mas encontrei estas opções neste mesmo dia:\`
      : \`Encontrei estas opções em *\${dtLabel}*:\`;
    resultado = \`\${intro}\\n\\n\` + opcoes.map(fmtBloco).join('\\n') + \`\\n\\nQual prefere? Ou verifico outro dia?\`;
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
    const opcoes = opcoesDoPeriodo(todosBlocos);
    if (opcoes.length === 0) {
      resultado = \`😕 Não há horários disponíveis no período consultado. Posso verificar outras datas?\`;
    } else {
      opcoes.forEach(b => sugestoesHorarios.push(\`\${b.data} \${b.horario}\`));
      const periodoInfo = PERIODO ? \` (período da \${PERIODO_LABEL})\` : '';
      resultado =
        \`😕 Não há horários disponíveis em *\${dtLabel}*.\\n\\nEncontrei estas opções nos próximos dias\${periodoInfo}:\\n\\n\` +
        opcoes.map(fmtBloco).join('\\n') + \`\\n\\nQual desses fica melhor para você?\`;
    }
  } else {
    const opcoes = minSolicitado >= 0
      ? vizinhos(blocosDoDia, minSolicitado)
      : opcoesDoPeriodo(blocosDoDia);
    opcoes.forEach(b => sugestoesHorarios.push(\`\${b.data} \${b.horario}\`));
    const intro = minSolicitado >= 0
      ? \`O horário das *\${hRaw}* não está disponível para *\${dtLabel}*, mas tenho estas opções:\`
      : (dataAlvo
        ? \`Encontrei os seguintes horários disponíveis para *\${dtLabel}*\${PERIODO ? ' (período da ' + PERIODO_LABEL + ')' : ''}:\`
        : \`Encontrei os seguintes horários disponíveis\${PERIODO ? ' (período da ' + PERIODO_LABEL + ')' : ''}:\`);
    resultado = \`📅 \${intro}\\n\\n\` + opcoes.map(fmtBloco).join('\\n') + \`\\n\\nQual desses fica melhor para você?\`;
  }
}

// ── 9. OUTPUT — hard cap de 2 ─────────────────────────────────
// Garante nunca mais de 2 sugestões, independente do caminho
const sugestoesFinal = sugestoesHorarios.slice(0, 2);

return {
  json: {
    resultado,
    sugestoes_horarios:      sugestoesFinal,
    periodo_solicitado:      PERIODO ? PERIODO_LABEL : 'sem preferência',
    data_distante_bloqueada: bloqueado,
    exact_match:             exactMatch,
    diff_dias:               Math.ceil(diffDias),
    total_dias_api:          diasAPI.length,
    total_blocos_validos:    todosBlocos.length
  }
};`;

logicNode.parameters.jsCode = newCode;

if (!logicNode.parameters.jsCode.includes('slice(0, 2)'))
  throw new Error('Hard cap não encontrado');

fs.writeFileSync(workflowPath, JSON.stringify(wf, null, 2), 'utf8');
console.log('OK: Logica Inteligente atualizada — hard cap de 2 + função opcoesDoPeriodo');
