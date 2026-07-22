import { formatCurrency } from '@/lib/formatters'

interface Row {
  patient: string
  amount: number
  form: string
  date: string
}

interface Props {
  rows: Row[]
  loading?: boolean
}

function formatBRDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function shortName(full: string): string {
  return full.replace(/\s*\(\d+\)\s*$/, '').trim()
}

function initials(name: string): string {
  const parts = shortName(name).split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
]

const FORM_STYLES: Record<string, string> = {
  'Cartão de Crédito': 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  'Cartão de Débito': 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  'Boleto':           'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  'PIX':              'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  'Dinheiro':         'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  'Transferência':    'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200',
}

function FormBadge({ form }: { form: string }) {
  const cls = FORM_STYLES[form] ?? 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
  return (
    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold ${cls}`}>
      {form}
    </span>
  )
}

function SkeletonRow() {
  return (
    <tr>
      <td className="px-6 py-3.5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
        </div>
      </td>
      <td className="px-6 py-3.5 text-right">
        <div className="ml-auto h-4 w-24 animate-pulse rounded bg-slate-100" />
      </td>
      <td className="px-6 py-3.5">
        <div className="h-6 w-28 animate-pulse rounded-lg bg-slate-100" />
      </td>
      <td className="px-6 py-3.5">
        <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
      </td>
    </tr>
  )
}

export default function PaymentsTable({ rows, loading = false }: Props) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-800">Últimos Pagamentos</h2>
        <p className="mt-0.5 text-xs text-slate-400">Pagamentos confirmados no período</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Paciente
              </th>
              <th className="px-6 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Valor
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Forma
              </th>
              <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Data
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              : rows.map((row, i) => {
                  const name = shortName(row.patient)
                  const avatarCls = AVATAR_COLORS[i % AVATAR_COLORS.length]
                  return (
                    <tr key={i} className="group transition-colors hover:bg-slate-50/70">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-[11px] font-bold ${avatarCls}`}>
                            {initials(row.patient)}
                          </span>
                          <span className="font-medium text-slate-800">{name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold text-emerald-700">
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="px-6 py-3.5">
                        <FormBadge form={row.form} />
                      </td>
                      <td className="px-6 py-3.5 text-slate-400">{formatBRDate(row.date)}</td>
                    </tr>
                  )
                })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
