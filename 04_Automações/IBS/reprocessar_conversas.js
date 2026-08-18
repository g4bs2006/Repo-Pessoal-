/**
 * Reprocessa conversas retroativas do IBS pela mesma lógica do automacao.json:
 *  - Lista sessões (conversas) desde DATA_INICIO
 *  - Para cada contato, verifica se já existe card no painel
 *      - Se existe card: atualiza APENAS o customField "campanha" com a headline (não toca title/description)
 *      - Se NÃO existe card: apenas loga (não cria card retroativamente)
 *  - Se a headline for exatamente "Implantes Dentários em Goiânia": aplica a tag especial no contato
 *
 * Uso:
 *   node reprocessar_conversas.js            -> dry-run (não grava nada, só mostra o que faria)
 *   node reprocessar_conversas.js --apply    -> aplica as mudanças de fato
 *
 * Configure as constantes abaixo antes de rodar.
 */

// ===================== CONFIGURAÇÃO (preencher) =====================
const HELENA_TOKEN = process.env.HELENA_TOKEN || 'pn_zs1yjD8UsDMgNlWvLaOdFI0ecE88D4kG9zIAFfMtVc';
const COMPANY_ID = process.env.COMPANY_ID || '58e1700e-84e1-4d41-aaa9-2918925a3cef'; // IBS Odontologia (visto no pinData)
const PANEL_ID = process.env.PANEL_ID || '7869b161-d67b-46e7-8d3b-7455163978e9';
const DATA_INICIO = process.env.DATA_INICIO || '2026-07-27T00:00:00Z'; // CreatedAt.After (UTC)
const TAG_ESPECIAL_ID = 'df07b4fb-7d49-454d-99a7-e932f9441ac2';
const HEADLINE_ESPECIAL = 'Implantes Dentários em Goiânia';
const PAGE_SIZE = 100;
// =======================================================================

const APPLY = process.argv.includes('--apply');
const BASE = 'https://api.wts.chat';

function authHeaders() {
  return {
    Authorization: `Bearer ${HELENA_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

async function req(method, url, body) {
  const resp = await fetch(url, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await resp.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  if (!resp.ok) {
    throw new Error(`${method} ${url} -> ${resp.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function listarConversas() {
  const sessoes = [];
  let page = 1;
  while (true) {
    const url = `${BASE}/chat/v2/session?CreatedAt.After=${encodeURIComponent(DATA_INICIO)}&PageNumber=${page}&PageSize=${PAGE_SIZE}&OrderBy=CreatedAt&OrderDirection=ASCENDING`;
    const resp = await req('GET', url);
    const items = Array.isArray(resp) ? resp : (resp.items ?? resp.data ?? []);
    if (!items.length) break;
    sessoes.push(...items);
    if (items.length < PAGE_SIZE) break;
    page++;
  }
  return sessoes;
}

async function buscarCard(contactId) {
  const url = `${BASE}/crm/v1/panel/card?PanelId=${PANEL_ID}&ContactId=${contactId}&IncludeArchived=false&OrderBy=CreatedAt&OrderDirection=DESCENDING&PageSize=5`;
  const resp = await req('GET', url);
  const arr = Array.isArray(resp) ? resp : (resp.items ?? resp.data ?? resp.cards ?? []);
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[0];
}

async function atualizarCampanha(cardId, headline) {
  const url = `${BASE}/crm/v2/panel/card/${cardId}`;
  const body = { fields: ['customFields'], customFields: { campanha: headline } };
  if (!APPLY) {
    console.log(`   [DRY-RUN] PUT ${url} body=${JSON.stringify(body)}`);
    return;
  }
  await req('PUT', url, body);
}

async function aplicarTagEspecial(contactId) {
  const url = `${BASE}/core/v1/contact/${contactId}/tags`;
  const body = { tagIds: [TAG_ESPECIAL_ID], operation: 'InsertIfNotExists' };
  if (!APPLY) {
    console.log(`   [DRY-RUN] POST ${url} body=${JSON.stringify(body)}`);
    return;
  }
  await req('POST', url, body);
}

function extrairDados(sessao) {
  const c = sessao.content ?? sessao;
  const contactId = c.contactId ?? c.contactDetails?.id ?? null;
  const contactName = c.contactDetails?.name ?? 'Sem nome';
  const utm = c.utm ?? null;
  const headline = utm?.headline ? String(utm.headline).trim() : null;
  const companyId = c.companyId ?? null;
  const createdAt = c.createdAt ?? sessao.date ?? null;
  return { contactId, contactName, headline, companyId, createdAt };
}

async function main() {
  console.log(`Modo: ${APPLY ? 'APLICAR MUDANÇAS' : 'DRY-RUN (nada será gravado)'}`);
  console.log(`Buscando conversas desde ${DATA_INICIO}...`);

  const sessoes = await listarConversas();
  console.log(`Total de conversas encontradas: ${sessoes.length}`);

  // Agrupa por contato, mantendo a sessão mais recente de cada um
  const porContato = new Map();
  for (const sessao of sessoes) {
    const dados = extrairDados(sessao);
    if (!dados.contactId) continue;
    if (dados.companyId && dados.companyId !== COMPANY_ID) continue;
    const atual = porContato.get(dados.contactId);
    if (!atual || (dados.createdAt && dados.createdAt > atual.createdAt)) {
      porContato.set(dados.contactId, dados);
    }
  }
  console.log(`Contatos únicos a processar: ${porContato.size}\n`);

  const resumo = { semHeadline: 0, semCard: 0, campanhaAtualizada: 0, tagAplicada: 0, erros: 0 };

  for (const [contactId, dados] of porContato) {
    console.log(`Contato ${contactId} (${dados.contactName}) - headline: ${dados.headline ?? '(nenhuma)'}`);
    try {
      if (dados.headline) {
        const card = await buscarCard(contactId);
        if (card) {
          await atualizarCampanha(card.id, dados.headline);
          resumo.campanhaAtualizada++;
          console.log(`   -> card ${card.id} atualizado com campanha="${dados.headline}"`);
        } else {
          resumo.semCard++;
          console.log('   -> sem card no painel, pulando atualização de campanha');
        }
      } else {
        resumo.semHeadline++;
        console.log('   -> sem headline, nada a atualizar');
      }

      if (dados.headline === HEADLINE_ESPECIAL) {
        await aplicarTagEspecial(contactId);
        resumo.tagAplicada++;
        console.log('   -> tag especial aplicada');
      }
    } catch (e) {
      resumo.erros++;
      console.error(`   -> ERRO: ${e.message}`);
    }
  }

  console.log('\n===== Resumo =====');
  console.log(resumo);
}

main().catch((e) => {
  console.error('Falha geral:', e);
  process.exit(1);
});
