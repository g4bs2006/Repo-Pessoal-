import { NextRequest, NextResponse } from 'next/server'
import { clinicorpGet } from '@/lib/clinicorp'
import { UNIT_CREDENTIALS, UNIT_LIST } from '@/lib/units'
import type { UnitKey } from '@/lib/units'

interface PaymentEntry {
  PatientId: number
  PatientName?: string
  PayerName?: string
  Amount: number
  PaymentForm?: string
  PaymentConfirmed?: string
  Canceled?: string
  Date: string
  ReceivedDate?: string
  ConfirmedDate?: string
  [key: string]: unknown
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function isoDay(s: string | undefined): string {
  return s ? s.slice(0, 10) : ''
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ unit: string }> }
) {
  const { unit } = await params
  const isValid = UNIT_LIST.some((u) => u.key === unit)
  if (!isValid) return NextResponse.json({ error: 'Unidade não encontrada' }, { status: 404 })

  const creds = UNIT_CREDENTIALS[unit as UnitKey]
  const { searchParams } = req.nextUrl
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  if (!from || !to) return NextResponse.json({ error: 'Parâmetros from e to são obrigatórios' }, { status: 400 })

  const payments = await clinicorpGet<PaymentEntry[]>(
    '/payment/list',
    { subscriber_id: creds.subscriberId, from, to },
    creds.username,
    creds.token
  ).catch(() => [] as PaymentEntry[])

  // Aggregate by patient
  const map = new Map<number, {
    patientId: number
    name: string
    totalPaid: number
    countPayments: number
    lastPaymentDate: string
    forms: Map<string, number>
    pending: number
  }>()

  for (const p of payments ?? []) {
    if (!p.PatientId) continue

    const isConfirmed = p.PaymentConfirmed === 'X' && !p.Canceled && (p.ReceivedDate || p.ConfirmedDate)
    const isPending = p.PaymentConfirmed !== 'X' && !p.Canceled

    if (!map.has(p.PatientId)) {
      map.set(p.PatientId, {
        patientId: p.PatientId,
        name: (p.PatientName || p.PayerName || '—').replace(/\s*\(\d+\)\s*$/, '').trim(),
        totalPaid: 0,
        countPayments: 0,
        lastPaymentDate: '',
        forms: new Map(),
        pending: 0,
      })
    }

    const entry = map.get(p.PatientId)!

    if (isConfirmed) {
      entry.totalPaid += p.Amount ?? 0
      entry.countPayments += 1
      const payDate = isoDay(p.ReceivedDate || p.ConfirmedDate || p.Date)
      if (!entry.lastPaymentDate || payDate > entry.lastPaymentDate) {
        entry.lastPaymentDate = payDate
      }
      const form = p.PaymentForm || 'Outros'
      entry.forms.set(form, (entry.forms.get(form) ?? 0) + 1)
    }

    if (isPending) {
      entry.pending += p.Amount ?? 0
    }
  }

  const patients = Array.from(map.values())
    .filter((p) => p.totalPaid > 0 || p.pending > 0)
    .sort((a, b) => b.totalPaid - a.totalPaid)
    .map((p) => ({
      patientId: p.patientId,
      name: p.name,
      totalPaid: round2(p.totalPaid),
      countPayments: p.countPayments,
      lastPaymentDate: p.lastPaymentDate,
      mainForm: p.forms.size > 0
        ? Array.from(p.forms.entries()).sort(([, a], [, b]) => b - a)[0][0]
        : '—',
      pending: round2(p.pending),
    }))

  return NextResponse.json({ patients, from, to })
}
