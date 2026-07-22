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
  const [cAgendado, cFechouComp, cNaoFechouComp, cFaltou, cCancelado, cReagendado] =
    await Promise.all([
      countStep(STEPS.agendado),
      countStep(STEPS.fechouComp),
      countStep(STEPS.naoFechouComp),
      countStep(STEPS.faltou),
      countStep(STEPS.cancelado),
      countStep(STEPS.reagendado),
    ])

  const [fechouCards, agendadoCards, naoFechouCards] = await Promise.all([
    fetchAllCards(STEPS.fechouComp),
    fetchAllCards(STEPS.agendado),
    fetchAllCards(STEPS.naoFechouComp),
  ])

  const receita = fechouCards.reduce((s, c) => s + (c.monetaryAmount ?? 0), 0)

  return {
    counts: { cAgendado, cFechouComp, cNaoFechouComp, cFaltou, cCancelado, cReagendado },
    receita,
    lineCards: { agendadoCards, fechouCards, naoFechouCards },
  }
}
