#!/usr/bin/env node
/**
 * importar_workflow_n8n.js — n8n-agendamento-odontologico
 *
 * Importa um workflow já gerado (`gerar_workflow.js`) direto na instância
 * n8n, agrupado sob um nome de "pasta" lógica. Nunca apaga nada — essa
 * capacidade não existe neste script, por decisão deliberada.
 *
 *   node --env-file=.env.local scripts/importar_workflow_n8n.js \
 *     --workflow /caminho/agendamento_scopel.json \
 *     --pasta "Gabriel Contact IA" \
 *     [--apply] [--update]
 *
 * SEM --apply: modo dry-run (padrão). Mostra exatamente o que seria feito,
 * sem chamar a API de escrita nenhuma vez. Sempre rode assim primeiro.
 *
 * COM --apply: executa de verdade.
 *
 * --update: se já existir um workflow com o mesmo nome na pasta alvo,
 * permite sobrescrever (PUT). Sem essa flag, um nome já existente barra
 * a importação inteira, sem tocar em nada — proteção contra sobrescrever
 * um workflow editado à mão direto na UI do n8n.
 *
 * "Pasta" aqui é abstrato de propósito: o script detecta sozinho se a
 * instância tem o recurso Projects (Enterprise) ou não, e usa o
 * equivalente certo:
 *   - Com Projects: cria/usa um projeto de verdade e transfere o
 *     workflow pra dentro dele.
 *   - Sem Projects (Community Edition — confirmado ao vivo que é o caso
 *     da instância n8n.dentistapower.com.br em 2026-08-19, erro 403
 *     "feat:projectRole:admin"): cria/usa uma TAG com esse nome e aplica
 *     no workflow. É o equivalente mais próximo de "pasta" que existe
 *     sem licença paga.
 *
 * Toda chamada — dry-run ou real — fica registrada em
 * `logs/n8n-acoes.log` (JSON Lines, um evento por linha, com timestamp).
 * Esse arquivo é a auditoria: para saber o que este script já fez contra
 * a instância, leia esse log — nunca precisa confiar de memória.
 */

'use strict';

const fs = require('fs');
const {
  listarProjetos, criarProjeto,
  listarWorkflows, obterWorkflow, criarWorkflow, atualizarWorkflow, transferirWorkflow,
  eBloqueioDeLicencaProjects, listarTags, criarTag, definirTagsWorkflow,
  LOG_FILE
} = require('./lib/n8n_client');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    if (key === 'apply' || key === 'update') { out[key] = true; continue; }
    out[key] = argv[i + 1];
    i++;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const NOME_PASTA = args.pasta || args.projeto; // aceita --projeto como sinônimo, por compatibilidade
if (!args.workflow || !NOME_PASTA) {
  console.error('uso: node --env-file=.env.local importar_workflow_n8n.js --workflow <arquivo.json> --pasta "<nome>" [--nome "<nome alternativo>"] [--apply] [--update]');
  process.exit(1);
}

const APPLY = !!args.apply;
const ALLOW_UPDATE = !!args.update;

function extrairCorpoWorkflow(bruto) {
  // A API exige exatamente {name, nodes, connections, settings} —
  // additionalProperties: false. Extrair só isso, mesmo que o arquivo
  // gerado tenha outros campos no futuro.
  const { name, nodes, connections, settings } = bruto;
  if (!name || !nodes || !connections) {
    throw new Error('Arquivo de workflow inválido: faltam name/nodes/connections.');
  }
  // --nome sobrepõe só nesta importação — o arquivo gerado e a config
  // continuam com o nome de produção. Útil pra criar uma cópia paralela
  // sem colidir com um workflow existente do mesmo nome (ex: um arquivado
  // de teste que ainda não foi limpo na UI).
  return { name: args.nome || name, nodes, connections, settings: settings || { executionOrder: 'v1' } };
}

/** Detecta o modo da instância tentando listar projetos uma vez. */
async function detectarModo() {
  try {
    const projetos = await listarProjetos();
    return { modo: 'projects', projetos };
  } catch (err) {
    if (eBloqueioDeLicencaProjects(err)) {
      console.log('ℹ️  Instância sem o recurso Projects (Community Edition) — usando tags como pasta.');
      return { modo: 'tags' };
    }
    throw err;
  }
}

async function resolverPastaProjects(projetos) {
  let projeto = projetos.find(p => p.name.toLowerCase() === NOME_PASTA.toLowerCase());
  if (projeto) {
    console.log(`✓ Projeto já existe: "${projeto.name}" (${projeto.id})`);
    return projeto;
  }
  if (APPLY) {
    projeto = await criarProjeto(NOME_PASTA);
    console.log(`✓ Projeto criado: "${projeto.name}" (${projeto.id})`);
    return projeto;
  }
  console.log(`○ [dry-run] Criaria o projeto "${NOME_PASTA}"`);
  await criarProjeto(NOME_PASTA, { dryRun: true });
  return null;
}

async function resolverPastaTags() {
  const tags = await listarTags();
  let tag = tags.find(t => t.name.toLowerCase() === NOME_PASTA.toLowerCase());
  if (tag) {
    console.log(`✓ Tag já existe: "${tag.name}" (${tag.id})`);
    return tag;
  }
  if (APPLY) {
    tag = await criarTag(NOME_PASTA);
    console.log(`✓ Tag criada: "${tag.name}" (${tag.id})`);
    return tag;
  }
  console.log(`○ [dry-run] Criaria a tag "${NOME_PASTA}"`);
  await criarTag(NOME_PASTA, { dryRun: true });
  return null;
}

async function main() {
  const bruto = JSON.parse(fs.readFileSync(args.workflow, 'utf8'));
  const corpo = extrairCorpoWorkflow(bruto);

  console.log(`Modo: ${APPLY ? 'APPLY (real)' : 'DRY-RUN (nada será escrito)'}`);
  console.log(`Workflow: "${corpo.name}" (${corpo.nodes.length} nós)`);
  console.log(`Pasta alvo: "${NOME_PASTA}"`);
  console.log(`Log de auditoria: ${LOG_FILE}`);
  console.log();

  const { modo, projetos } = await detectarModo();
  const pasta = modo === 'projects'
    ? await resolverPastaProjects(projetos)
    : await resolverPastaTags();

  // Checar se o workflow já existe por nome (busca global — em modo tags
  // não há como filtrar por pasta antes de ele existir).
  const existentes = (await listarWorkflows({ nome: corpo.name }))
    .filter(w => w.name === corpo.name); // o filtro da API pode não ser exato
  const jaExiste = existentes[0];

  if (jaExiste && !ALLOW_UPDATE) {
    console.log();
    console.log(`⚠️  Já existe um workflow "${corpo.name}" (id ${jaExiste.id}).`);
    console.log('   Nada foi alterado. Rode de novo com --update se a intenção é sobrescrever,');
    console.log('   ou renomeie clinica.nome_workflow na config e regere se são coisas diferentes.');
    return;
  }

  let workflowId;
  if (jaExiste && ALLOW_UPDATE) {
    if (APPLY) {
      const atualizado = await atualizarWorkflow(jaExiste.id, corpo);
      console.log(`✓ Workflow atualizado: "${atualizado.name}" (${atualizado.id})`);
      workflowId = atualizado.id;
    } else {
      console.log(`○ [dry-run] Atualizaria o workflow existente (id ${jaExiste.id}) com o novo conteúdo`);
      await atualizarWorkflow(jaExiste.id, corpo, { dryRun: true });
      workflowId = jaExiste.id;
    }
  } else {
    if (APPLY) {
      const criado = await criarWorkflow(corpo);
      console.log(`✓ Workflow criado: "${criado.name}" (${criado.id})`);
      workflowId = criado.id;
    } else {
      console.log(`○ [dry-run] Criaria o workflow "${corpo.name}"`);
      await criarWorkflow(corpo, { dryRun: true });
      workflowId = '(id novo)';
    }
  }

  // Aplicar a pasta (projeto ou tag) no workflow.
  if (modo === 'projects') {
    const destino = pasta ? pasta.id : '(id só existirá após --apply)';
    if (APPLY) {
      await transferirWorkflow(workflowId, destino);
      console.log(`✓ Movido para o projeto "${NOME_PASTA}"`);
    } else {
      console.log(`○ [dry-run] Moveria o workflow para o projeto "${NOME_PASTA}"`);
      await transferirWorkflow(workflowId, destino, { dryRun: true });
    }
  } else {
    const tagId = pasta ? pasta.id : '(id só existirá após --apply)';
    // PUT /workflows/{id}/tags SUBSTITUI a lista inteira — nunca chamar
    // com só a tag nova, ou tags que já existiam no workflow (ex: um
    // "Creator - Fulano" que a equipe já usa) somem sem aviso.
    if (APPLY) {
      let tagIdsExistentes = [];
      if (jaExiste) {
        const atual = await obterWorkflow(workflowId);
        tagIdsExistentes = (atual.tags || []).map(t => t.id);
      }
      const tagIdsFinal = Array.from(new Set([...tagIdsExistentes, tagId]));
      await definirTagsWorkflow(workflowId, tagIdsFinal);
      console.log(`✓ Tag "${NOME_PASTA}" aplicada no workflow (mantendo ${tagIdsExistentes.length} tag(s) que já existiam)`);
    } else {
      console.log(`○ [dry-run] Aplicaria a tag "${NOME_PASTA}" no workflow, mantendo as tags que já existirem`);
      await definirTagsWorkflow(workflowId, [tagId], { dryRun: true });
    }
  }

  if (APPLY && !jaExiste) {
    console.log();
    console.log('⚠️  O workflow foi importado DESATIVADO, de propósito.');
    console.log('   Testar as 5 ações (VALIDACAO.md) antes de ativar manualmente na UI.');
  }
}

main().catch(err => {
  console.error('❌ ' + err.message);
  console.error(`   Auditoria completa em: ${LOG_FILE}`);
  process.exit(1);
});
