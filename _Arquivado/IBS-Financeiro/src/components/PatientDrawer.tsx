'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatCurrency } from '@/lib/formatters'
import type { UnitKey } from '@/lib/units'

interface Payment { amount: number; form: string; date: string }
interface Appointment {
  appointmentId?: number
  date: string
  fromTime: string
  toTime: string
  status: string
  professional: string
  specialty: string
  procedure: string
}
interface Estimate {
  estimateId?: number
  date: string
  totalValue: number
  status: string
  description: string
}
interface PatientDetail {
  patient: {
    patientId: number
    name: string
    email: string
    phone: string
    cpf: string
    status: string
    birthDate: string
  } | null
  payments: Payment[]
  totalPaid12m: number
  appointments: Appointment[]
  estimates: Estimate[]
}

interface Props {
  unit: UnitKey
  patientId: number | null
  patientName: string
  onClose: () => void
}

type Tab = 'pagamentos' | 'consultas' | 'orcamentos'

const FORM_STYLES: Record<string, string> = {
  'Cartão de Crédito': 'bg-violet-50 text-violet-700',
  'Cartão de Débito': 'bg-blue-50 text-blue-700',
  'Boleto': 'bg-amber-50 text-amber-700',
  'PIX': 'bg-emerald-50 text-emerald-700',
  'Dinheiro': 'bg-slate-100 text-slate-600',
  'Transferência': 'bg-cyan-50 text-cyan-700',
}

function formatBRDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function calcAge(birthDate: string): string {
  if (!birthDate) return ''
  const born = new Date(birthDate)
  const today = new Date()
  const age = today.getFullYear() - born.getFullYear()
  return `${age} anos`
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase()
  const cls =
    s === 'ACTIVE' || s === 'CONFIRMED' || s === 'APROVADO' ? 'bg-emerald-50 text-emerald-700' :
    s === 'INACTIVE' || s === 'CANCELED' || s === 'CANCELADO' ? 'bg-rose-50 text-rose-700' :
    'bg-slate-100 text-slate-500'
  const label =
    s === 'ACTIVE' ? 'Ativo' :
    s === 'INACTIVE' ? 'Inativo' :
    s === 'DELETED' ? 'Deletado' :
    s === 'CANCELED' ? 'Cancelado' :
    s === 'CONFIRMED' ? 'Confirmado' :
    status
  return (
    <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  )
}

export default function PatientDrawer({ unit, patientId, patientName, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('pagamentos')

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Reset tab when patient changes
  useEffect(() => { setTab('pagamentos') }, [patientId])

  const { data, isLoading } = useQuery<PatientDetail>({
    queryKey: ['patient-detail', unit, patientId],
    queryFn: async () => {
      const res = await fetch(`/api/clinicorp/${unit}/patients/${patientId}`)
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      return res.json()
    },
    enabled: !!patientId,
  })

  const isOpen = !!patientId

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 z-40 flex h-full w-full max-w-[480px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 truncate">{patientName}</h2>
              {data?.patient?.status && <StatusBadge status={data.patient.status} />}
            </div>
            {isLoading ? (
              <div className="mt-1 h-3.5 w-40 animate-pulse rounded bg-slate-100" />
            ) : data?.patient ? (
              <p className="mt-1 text-xs text-slate-400">
                {[data.patient.phone, data.patient.birthDate && calcAge(data.patient.birthDate)].filter(Boolean).join(' · ')}
              </p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="ml-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
          {[
            {
              label: 'Pago (12 meses)',
              value: isLoading ? null : formatCurrency(data?.totalPaid12m ?? 0),
              color: 'text-emerald-700',
            },
            {
              label: 'Pagamentos',
              value: isLoading ? null : String(data?.payments.length ?? 0),
              color: 'text-slate-900',
            },
            {
              label: 'Consultas',
              value: isLoading ? null : String(data?.appointments.length ?? 0),
              color: 'text-slate-900',
            },
          ].map((kpi) => (
            <div key={kpi.label} className="px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{kpi.label}</p>
              {kpi.value == null ? (
                <div className="mt-1.5 h-6 w-20 animate-pulse rounded bg-slate-100" />
              ) : (
                <p className={`mt-1 text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
              )}
            </div>
          ))}
        </div>

        {/* Contact info */}
        {!isLoading && data?.patient && (data.patient.email || data.patient.cpf) && (
          <div className="flex gap-4 border-b border-slate-100 px-6 py-3">
            {data.patient.email && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                {data.patient.email}
              </div>
            )}
            {data.patient.cpf && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
                </svg>
                CPF: {data.patient.cpf}
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6">
          {(['pagamentos', 'consultas', 'orcamentos'] as Tab[]).map((t) => {
            const labels: Record<Tab, string> = { pagamentos: 'Pagamentos', consultas: 'Consultas', orcamentos: 'Orçamentos' }
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`mr-6 border-b-2 py-3.5 text-xs font-semibold transition-colors ${
                  tab === t
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {labels[t]}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Pagamentos */}
          {tab === 'pagamentos' && (
            <div className="space-y-2">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
                      <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
                    </div>
                  ))
                : data?.payments.length
                  ? data.payments.map((p, i) => {
                      const formCls = FORM_STYLES[p.form] ?? 'bg-slate-100 text-slate-600'
                      return (
                        <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold ${formCls}`}>
                              {p.form}
                            </span>
                            <span className="text-xs text-slate-400">{formatBRDate(p.date)}</span>
                          </div>
                          <span className="font-bold text-emerald-700">{formatCurrency(p.amount)}</span>
                        </div>
                      )
                    })
                  : <p className="py-8 text-center text-sm text-slate-400">Nenhum pagamento nos últimos 12 meses.</p>
              }
            </div>
          )}

          {/* Consultas */}
          {tab === 'consultas' && (
            <div className="space-y-2">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-slate-100 p-4 space-y-2">
                      <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
                      <div className="h-3 w-40 animate-pulse rounded bg-slate-100" />
                    </div>
                  ))
                : data?.appointments.length
                  ? data.appointments.map((a, i) => (
                      <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800">
                              {a.procedure || a.specialty || 'Consulta'}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {[a.professional, a.fromTime && `${a.fromTime}–${a.toTime}`].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-xs font-medium text-slate-500">{formatBRDate(a.date)}</span>
                            {a.status && <StatusBadge status={a.status} />}
                          </div>
                        </div>
                      </div>
                    ))
                  : <p className="py-8 text-center text-sm text-slate-400">Nenhuma consulta registrada.</p>
              }
            </div>
          )}

          {/* Orçamentos */}
          {tab === 'orcamentos' && (
            <div className="space-y-2">
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-slate-100 p-4 space-y-2">
                      <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
                      <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                    </div>
                  ))
                : data?.estimates.length
                  ? data.estimates.map((e, i) => (
                      <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800">
                              {e.description || `Orçamento #${e.estimateId ?? i + 1}`}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">{formatBRDate(e.date)}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="font-bold text-slate-800">{formatCurrency(e.totalValue)}</span>
                            {e.status && <StatusBadge status={e.status} />}
                          </div>
                        </div>
                      </div>
                    ))
                  : <p className="py-8 text-center text-sm text-slate-400">Nenhum orçamento registrado.</p>
              }
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
