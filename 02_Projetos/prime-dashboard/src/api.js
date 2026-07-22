import { TOKEN, PANEL_ID } from './config'

const BASE = '/api'

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: TOKEN } })
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${path}`)
  return res.json()
}

export async function countStep(stepId) {
  const qs = new URLSearchParams({ PanelId: PANEL_ID, StepId: stepId, PageSize: 1, PageNumber: 1 })
  const json = await get(`/crm/v1/panel/card?${qs}`)
  return json.totalItems ?? json.totalCount ?? (json.items ?? []).length
}

export async function fetchAllCards(stepId) {
  const all = []
  let page = 1
  while (true) {
    const qs = new URLSearchParams({ PanelId: PANEL_ID, StepId: stepId, PageSize: 100, PageNumber: page })
    const json = await get(`/crm/v1/panel/card?${qs}`)
    const items = json.items ?? []
    all.push(...items)
    if (!json.hasMorePages || items.length === 0) break
    page++
  }
  return all
}

export async function loadAllData(STEPS) {
  const [cMeta, cOrg, cIA, cCRCA, cCRCB, cIaNao, cCrcNao, cFaltou, cComp, cFechou] =
    await Promise.all([
      countStep(STEPS.naoMeta),
      countStep(STEPS.naoOrganico),
      countStep(STEPS.agIA),
      countStep(STEPS.agCRCA),
      countStep(STEPS.agCRCB),
      countStep(STEPS.iaNao),
      countStep(STEPS.crcNao),
      countStep(STEPS.faltou),
      countStep(STEPS.compareceu),
      countStep(STEPS.fechou),
    ])

  const [fechouCards, cardsIA, cardsCRCA, cardsCRCB] = await Promise.all([
    fetchAllCards(STEPS.fechou),
    fetchAllCards(STEPS.agIA),
    fetchAllCards(STEPS.agCRCA),
    fetchAllCards(STEPS.agCRCB),
  ])

  const receita = fechouCards.reduce((s, c) => s + (c.monetaryAmount ?? 0), 0)

  return {
    counts: { cMeta, cOrg, cIA, cCRCA, cCRCB, cIaNao, cCrcNao, cFaltou, cComp, cFechou },
    receita,
    lineCards: { cardsIA, cardsCRCA, cardsCRCB },
  }
}
