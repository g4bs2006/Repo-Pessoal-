#!/usr/bin/env node
/**
 * descobrir_config.js — n8n-agendamento-odontologico
 *
 * Preenche automaticamente business_id, id do profissional e um rascunho
 * de janela de funcionamento a partir de só 3 dados que a clínica já sabe
 * de cabeça: usuário API, token API e o code_link da agenda pública
 * (o número no fim de um link tipo https://agenda.link/871028).
 *
 *   node descobrir_config.js --auth-user spl --api-key <token> --code-link 871028 [opções]
 *
 * Opções:
 *   --dias N              janela de amostragem em dias (default 15)
 *   --nome-empresa "..."  nome a usar em clinica.nome_empresa (default: Name do business)
 *   --prefixo SCO         prefixo da clínica (default: derivado do nome, maiúsculo)
 *   --out arquivo.json    onde salvar (default: stdout)
 *
 * O que ele resolve sozinho: clinicorp.business_id, clinicorp.profissional
 * (id + nome), clinica.nome_empresa/nome_unidade, e um RASCUNHO de
 * agenda.janela_manha/janela_tarde a partir da amostra real de horários.
 *
 * O que continua exigindo humano, porque nenhum endpoint da Clinicorp
 * devolve isso: helena.company_id, a linha em automacao_clinicas, as
 * credenciais Supabase, o path do webhook, e os textos de nota/categoria.
 * Esses campos saem como "COLE_*" no JSON de saída, do jeito que o
 * gerar_workflow.js já espera.
 *
 * IMPORTANTE — achados confirmados ao vivo (Scopel, 2026-08-19) que este
 * script já embute:
 *   1. O campo de horários do retorno de get_avaliable_days é `AvaliableTimes`
 *      (com o typo), não `AvailableTimes` como a documentação Swagger diz.
 *      A Clinicorp corrigiu o nome na doc mas não na API. Ver
 *      `03_Documentacao/API Clinicorp/clinicorp-api-business-professional.md`.
 *   2. O valor de `subscriber_id` não parece ser validado contra a conta —
 *      qualquer string não-vazia funciona, porque o Basic Auth já resolve
 *      o assinante. Ainda assim é OBRIGATÓRIO enviar o parâmetro (vazio dá
 *      erro 400). Este script usa o próprio `auth_user` como subscriber_id.
 *   3. `/professional/list_all_professionals` devolve TODO MUNDO cadastrado
 *      como profissional no sistema — incluindo CRC e sócios, não só
 *      dentistas. Por isso o script cruza com quem de fato aparece com
 *      horário na agenda pública (`code_link`) antes de sugerir um principal.
 */

'use strict';

const fs = require('fs');

function parseArgs(argv) {
  const out = { dias: 15 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const val = argv[i + 1];
    out[key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = val;
    i++;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const REQUIRED = ['authUser', 'apiKey', 'codeLink'];
const falt = REQUIRED.filter(k => !args[k]);
if (falt.length) {
  console.error('uso: node descobrir_config.js --auth-user <user> --api-key <token> --code-link <code_link> [--dias 15] [--nome-empresa "..."] [--prefixo SCO] [--out arquivo.json]');
  console.error('faltam: --' + falt.map(f => f.replace(/[A-Z]/g, m => '-' + m.toLowerCase())).join(', --'));
  process.exit(1);
}

const AUTH_USER = args.authUser;
const API_KEY = args.apiKey;
const CODE_LINK = String(args.codeLink);
const DIAS = parseInt(args.dias, 10) || 15;
const BASE = 'https://api.clinicorp.com/rest/v1';
const AUTH_HEADER = 'Basic ' + Buffer.from(`${AUTH_USER}:${API_KEY}`).toString('base64');

async function get(path, query) {
  const url = new URL(BASE + path);
  Object.entries(query || {}).forEach(([k, v]) => url.searchParams.set(k, v));
  const resp = await fetch(url, { headers: { Authorization: AUTH_HEADER } });
  const body = await resp.json().catch(() => null);
  if (!resp.ok) {
    throw new Error(`${path} → HTTP ${resp.status}: ${body ? JSON.stringify(body) : '(sem corpo)'}`);
  }
  return body;
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.error(`Consultando a API Clinicorp com o usuário "${AUTH_USER}"...`);

  // 1. business/list — subscriber_id exige valor não-vazio, mas não parece
  //    ser validado contra a conta de verdade (achado confirmado na Scopel).
  const businesses = await get('/business/list', { subscriber_id: AUTH_USER });
  if (!Array.isArray(businesses) || businesses.length === 0) {
    throw new Error('business/list devolveu vazio — confira usuário e token.');
  }
  if (businesses.length > 1) {
    console.error(`⚠️  ${businesses.length} clínicas encontradas para este usuário. Usando a primeira. Revise "_descoberta.businesses" no arquivo de saída.`);
  }
  const business = businesses[0];

  // 2. professional/list_all_professionals — devolve TODO MUNDO, sem
  //    subscriber_id (confirmado: o endpoint não pede e funciona sem).
  const staff = await get('/professional/list_all_professionals', {});
  const staffById = new Map(staff.map(p => [String(p.id), p.name]));

  // 3. get_avaliable_days — amostra real da agenda pública (code_link) para
  //    descobrir QUEM de fato atende ali, e um rascunho de janela/duração.
  const hoje = new Date();
  const fim = new Date(hoje);
  fim.setDate(fim.getDate() + DIAS);
  const dias = await get('/appointment/get_avaliable_days', {
    subscriber_id: AUTH_USER,
    code_link: CODE_LINK,
    from: fmtDate(hoje),
    to: fmtDate(fim),
    showAvailableTimes: 'True'
  });

  const contagemPorProfissional = new Map();      // total de slots (usado no ranking)
  const diasPorProfissional = new Map();          // dias distintos com pelo menos 1 slot
  const duracoes = new Map();
  let minMin = Infinity, maxMin = -Infinity;
  let temSlotSemanaFinal = false;

  const toMin = hhmm => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  for (const dia of dias) {
    const slots = (dia.AvaliableTimes || dia.AvailableTimes || []).filter(s => s.isSelectable !== false);
    if (!dia.AvaliableTimes && dia.AvailableTimes) {
      console.error('⚠️  Este payload usa AvailableTimes (grafia da doc), não AvaliableTimes (grafia de produção conhecida). Confira se a API mudou — ver clinicorp-api-business-professional.md.');
    }
    const dow = new Date(dia.jsonDate + 'T12:00:00').getDay();
    if (dow === 0 || dow === 6) temSlotSemanaFinal = temSlotSemanaFinal || slots.length > 0;

    const profissionaisNoDia = new Set();
    for (const s of slots) {
      const pid = String(s.professionalId);
      contagemPorProfissional.set(pid, (contagemPorProfissional.get(pid) || 0) + 1);
      profissionaisNoDia.add(pid);
      const from = toMin(s.from.padStart(5, '0'));
      const to = toMin(s.to.padStart(5, '0'));
      duracoes.set(to - from, (duracoes.get(to - from) || 0) + 1);
      if (from < minMin) minMin = from;
      if (to > maxMin) maxMin = to;
    }
    profissionaisNoDia.forEach(pid => diasPorProfissional.set(pid, (diasPorProfissional.get(pid) || 0) + 1));
  }

  if (contagemPorProfissional.size === 0) {
    throw new Error(`Nenhum horário encontrado em ${DIAS} dias para code_link=${CODE_LINK}. Confira o code_link, ou aumente --dias.`);
  }

  const ranking = [...contagemPorProfissional.entries()].sort((a, b) => b[1] - a[1]);
  const [principalId, principalCount] = ranking[0];
  const principalNome = staffById.get(principalId) || '(nome não encontrado na lista de profissionais)';

  let fallback = null;
  if (ranking.length > 1) {
    const [fbId] = ranking[1];
    fallback = { id: Number(fbId), nome: staffById.get(fbId) || '(nome não encontrado)' };
    console.error(`⚠️  ${ranking.length} profissionais distintos apareceram na agenda. Usando o mais frequente como principal, o segundo como fallback sugerido — confirme com a clínica.`);
  }

  const duracaoMaisComum = [...duracoes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 30;
  if (duracoes.size > 1) {
    console.error(`⚠️  Duração de slot não é constante na amostra (${[...duracoes.keys()].join(', ')} min). Usando a mais comum (${duracaoMaisComum} min) — confirme com a clínica.`);
  }

  const minH = String(Math.floor(minMin / 60)).padStart(2, '0') + ':' + String(minMin % 60).padStart(2, '0');
  const maxH = String(Math.floor(maxMin / 60)).padStart(2, '0') + ':' + String(maxMin % 60).padStart(2, '0');
  const meio = Math.round((minMin + maxMin) / 2 / 30) * 30;
  const meioH = String(Math.floor(meio / 60)).padStart(2, '0') + ':' + String(meio % 60).padStart(2, '0');

  const nomeEmpresa = args.nomeEmpresa || business.Name || business.BusinessName;
  const prefixo = args.prefixo || nomeEmpresa.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase();

  const config = {
    clinica: {
      nome_empresa: nomeEmpresa,
      nome_unidade: nomeEmpresa,
      nome_workflow: `AGENDAMENTOS - ${nomeEmpresa}`,
      prefixo,
      cidade_uf: 'COLE_CIDADE_UF'
    },
    webhook: { path: `COLE_PATH_WEBHOOK (ex: agendamentos-${prefixo.toLowerCase()})` },
    clinicorp: {
      subscriber_id: AUTH_USER,
      auth_user: AUTH_USER,
      api_key: API_KEY,
      business_id: business.id,
      link_agenda: CODE_LINK,
      profissional: { id: Number(principalId), nome: principalNome },
      profissional_fallback: fallback
    },
    agenda: {
      duracao_servico: duracaoMaisComum,
      capacidade_simultanea: 'COLE_PACIENTES_POR_HORARIO',
      limite_dias_busca_normal: 15,
      threshold_proximidade_min: 90,
      timezone: 'America/Sao_Paulo',
      janela_manha: { inicio: minH, fim: meioH },
      janela_tarde: { inicio: meioH, fim: maxH }
    },
    textos: {
      categoria_cor: '#COLE_COR_HEX',
      categoria_descricao: 'Avaliacao',
      nota_agendamento: `Agendamento realizado via IA`,
      nota_reagendamento: `Reagendamento realizado via IA`,
      nota_novo_paciente: `Paciente cadastrado via IA`
    },
    helena: { company_id: 'COLE_UUID_HELENA_COMPANY_ID' },
    supabase: {
      tabela_automacao: 'automacao_clinicas',
      tabela_metricas: 'metricas_ia',
      credencial_automacao: { id: 'COLE_ID_CRED_SUPABASE', name: 'COLE_NOME_CREDENCIAL' },
      credencial_metricas: { id: 'COLE_ID_CRED_METRICAS', name: 'COLE_NOME_CREDENCIAL' }
    },
    _descoberta: {
      gerado_em_utc: new Date().toISOString(),
      aviso: 'Bloco informativo, não usado pelo gerar_workflow.js. Serve para revisão humana antes de rodar o gerador.',
      janela_manha_fim_e_janela_tarde_inicio: `RASCUNHO — ${meioH} é o ponto médio observado entre o primeiro e o último horário livre, não necessariamente o horário de almoço real. Confirme com a clínica.`,
      businesses_encontrados: businesses,
      profissionais_com_horario_na_agenda_publica: ranking.map(([id, count]) => ({
        id: Number(id), nome: staffById.get(id) || '(desconhecido)',
        dias_com_slot: diasPorProfissional.get(id) || 0, total_slots: count
      })),
      staff_completo_do_sistema: staff,
      amostra_dias_verificados: dias.length,
      tem_slot_em_fim_de_semana: temSlotSemanaFinal
    }
  };

  const json = JSON.stringify(config, null, 2);
  if (args.out) {
    fs.writeFileSync(args.out, json, 'utf8');
    console.error(`✅ salvo em ${args.out}`);
  } else {
    console.log(json);
  }

  console.error();
  console.error('Resumo:');
  console.error(`  clínica:      ${nomeEmpresa} (business_id ${business.id})`);
  console.error(`  profissional: ${principalNome} (id ${principalId}), com horário em ${diasPorProfissional.get(principalId)}/${dias.length} dias amostrados (${principalCount} slots)`);
  console.error(`  duração:      ${duracaoMaisComum} min`);
  console.error(`  horário observado: ${minH} às ${maxH}`);
  console.error(`  ${ranking.length} profissional(is) distintos vistos na agenda pública, de ${staff.length} cadastrados no sistema`);
  console.error();
  console.error('Ainda faltam preencher (nenhum endpoint da Clinicorp devolve isso): COLE_* no arquivo gerado.');
}

main().catch(err => {
  console.error('❌ ' + err.message);
  process.exit(1);
});
