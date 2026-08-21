/**
 * n8n_client.js — cliente mínimo da API pública do n8n, com auditoria local.
 *
 * Escopo deliberadamente restrito: só expõe as operações que o
 * `importar_workflow_n8n.js` usa (listar/criar projeto, listar/criar/
 * atualizar/transferir workflow). NENHUMA função de apagar existe aqui,
 * de propósito — a API key tem esse poder, mas este cliente não expõe
 * `deleteProject` nem `deleteWorkflow`. Se um dia for preciso apagar algo,
 * isso deve ser uma chamada manual e deliberada, não uma função que um
 * script de import possa acionar por engano.
 *
 * Toda chamada é registrada em `logs/n8n-acoes.log` (JSON Lines), sempre —
 * sucesso ou erro, dry-run ou real. A API key nunca é escrita no log.
 *
 * Confirmado contra a spec real da instância (n8n Public API v1.1.1,
 * extraída de /api/v1/docs/swagger-ui-init.js em 2026-08-19):
 *   - Header de auth: X-N8N-API-KEY (não é Bearer/Authorization)
 *   - POST/PUT de workflow exigem exatamente {name, nodes, connections,
 *     settings} — additionalProperties: false, então campos extras
 *     quebram a chamada
 *   - Criar workflow SEMPRE cai no espaço pessoal; mover pra dentro de um
 *     projeto é uma chamada separada, PUT /workflows/{id}/transfer
 *   - Não existe campo de pinData em nenhum dos dois corpos — a API
 *     pública não suporta fixar dados de teste
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BASE_URL = (process.env.N8N_BASE_URL || '').replace(/\/+$/, '');
const API_KEY = process.env.N8N_API_KEY || '';
const LOG_DIR = path.join(__dirname, '..', '..', 'logs'); // raiz da skill, não dentro de scripts/
const LOG_FILE = path.join(LOG_DIR, 'n8n-acoes.log');

if (!BASE_URL || !API_KEY) {
  throw new Error(
    'N8N_BASE_URL e N8N_API_KEY precisam estar no ambiente. ' +
    'Rode com: node --env-file=.env.local scripts/importar_workflow_n8n.js ...'
  );
}

function ensureLogDir() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function logAcao(entry) {
  ensureLogDir();
  const linha = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n';
  fs.appendFileSync(LOG_FILE, linha, 'utf8');
}

/**
 * Chamada crua à API. `dryRun: true` registra a intenção no log e
 * devolve `{ dryRun: true }` sem tocar na rede — usado pelas funções de
 * escrita abaixo quando o script roda sem `--apply`.
 */
async function call(method, apiPath, body, opts) {
  opts = opts || {};
  const url = `${BASE_URL}/api/v1${apiPath}`;

  if (opts.dryRun) {
    logAcao({
      metodo: method, path: apiPath, dryRun: true,
      corpo_resumo: resumoCorpo(body), descricao: opts.descricao || ''
    });
    return { dryRun: true };
  }

  const resp = await fetch(url, {
    method,
    headers: {
      'X-N8N-API-KEY': API_KEY,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  let data = null;
  try { data = await resp.json(); } catch (e) { /* resposta sem corpo, ok */ }

  logAcao({
    metodo: method, path: apiPath, status: resp.status, ok: resp.ok,
    corpo_resumo: resumoCorpo(body), descricao: opts.descricao || '',
    erro: resp.ok ? undefined : (data && (data.message || JSON.stringify(data)))
  });

  if (!resp.ok) {
    throw new Error(`${method} ${apiPath} → HTTP ${resp.status}: ${data ? JSON.stringify(data) : '(sem corpo)'}`);
  }
  return data;
}

/** Resumo seguro pro log — nunca o payload inteiro (pode ter 78 nós), nunca a API key. */
function resumoCorpo(body) {
  if (!body) return null;
  const resumo = {};
  if (body.name) resumo.name = body.name;
  if (body.nodes) resumo.total_nodes = body.nodes.length;
  if (body.destinationProjectId) resumo.destinationProjectId = body.destinationProjectId;
  return resumo;
}

async function listarProjetos() {
  const data = await call('GET', '/projects?limit=250');
  return data.data || [];
}

async function criarProjeto(nome, opts) {
  return call('POST', '/projects', { name: nome }, { descricao: `criar projeto "${nome}"`, ...opts });
}

async function listarWorkflows({ projectId, nome } = {}) {
  const qs = new URLSearchParams();
  qs.set('limit', '250');
  if (projectId) qs.set('projectId', projectId);
  if (nome) qs.set('name', nome);
  const data = await call('GET', `/workflows?${qs.toString()}`);
  return data.data || [];
}

async function criarWorkflow(corpo, opts) {
  return call('POST', '/workflows', corpo, { descricao: `criar workflow "${corpo.name}"`, ...opts });
}

async function obterWorkflow(id) {
  return call('GET', `/workflows/${id}`);
}

async function atualizarWorkflow(id, corpo, opts) {
  return call('PUT', `/workflows/${id}`, corpo, { descricao: `atualizar workflow ${id} ("${corpo.name}")`, ...opts });
}

async function transferirWorkflow(id, destinationProjectId, opts) {
  return call('PUT', `/workflows/${id}/transfer`, { destinationProjectId }, {
    descricao: `mover workflow ${id} para o projeto ${destinationProjectId}`, ...opts
  });
}

/**
 * Verdadeiro se o erro veio do bloqueio de licença do recurso Projects
 * (Community Edition não tem "pasta" — só tags). Confirmado ao vivo:
 * HTTP 403 com a mensagem citando `feat:projectRole:admin`.
 */
function eBloqueioDeLicencaProjects(err) {
  return /feat:projectRole|403/.test(err.message || '');
}

async function listarTags() {
  const data = await call('GET', '/tags?limit=250');
  return data.data || [];
}

async function criarTag(nome, opts) {
  return call('POST', '/tags', { name: nome }, { descricao: `criar tag "${nome}"`, ...opts });
}

/** Substitui a lista de tags do workflow. PUT, não PATCH — sobrescreve o array inteiro. */
async function definirTagsWorkflow(id, tagIds, opts) {
  return call('PUT', `/workflows/${id}/tags`, tagIds.map(tid => ({ id: tid })), {
    descricao: `aplicar tag(s) [${tagIds.join(', ')}] no workflow ${id}`, ...opts
  });
}

module.exports = {
  LOG_FILE,
  listarProjetos, criarProjeto,
  listarWorkflows, obterWorkflow, criarWorkflow, atualizarWorkflow, transferirWorkflow,
  eBloqueioDeLicencaProjects, listarTags, criarTag, definirTagsWorkflow
};
