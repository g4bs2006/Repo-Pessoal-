#!/usr/bin/env node
/**
 * validar_workflow.js — n8n-agendamento-odontologico
 *
 *   node validar_workflow.js <workflow.json>
 *
 * Checa o que quebra silenciosamente em produção, não o que o n8n já valida.
 * Sai com código 1 se houver ERRO. AVISO não derruba a saída.
 */

'use strict';

const fs = require('fs');

const file = process.argv[2];
if (!file) { console.error('uso: node validar_workflow.js <workflow.json>'); process.exit(1); }

// tolera BOM UTF-8, que é o defeito do JSON da OB Clinic
const raw = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
let wf;
try { wf = JSON.parse(raw); }
catch (e) { console.error('❌ JSON inválido: ' + e.message); process.exit(1); }

const erros = [], avisos = [];
const nomes = new Set(wf.nodes.map(n => n.name));
const src = JSON.stringify(wf);

// 1 — ids duplicados
const vistos = new Set(), dup = [];
wf.nodes.forEach(n => { if (vistos.has(n.id)) dup.push(n.name); vistos.add(n.id); });
if (dup.length) erros.push('ids duplicados: ' + dup.join(', '));

// 2 — conexões apontando para nó inexistente
for (const [de, val] of Object.entries(wf.connections || {})) {
  if (!nomes.has(de)) erros.push(`conexão saindo de nó inexistente: ${de}`);
  for (const br of (val.main || [])) for (const t of (br || [])) {
    if (!nomes.has(t.node)) erros.push(`conexão ${de} -> ${t.node}: destino não existe`);
  }
}

// 3 — nó órfão (sem entrada e sem ser trigger)
const temEntrada = new Set();
for (const val of Object.values(wf.connections || {}))
  for (const br of (val.main || [])) for (const t of (br || [])) temEntrada.add(t.node);
wf.nodes.forEach(n => {
  if (!temEntrada.has(n.name) && !/webhook|Trigger/i.test(n.type))
    avisos.push(`nó sem entrada: ${n.name}`);
});

// 4 — id_atendimento: o erro mais caro da v4
if (!/id_atendimento/.test(src))
  erros.push('id_atendimento não aparece no workflow: o CRM roda e não faz nada, sem erro visível');

// 5 — as TRÊS etiquetas de contato precisam existir na v4
[['agendado_contact_tag_id', 'Agendar'],
 ['remarcado_contact_tag_id', 'Remarcar'],
 ['cancelado_contact_tag_id', 'Cancelar']].forEach(([campo, cadeia]) => {
  if (!src.includes(campo))
    erros.push(`${campo} ausente: a cadeia ${cadeia} não etiqueta o contato. ` +
               'Na v4 o agente não aplica mais tag, então essa etiqueta deixa de existir');
});

// 6 — fan-out do CRM nos três nós de confirmação Clinicorp
[['Agendar Na Clinicorp', 'CRM Config (Agendar)'],
 ['Reagendar Clinicorp', 'CRM Config (Remarcar)'],
 ['Cancelar Na Clinicorp', 'CRM Config (Cancelar)']].forEach(([de, para]) => {
  const alvos = ((wf.connections || {})[de]?.main || []).flat().map(t => t.node);
  if (!nomes.has(de)) { avisos.push(`nó ${de} não existe, fan-out não verificado`); return; }
  if (!alvos.includes(para)) erros.push(`fan-out faltando: ${de} não dispara ${para}`);
});

// 7 — cada branch do Switch precisa de pelo menos um respondToWebhook alcançável
const respostas = wf.nodes.filter(n => n.type === 'n8n-nodes-base.respondToWebhook').map(n => n.name);
const switchNode = wf.nodes.find(n => n.type === 'n8n-nodes-base.switch');
if (switchNode) {
  const saidas = (switchNode.parameters?.rules?.values || []).map(v => v.outputKey);
  const brs = (wf.connections[switchNode.name]?.main || []);
  brs.forEach((br, i) => {
    const vistos2 = new Set();
    const fila = (br || []).map(t => t.node);
    let achou = false;
    while (fila.length) {
      const cur = fila.shift();
      if (vistos2.has(cur)) continue;
      vistos2.add(cur);
      if (respostas.includes(cur)) { achou = true; break; }
      ((wf.connections[cur]?.main) || []).flat().forEach(t => fila.push(t.node));
    }
    if (!achou) erros.push(`branch "${saidas[i] || i}" não alcança nenhum respondToWebhook: a habilidade fica pendurada`);
  });
}

// 8 — Cancelar não deve criar card
if (nomes.has('Criar Card (Cancelar)'))
  erros.push('Criar Card (Cancelar) existe: quem cancelou não deve ganhar card novo no painel');

// 9 — credencial pendente
if (/COLE_|<[A-Z_]{3,}>|PREENCHER/.test(src))
  avisos.push('há placeholders não preenchidos no arquivo (COLE_, <MAIUSCULAS>, PREENCHER)');

// 10 — as 5 ações do agente
['verificar_disponibilidade', 'realizar_agendamento', 'remarcar_agendamento',
 'cancelar_agendamento', 'verificar_agendamento_paciente'].forEach(a => {
  if (!src.includes(a)) erros.push(`ação ${a} não roteada no Switch`);
});

// 11 — nome_profissional_sugerido, que o E8 do agente usa
if (!/nome_profissional_sugerido/.test(src))
  avisos.push('nome_profissional_sugerido não é devolvido: o agente não terá o nome do dentista no E8');

// ─────────────────────────────────────────────────────────── relatório

console.log(`\n${file}`);
console.log(`  nós: ${wf.nodes.length} | conexões: ${Object.keys(wf.connections || {}).length}`);
console.log(`  executionOrder: ${wf.settings?.executionOrder || '(não definido)'}`);

if (erros.length) {
  console.log('\n❌ ERROS (' + erros.length + ')');
  erros.forEach(e => console.log('   - ' + e));
}
if (avisos.length) {
  console.log('\n⚠️  AVISOS (' + avisos.length + ')');
  avisos.forEach(a => console.log('   - ' + a));
}
if (!erros.length && !avisos.length) console.log('\n✅ limpo');
else if (!erros.length) console.log('\n✅ sem erros');

process.exit(erros.length ? 1 : 0);
