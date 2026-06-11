'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatCurrency } from '@/lib/formatters'
import type { UnitKey } from '@/lib/units'

interface Patient {
  patientId: number
  name: string
  totalPaid: number
  countPayments: number
  lastPaymentDate: string
  mainForm: string
  pending: number
}

interface Props {
  unit: UnitKey
  from: string
  to: string
  onSelectPatient: (id: number, name: string) => void
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
]

function initials(name: string): string {
  const parts = name.split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatBRDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const FORM_STYLES: Record<string, string> = {
  'Cartão de Crédito': 'bg-violet-50 text-violet-700',
  'Cartão de Débito': 'bg-blue-50 text-blue-700',
  'Boleto': 'bg-amber-50 text-amber-700',
  'PIX': 'bg-emerald-50 text-emerald-700',
  'Dinheiro': 'bg-slate-100 text-slate-600',
  'Transferência': 'bg-cyan-50 text-cyan-700',
}

function SkeletonRow() {
  return (
    <tr>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-100" />
          <div className="space-y-1.5">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4"><div className="h-4 w-24 animate-pulse rounded bg-slate-100" /></td>
      <td className="px-6 py-4"><div className="h-4 w-8 animate-pulse rounded bg-slate-100" /></td>
      <td className="px-6 py-4"><div className="h-5 w-20 animate-pulse rounded-lg bg-slate-100" /></td>
      <td className="px-6 py-4"><div className="h-4 w-20 animate-pulse rounded bg-slate-100" /></td>
    </tr>
  )
}

export default function PatientsView({ unit, from, to, onSelectPatient }: Props) {
  const [search, setSearch] = useState('')

  const { data, isLoading, error } = useQuery<{ patients: Patient[] }>({
    queryKey: ['patients', unit, from, to],
    queryFn: async () => {
      const res = await fetch(`/api/clinicorp/${unit}/patients?from=${from}&to=${to}`)
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      return res.json()
    },
    enabled: !!from && !!to,
  })

  const filtered = (data?.patients ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Search + summary bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar paciente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        {data && (
          <p className="text-sm text-slate-400">
            <span className="font-semibold text-slate-700">{filtered.length}</span> paciente{filtered.length !== 1 ? 's' : ''} no período
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Erro ao carregar pacientes'}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">Paciente</th>
                <th className="px-6 py-3.5 text-right text-[11px] font-bold uppercase tracking-widest text-slate-400">Total pago</th>
                <th className="px-6 py-3.5 text-center text-[11px] font-bold uppercase tracking-widest text-slate-400">Visitas</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">Forma principal</th>
                <th className="px-6 py-3.5 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">Último pagamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                : filtered.map((p, i) => {
                    const avatarCls = AVATAR_COLORS[i % AVATAR_COLORS.length]
                    const formCls = FORM_STYLES[p.mainForm] ?? 'bg-slate-100 text-slate-600'
                    return (
                      <tr
                        key={p.patientId}
                        onClick={() => onSelectPatient(p.patientId, p.name)}
                        className="cursor-pointer transition-colors hover:bg-blue-50/40 group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-[11px] font-bold ${avatarCls}`}>
                              {initials(p.name)}
                            </span>
                            <div>
                              <p className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">{p.name}</p>
                              {p.pending > 0 && (
                                <p className="text-xs text-amber-600">
                                  {formatCurrency(p.pending)} pendente
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-700">
                          {formatCurrency(p.totalPaid)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                            {p.countPayments}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold ${formCls}`}>
                            {p.mainForm}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400">
                          {formatBRDate(p.lastPaymentDate)}
                        </td>
                      </tr>
                    )
                  })}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                    {search ? 'Nenhum paciente encontrado para a busca.' : 'Sem dados no período selecionado.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
