// =============================================================
// LÓGICA INTELIGENTE — seleção de horários para oferta ao agente
// Consome o retorno de get_avaliable_days e devolve no máximo 3 blocos.
// As janelas de manhã/tarde vêm da config, não são hardcoded.
// =============================================================

const cfgNode = $('Configuracao Unidades').first().json;
const ca      = cfgNode.config_agenda || {};

const TIMEZONE      = ca.timezone || 'America/Sao_Paulo';
const LIMITE_DIAS   = ca.limite_dias_busca_normal || 7;
const THRESHOLD_MIN = ca.threshold_proximidade_min ?? 90;

const JANELA_MANHA = ca.janela_manha || { inicio: '08:00', fim: '12:00' };
const JANELA_TARDE = ca.janela_tarde || { inicio: '13:00', fim: '19:00' };

const PROF_PRINCIPAL = {
  id:   String(ca.profissional?.id || ''),
  nome: ca.profissional?.nome || 'Profissional'
};
const PROF_FALLBACK = {
  id:   String(ca.profissional_fallback?.id || ''),
  nome: ca.profissional_fallback?.nome || ''
};

const diasAPI  = $input.all().map(i => i.json);
const insistiu = cfgNode.insistiu === true;
const hRaw     = cfgNode.horario_agendado || '';
const dRaw     = cfgNode.data_agendada || '';
const periodoPreferencia = cfgNode.periodo_preferencia || '';
const agora    = DateTime.now().setZone(TIMEZONE);

function horaParaMin(str) {
  if (!str) return -1;
  const p = str.split(':');
  return parseInt(p[0]) * 60 + parseInt(p[1] || '0');
}

function fmtBloco(b) {
  const [, mm, dd] = b.data.split('-');
  return '🗓️ *' + dd + '/' + mm + ' (' + b.semana + ')* às *' + b.horario +
         '* - *' + b.horario_fim + '* com ' + b.profNome;
}

function topNPorProximidade(blocos, minAlvo, n = 3) {
  if (!blocos.length) return [];
  const copia = blocos.slice();
  if (minAlvo < 0) {
    copia.sort((a, b) => a.minutos - b.minutos);
  } else {
    copia.sort((a, b) =>
      Math.abs(a.minutos - minAlvo) - Math.abs(b.minutos - minAlvo)
      || a.minutos - b.minutos
    );
  }
  const vistos = new Set();
  return copia
    .filter(b => {
      const chave = b.data + '_' + b.horario;
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    })
    .slice(0, n);
}

function topNDiasComMelhorHorario(blocos, dataRef, minAlvo, n = 3) {
  const porDia = {};
  for (const b of blocos) {
    const atual = porDia[b.data];
    if (!atual) {
      porDia[b.data] = b;
    } else if (minAlvo >= 0
               && Math.abs(b.minutos - minAlvo) < Math.abs(atual.minutos - minAlvo)) {
      porDia[b.data] = b;
    }
  }
  const dias = Object.keys(porDia).sort();
  const pool = dataRef ? dias.filter(d => d >= dataRef) : dias;
  const escolhidos = pool.length >= n ? pool : dias;
  return escolhidos.slice(0, n).map(d => porDia[d]);
}

function processarDia(dia) {
  const slots     = (dia.AvaliableTimes || []).filter(s => s.isSelectable !== false);
  const principal = [];
  const fallback  = [];

  for (const slot of slots) {
    const sid = String(slot.professionalId);
    const bloco = {
      data:        dia.jsonDate,
      semana:      dia.Week,
      minutos:     horaParaMin(slot.from),
      horario:     slot.from,
      horario_fim: slot.to
    };
    if (sid === PROF_PRINCIPAL.id) {
      principal.push({ ...bloco, profId: PROF_PRINCIPAL.id, profNome: PROF_PRINCIPAL.nome });
    } else if (PROF_FALLBACK.id && sid === PROF_FALLBACK.id) {
      fallback.push({ ...bloco, profId: PROF_FALLBACK.id, profNome: PROF_FALLBACK.nome });
    }
  }
  return { principal, fallback };
}

let blocosPrincipal = [];
let blocosFallback  = [];
for (const dia of diasAPI) {
  const { principal, fallback } = processarDia(dia);
  blocosPrincipal = blocosPrincipal.concat(principal);
  blocosFallback  = blocosFallback.concat(fallback);
}

const todosBlocos    = blocosPrincipal.concat(blocosFallback);
const usandoFallback = blocosPrincipal.length === 0 && blocosFallback.length > 0;

let dtSolicitado = null;
if (dRaw && hRaw) {
  dtSolicitado = DateTime.fromFormat(dRaw + ' ' + hRaw, 'yyyy-MM-dd HH:mm', { zone: TIMEZONE });
}

const dataAlvo      = dtSolicitado?.isValid ? dtSolicitado.toFormat('yyyy-MM-dd') : (dRaw || null);
const minSolicitado = (hRaw && hRaw !== '00:00') ? horaParaMin(hRaw) : -1;

const dtLabel = dtSolicitado?.isValid
  ? dtSolicitado.setLocale('pt-BR').toFormat('dd/MM (cccc)')
  : (dRaw || 'data solicitada');

let diffDias = 0, bloqueado = false;
if (dtSolicitado?.isValid) {
  diffDias = dtSolicitado.startOf('day').diff(agora.startOf('day'), 'days').days;
  if (diffDias > LIMITE_DIAS && !insistiu) bloqueado = true;
}

let resultado, exactMatch = false;
const sugestoesHorarios = [];

// CASO PERÍODO — o paciente pediu manhã ou tarde
if (periodoPreferencia) {
  const faixas = {
    manha: { inicio: horaParaMin(JANELA_MANHA.inicio), fim: horaParaMin(JANELA_MANHA.fim) },
    tarde: { inicio: horaParaMin(JANELA_TARDE.inicio), fim: horaParaMin(JANELA_TARDE.fim) + 1 }
  };
  const faixa        = faixas[periodoPreferencia] || faixas.manha;
  const labelPeriodo = periodoPreferencia === 'manha' ? 'manhã' : 'tarde';
  const labelOutro   = periodoPreferencia === 'manha' ? 'tarde' : 'manhã';
  const dataMinima   = dataAlvo || agora.toFormat('yyyy-MM-dd');

  const blocosPeriodo = todosBlocos
    .filter(b => b.minutos >= faixa.inicio && b.minutos < faixa.fim && b.data >= dataMinima)
    .sort((a, b) => a.data.localeCompare(b.data) || a.minutos - b.minutos);

  if (blocosPeriodo.length === 0) {
    resultado = '😕 Não há horários disponíveis no período da *' + labelPeriodo +
                '* para *' + dtLabel + '*.\n\nTemos opções no período da *' + labelOutro +
                '*. Prefere que eu verifique?';
  } else {
    const primeiro = blocosPeriodo[0];
    sugestoesHorarios.push(primeiro.data + ' ' + primeiro.horario);
    const blocosMesmoDia  = blocosPeriodo.filter(b => b.data === primeiro.data);
    const segundoMesmoDia = blocosMesmoDia.find(b => b.minutos - primeiro.minutos >= 120);
    const segundo         = segundoMesmoDia || blocosPeriodo.find(b => b.data > primeiro.data);
    if (segundo) {
      sugestoesHorarios.push(segundo.data + ' ' + segundo.horario);
      resultado = '📅 Encontrei dois horários disponíveis no período da *' + labelPeriodo +
                  '*:\n\n' + fmtBloco(primeiro) + '\n' + fmtBloco(segundo) +
                  '\n\nQual desses fica melhor para você?';
    } else {
      resultado = '📅 Encontrei o seguinte horário no período da *' + labelPeriodo +
                  '*:\n\n' + fmtBloco(primeiro) + '\n\nEsse horário funciona para você?';
    }
  }
}
// CASO A — data muito distante e o paciente não insistiu
else if (bloqueado) {
  const limiteData         = agora.startOf('day').plus({ days: LIMITE_DIAS }).toFormat('yyyy-MM-dd');
  const blocosDentroLimite = todosBlocos.filter(b => b.data <= limiteData);
  const proximos           = topNDiasComMelhorHorario(
    blocosDentroLimite, agora.toFormat('yyyy-MM-dd'), minSolicitado, 3
  );

  if (proximos.length === 0) {
    resultado = '😕 Não há horários disponíveis nos próximos ' + LIMITE_DIAS +
                ' dias.\n\nPosso verificar outra data?';
  } else {
    proximos.forEach(b => sugestoesHorarios.push(b.data + ' ' + b.horario));
    resultado = '⚠️ A data que você pediu (*' + dtLabel + '*) está a *' +
                Math.ceil(diffDias) + ' dias* de hoje.\n\n' +
                'Para garantir um atendimento mais rápido, separei os horários disponíveis mais próximos:\n\n' +
                proximos.map(fmtBloco).join('\n');
  }
}
// CASO B — fluxo normal
else {
  const blocosDoDia = dataAlvo ? todosBlocos.filter(b => b.data === dataAlvo) : [];

  const melhorDoDia = blocosDoDia.length > 0
    ? topNPorProximidade(blocosDoDia, minSolicitado, 1)[0]
    : null;

  const distanciaMelhor = (melhorDoDia && minSolicitado >= 0)
    ? Math.abs(melhorDoDia.minutos - minSolicitado)
    : 0;

  const diaTemSlotProximo = melhorDoDia !== null
    && (minSolicitado < 0 || distanciaMelhor <= THRESHOLD_MIN);

  if (diaTemSlotProximo) {
    const exato = minSolicitado >= 0
      ? blocosDoDia.find(b => b.minutos === minSolicitado)
      : null;

    if (exato) {
      exactMatch = true;
      sugestoesHorarios.push(exato.data + ' ' + exato.horario);
      resultado = '✅ Ótima notícia! O horário *' + dtLabel + ' às ' + exato.horario +
                  '* está disponível com *' + exato.profNome + '*.\n\nPosso confirmar sua avaliação?';
    } else {
      const opcoes = topNPorProximidade(blocosDoDia, minSolicitado, 3);
      opcoes.forEach(b => sugestoesHorarios.push(b.data + ' ' + b.horario));
      const intro = minSolicitado >= 0
        ? 'Não temos exatamente às *' + hRaw + '* em *' + dtLabel + '*, mas tenho estas opções no mesmo dia:'
        : 'Encontrei os seguintes horários disponíveis em *' + dtLabel + '*:';
      resultado = '📅 ' + intro + '\n\n' + opcoes.map(fmtBloco).join('\n') +
                  '\n\nQual desses fica melhor para você?';
    }
  } else {
    const dataRef  = dataAlvo || agora.toFormat('yyyy-MM-dd');
    const proximos = topNDiasComMelhorHorario(
      todosBlocos.filter(b => b.data >= dataRef), dataRef, minSolicitado, 3
    );

    if (proximos.length === 0) {
      resultado = dataAlvo
        ? '😕 Não há horários disponíveis em *' + dtLabel + '* nem nos dias seguintes. Posso verificar outras datas?'
        : '😕 Não há horários disponíveis no período consultado. Posso verificar outras datas?';
    } else {
      proximos.forEach(b => sugestoesHorarios.push(b.data + ' ' + b.horario));
      const intro = blocosDoDia.length > 0
        ? 'Não temos um horário próximo de *' + hRaw + '* em *' + dtLabel + '*, mas encontrei estas opções nos dias mais próximos:'
        : dataAlvo
          ? 'Não há horários em *' + dtLabel + '*, mas encontrei estas opções nos dias mais próximos:'
          : 'Encontrei estas opções nos dias mais próximos:';
      resultado = '📅 ' + intro + '\n\n' + proximos.map(fmtBloco).join('\n') +
                  '\n\nQual desses fica melhor para você?';
    }
  }
}

// nome_profissional_sugerido — o agente usa no E8 e no campo [DENTISTA] da nota
const primeiroBloco = sugestoesHorarios.length
  ? todosBlocos.find(b => (b.data + ' ' + b.horario) === sugestoesHorarios[0])
  : null;

return {
  json: {
    resultado,
    sugestoes_horarios:         sugestoesHorarios,
    nome_profissional_sugerido: primeiroBloco ? primeiroBloco.profNome : (PROF_PRINCIPAL.nome || ''),
    data_distante_bloqueada:    bloqueado,
    exact_match:                exactMatch,
    diff_dias:                  Math.ceil(diffDias),
    total_dias_api:             diasAPI.length,
    total_blocos_validos:       todosBlocos.length,
    usando_fallback:            usandoFallback
  }
};
