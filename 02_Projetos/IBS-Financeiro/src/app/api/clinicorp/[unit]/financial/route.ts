import { NextRequest, NextResponse } from 'next/server'
import { clinicorpGet } from '@/lib/clinicorp'
import { UNIT_CREDENTIALS, UNIT_LIST } from '@/lib/units'
import type { UnitKey } from '@/lib/units'

// ── Types ──────────────────────────────────────────────────────────

interface LedgerEntry {
  Amount: number
  PostType: 'RECEIVED' | 'EXPENSES' | 'REVENUE' | string
  Date: string
  Category?: string
  [key: string]: unknown
}

interface SummaryResponse {
  From: string
  To: string
  values: LedgerEntry[]
}

interface PaymentEntry {
  PatientId: number
  Amount: number
  PaymentForm?: string
  PaymentConfirmed?: string
  Canceled?: string
  Date: string
  ReceivedDate?: string
  ConfirmedDate?: string
  PatientName?: string
  PayerName?: string
  [key: string]: unknown
}

// ── Helpers ────────────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function isoDay(s: string | undefined): string {
  return s ? s.slice(0, 10) : ''
}

function isoMonth(s: string | undefined): string {
  return s ? s.slice(0, 7) : ''
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${names[parseInt(m) - 1]}/${y.slice(2)}`
}

function shortCategory(raw: string | undefined): string {
  if (!raw) return 'Outros'
  const first = raw.split('|')[0].trim()
  return first.length > 40 ? first.slice(0, 38) + '…' : first
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

// Returns { firstDay, lastDay } for a given year/month (1-indexed)
function monthRange(year: number, month: number) {
  const firstDay = `${year}-${pad(month)}-01`
  const lastDay = `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`
  return { firstDay, lastDay }
}

// Last 3 months ending at today (not end-of-month, to match the KPI period)
function last3MonthsRange() {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  const months: Array<{ year: number; month: number }> = []
  for (let i = 2; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }
  const chartFrom = monthRange(months[0].year, months[0].month).firstDay
  return { chartFrom, chartTo: todayStr, months }
}

// ── Route ──────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ unit: string }> }
) {
  const { unit } = await params
  const isValid = UNIT_LIST.some((u) => u.key === unit)
  if (!isValid) {
    return NextResponse.json({ error: 'Unidade não encontrada' }, { status: 404 })
  }

  const creds = UNIT_CREDENTIALS[unit as UnitKey]
  const { searchParams } = req.nextUrl
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''

  if (!from || !to) {
    return NextResponse.json({ error: 'Parâmetros from e to são obrigatórios' }, { status: 400 })
  }

  const { chartFrom, chartTo, months } = last3MonthsRange()

  // Fetch period data + 3-month range in parallel (4 calls total)
  const [periodSummary, periodPayments, chartSummary, chartPayments] = await Promise.all([
    clinicorpGet<SummaryResponse>('/financial/list_summary', { subscriber_id: creds.subscriberId, from, to }, creds.username, creds.token)
      .catch(() => ({ From: from, To: to, values: [] as LedgerEntry[] })),
    clinicorpGet<PaymentEntry[]>('/payment/list', { subscriber_id: creds.subscriberId, from, to }, creds.username, creds.token)
      .catch(() => [] as PaymentEntry[]),
    clinicorpGet<SummaryResponse>('/financial/list_summary', { subscriber_id: creds.subscriberId, from: chartFrom, to: chartTo }, creds.username, creds.token)
      .catch(() => ({ From: chartFrom, To: chartTo, values: [] as LedgerEntry[] })),
    clinicorpGet<PaymentEntry[]>('/payment/list', { subscriber_id: creds.subscriberId, from: chartFrom, to: chartTo }, creds.username, creds.token)
      .catch(() => [] as PaymentEntry[]),
  ])

  // ── Period KPIs (from payment/list) ────────────────────────────
  // Require ReceivedDate or ConfirmedDate to exclude scheduled-but-not-yet-received payments
  const confirmedPayments = (periodPayments ?? []).filter(
    (p) => p.PaymentConfirmed === 'X' && !p.Canceled && (p.ReceivedDate || p.ConfirmedDate)
  )
  const totalRecebido = confirmedPayments.reduce((s, p) => s + (p.Amount ?? 0), 0)
  const uniquePatients = new Set(confirmedPayments.map((p) => p.PatientId)).size
  const ticketMedio = uniquePatients > 0 ? totalRecebido / uniquePatients : 0

  // Formas de pagamento (period)
  const formsMap = new Map<string, number>()
  for (const p of confirmedPayments) {
    const form = p.PaymentForm || 'Outros'
    formsMap.set(form, (formsMap.get(form) ?? 0) + (p.Amount ?? 0))
  }
  const paymentForms = Array.from(formsMap.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value: round2(value) }))

  // Expenses (period summary)
  const periodExpenses = (periodSummary.values ?? []).filter((e) => e.PostType === 'EXPENSES')
  const totalDespesas = periodExpenses.reduce((s, e) => s + (e.Amount ?? 0), 0)

  // Expenses by category
  const catMap = new Map<string, number>()
  for (const e of periodExpenses) {
    const cat = shortCategory(e.Category)
    catMap.set(cat, (catMap.get(cat) ?? 0) + (e.Amount ?? 0))
  }
  const sortedCats = Array.from(catMap.entries()).sort(([, a], [, b]) => b - a)
  const categoryBreakdown = [
    ...sortedCats.slice(0, 5).map(([name, value]) => ({ name, value: round2(value) })),
    ...(sortedCats.slice(5).reduce((s, [, v]) => s + v, 0) > 0
      ? [{ name: 'Outros', value: round2(sortedCats.slice(5).reduce((s, [, v]) => s + v, 0)) }]
      : []),
  ]

  // Recent payments table
  const recentPayments = [...confirmedPayments]
    .sort((a, b) => new Date(b.ReceivedDate || b.Date).getTime() - new Date(a.ReceivedDate || a.Date).getTime())
    .slice(0, 10)
    .map((p) => ({
      patient: p.PatientName || p.PayerName || '—',
      amount: round2(p.Amount ?? 0),
      form: p.PaymentForm || '—',
      date: isoDay(p.ReceivedDate || p.ConfirmedDate || p.Date),
    }))

  // ── Monthly comparison (last 3 months) ─────────────────────────
  const monthlyReceived = new Map<string, number>()
  for (const p of (chartPayments ?? []).filter((p) => p.PaymentConfirmed === 'X' && !p.Canceled && (p.ReceivedDate || p.ConfirmedDate))) {
    const ym = isoMonth(p.ReceivedDate || p.ConfirmedDate || p.Date)
    if (ym) monthlyReceived.set(ym, (monthlyReceived.get(ym) ?? 0) + (p.Amount ?? 0))
  }

  // Expenses per month from list_summary
  const monthlyExpenses = new Map<string, number>()
  for (const e of (chartSummary.values ?? []).filter((e) => e.PostType === 'EXPENSES')) {
    const ym = isoMonth(e.Date)
    if (ym) monthlyExpenses.set(ym, (monthlyExpenses.get(ym) ?? 0) + (e.Amount ?? 0))
  }

  const monthlyComparison = months.map(({ year, month }) => {
    const ym = `${year}-${pad(month)}`
    const entrada = round2(monthlyReceived.get(ym) ?? 0)
    const saida = round2(monthlyExpenses.get(ym) ?? 0)
    return {
      month: monthLabel(ym),
      entrada,
      saida,
      resultado: round2(entrada - saida),
    }
  })

  return NextResponse.json({
    from: periodSummary.From || from,
    to: periodSummary.To || to,
    recebido: round2(totalRecebido),
    despesas: round2(totalDespesas),
    resultado: round2(totalRecebido - totalDespesas),
    ticketMedio: round2(ticketMedio),
    uniquePatients,
    countPayments: confirmedPayments.length,
    paymentForms,
    categoryBreakdown,
    recentPayments,
    monthlyComparison,
  })
}
