'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import KpiCard from '@/components/KpiCard'
import PaymentsTable from '@/components/PaymentsTable'
import UnitSelector from '@/components/UnitSelector'
import PatientsView from '@/components/PatientsView'
import PatientDrawer from '@/components/PatientDrawer'
import { formatCurrency, getPeriodDates } from '@/lib/formatters'
import { UNIT_LIST, type UnitKey } from '@/lib/units'

const MonthlyBarChart = dynamic(() => import('@/components/MonthlyBarChart'), { ssr: false })
const PaymentFormsChart = dynamic(() => import('@/components/PaymentFormsChart'), { ssr: false })

// ── Types ──────────────────────────────────────────────────────────

interface FormEntry { name: string; value: number }
interface PaymentRow { patient: string; amount: number; form: string; date: string }
interface MonthEntry { month: string; entrada: number; saida: number; resultado: number }

interface FinancialData {
  from: string; to: string
  recebido: number; despesas: number; resultado: number
  ticketMedio: number; uniquePatients: number; countPayments: number
  paymentForms: FormEntry[]
  categoryBreakdown: FormEntry[]
  recentPayments: PaymentRow[]
  monthlyComparison: MonthEntry[]
}

// ── Config ─────────────────────────────────────────────────────────

const PERIODS = [
  { value: 'this-month', label: 'Este mês' },
  { value: 'last-month', label: 'Mês anterior' },
  { value: 'last-30', label: '30 dias' },
  { value: 'last-90', label: '90 dias' },
]

type AppTab = 'financeiro' | 'pacientes'

// ── Icons ──────────────────────────────────────────────────────────

function IconReceived() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function IconExpenses() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" />
    </svg>
  )
}
function IconResult() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  )
}
function IconTicket() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )
}

function ChartSkeleton({ height = 320 }: { height?: number }) {
  return <div className="animate-pulse rounded-2xl bg-slate-100" style={{ height }} />
}

// ── Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [unit, setUnit] = useState<UnitKey>(UNIT_LIST[0].key)
  const [period, setPeriod] = useState('this-month')
  const [appTab, setAppTab] = useState<AppTab>('financeiro')
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null)
  const [selectedPatientName, setSelectedPatientName] = useState('')

  const { from, to } = getPeriodDates(period)
  const unitName = UNIT_LIST.find((u) => u.key === unit)?.name ?? ''

  const { data, isLoading, error } = useQuery<FinancialData>({
    queryKey: ['financial', unit, from, to],
    queryFn: async () => {
      const res = await fetch(`/api/clinicorp/${unit}/financial?from=${from}&to=${to}`)
      if (!res.ok) throw new Error(`Erro ${res.status} ao carregar dados`)
      return res.json()
    },
    enabled: !!from && !!to,
  })

  const resultAccent = !data ? 'blue' : data.resultado >= 0 ? 'green' : 'red'

  function handleSelectPatient(id: number, name: string) {
    setSelectedPatientId(id)
    setSelectedPatientName(name)
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3.5">

          {/* Brand */}
          <div className="flex items-center gap-3 mr-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-none">Dashboard Financeiro</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{unitName}</p>
            </div>
          </div>

          {/* App tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 gap-0.5">
            {([
              { value: 'financeiro', label: 'Financeiro' },
              { value: 'pacientes', label: 'Pacientes' },
            ] as { value: AppTab; label: string }[]).map((t) => (
              <button
                key={t.value}
                onClick={() => setAppTab(t.value)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  appTab === t.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Period tabs — only on Financeiro */}
          {appTab === 'financeiro' && (
            <div className="flex rounded-xl bg-slate-100 p-1 gap-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    period === p.value
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Unit selector */}
          <div className="ml-auto">
            <UnitSelector value={unit} onChange={setUnit} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-7">

        {/* ── Financeiro tab ── */}
        {appTab === 'financeiro' && (
          <div className="space-y-5">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error instanceof Error ? error.message : 'Erro ao carregar dados'}
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Recebido"
                value={formatCurrency(data?.recebido)}
                loading={isLoading}
                accent="green"
                icon={<IconReceived />}
                sub={data ? `${data.countPayments} pagamentos confirmados` : undefined}
              />
              <KpiCard
                label="Despesas"
                value={formatCurrency(data?.despesas)}
                loading={isLoading}
                accent="red"
                icon={<IconExpenses />}
              />
              <KpiCard
                label="Resultado"
                value={formatCurrency(data?.resultado)}
                loading={isLoading}
                accent={resultAccent}
                icon={<IconResult />}
              />
              <KpiCard
                label="Ticket Médio"
                value={formatCurrency(data?.ticketMedio)}
                loading={isLoading}
                accent="blue"
                icon={<IconTicket />}
                sub={data ? `${data.uniquePatients} pacientes únicos` : undefined}
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2">
                {isLoading ? <ChartSkeleton height={380} /> : data?.monthlyComparison?.length ? (
                  <MonthlyBarChart data={data.monthlyComparison} />
                ) : null}
              </div>
              <div>
                {isLoading ? <ChartSkeleton height={380} /> : data?.paymentForms?.length ? (
                  <PaymentFormsChart data={data.paymentForms} total={data.recebido} />
                ) : null}
              </div>
            </div>

            {/* Payments Table */}
            <PaymentsTable rows={data?.recentPayments ?? []} loading={isLoading} />
          </div>
        )}

        {/* ── Pacientes tab ── */}
        {appTab === 'pacientes' && (
          <PatientsView
            unit={unit}
            from={from}
            to={to}
            onSelectPatient={handleSelectPatient}
          />
        )}
      </main>

      {/* ── Patient drawer ── */}
      <PatientDrawer
        unit={unit}
        patientId={selectedPatientId}
        patientName={selectedPatientName}
        onClose={() => setSelectedPatientId(null)}
      />
    </div>
  )
}
