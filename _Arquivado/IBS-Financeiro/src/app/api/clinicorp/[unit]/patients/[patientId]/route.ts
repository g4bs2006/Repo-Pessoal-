import { NextRequest, NextResponse } from 'next/server'
import { clinicorpGet } from '@/lib/clinicorp'
import { UNIT_CREDENTIALS, UNIT_LIST } from '@/lib/units'
import type { UnitKey } from '@/lib/units'

interface PatientInfo {
  PatientId: number
  Name: string
  Email?: string
  Phone?: string
  OtherDocumentId?: string
  Status?: string
  BirthDate?: string
}

interface AppointmentEntry {
  AppointmentId?: number
  Date?: string
  FromTime?: string
  ToTime?: string
  Status?: string
  ProfessionalName?: string
  Specialty?: string
  Procedure?: string
  Notes?: string
  [key: string]: unknown
}

interface EstimateEntry {
  EstimateId?: number
  Date?: string
  TotalValue?: number
  Status?: string
  Description?: string
  [key: string]: unknown
}

interface PaymentEntry {
  PatientId?: number
  Amount?: number
  PaymentForm?: string
  PaymentConfirmed?: string
  Canceled?: string
  Date?: string
  ReceivedDate?: string
  ConfirmedDate?: string
  [key: string]: unknown
}

function round2(n: number) { return Math.round(n * 100) / 100 }
function isoDay(s: string | undefined): string { return s ? s.slice(0, 10) : '' }

function pad(n: number) { return String(n).padStart(2, '0') }

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ unit: string; patientId: string }> }
) {
  const { unit, patientId } = await params
  const isValid = UNIT_LIST.some((u) => u.key === unit)
  if (!isValid) return NextResponse.json({ error: 'Unidade não encontrada' }, { status: 404 })

  const creds = UNIT_CREDENTIALS[unit as UnitKey]
  const pid = parseInt(patientId)
  if (isNaN(pid)) return NextResponse.json({ error: 'patientId inválido' }, { status: 400 })

  // Last 12 months for payment history
  const today = new Date()
  const historyFrom = `${today.getFullYear() - 1}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  const historyTo = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

  const [patientInfo, appointments, estimates, payments] = await Promise.all([
    clinicorpGet<PatientInfo>(
      '/patient/get',
      { subscriber_id: creds.subscriberId, patientId: String(pid) },
      creds.username, creds.token
    ).catch(() => null),

    clinicorpGet<AppointmentEntry[]>(
      '/patient/list_appointments',
      { subscriber_id: creds.subscriberId, patientId: String(pid) },
      creds.username, creds.token
    ).catch(() => [] as AppointmentEntry[]),

    clinicorpGet<EstimateEntry[]>(
      '/patient/list_estimates',
      { subscriber_id: creds.subscriberId, patientId: String(pid) },
      creds.username, creds.token
    ).catch(() => [] as EstimateEntry[]),

    clinicorpGet<PaymentEntry[]>(
      '/payment/list',
      { subscriber_id: creds.subscriberId, from: historyFrom, to: historyTo },
      creds.username, creds.token
    ).catch(() => [] as PaymentEntry[]),
  ])

  // Filter payments for this patient
  const patientPayments = (payments ?? [])
    .filter((p) => p.PatientId === pid && p.PaymentConfirmed === 'X' && !p.Canceled && (p.ReceivedDate || p.ConfirmedDate))
    .sort((a, b) => {
      const da = isoDay(a.ReceivedDate || a.ConfirmedDate || a.Date)
      const db = isoDay(b.ReceivedDate || b.ConfirmedDate || b.Date)
      return db.localeCompare(da)
    })
    .map((p) => ({
      amount: round2(p.Amount ?? 0),
      form: p.PaymentForm || '—',
      date: isoDay(p.ReceivedDate || p.ConfirmedDate || p.Date),
    }))

  const totalPaid12m = patientPayments.reduce((s, p) => s + p.amount, 0)

  // Sort appointments by date desc
  const sortedAppointments = (appointments ?? [])
    .sort((a, b) => (b.Date ?? '').localeCompare(a.Date ?? ''))
    .slice(0, 20)
    .map((a) => ({
      appointmentId: a.AppointmentId,
      date: isoDay(a.Date),
      fromTime: a.FromTime ?? '',
      toTime: a.ToTime ?? '',
      status: a.Status ?? '',
      professional: a.ProfessionalName ?? '',
      specialty: a.Specialty ?? '',
      procedure: a.Procedure ?? '',
    }))

  // Sort estimates by date desc
  const sortedEstimates = (estimates ?? [])
    .sort((a, b) => (b.Date ?? '').localeCompare(a.Date ?? ''))
    .slice(0, 10)
    .map((e) => ({
      estimateId: e.EstimateId,
      date: isoDay(e.Date),
      totalValue: round2(e.TotalValue ?? 0),
      status: e.Status ?? '',
      description: e.Description ?? '',
    }))

  return NextResponse.json({
    patient: patientInfo
      ? {
          patientId: patientInfo.PatientId,
          name: patientInfo.Name,
          email: patientInfo.Email ?? '',
          phone: patientInfo.Phone ?? '',
          cpf: patientInfo.OtherDocumentId ?? '',
          status: patientInfo.Status ?? '',
          birthDate: isoDay(patientInfo.BirthDate),
        }
      : null,
    payments: patientPayments,
    totalPaid12m: round2(totalPaid12m),
    appointments: sortedAppointments,
    estimates: sortedEstimates,
  })
}
