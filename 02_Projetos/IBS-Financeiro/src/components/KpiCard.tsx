interface Props {
  label: string
  value: string
  loading?: boolean
  accent?: 'green' | 'red' | 'blue' | 'amber'
  icon: React.ReactNode
  sub?: string
}

const ACCENT = {
  green: {
    top: 'border-t-emerald-500',
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-600',
    value: 'text-emerald-700',
  },
  red: {
    top: 'border-t-rose-500',
    iconBg: 'bg-rose-500/10',
    iconText: 'text-rose-600',
    value: 'text-rose-700',
  },
  blue: {
    top: 'border-t-blue-500',
    iconBg: 'bg-blue-500/10',
    iconText: 'text-blue-600',
    value: 'text-slate-900',
  },
  amber: {
    top: 'border-t-amber-400',
    iconBg: 'bg-amber-500/10',
    iconText: 'text-amber-600',
    value: 'text-slate-900',
  },
}

export default function KpiCard({ label, value, loading = false, accent = 'blue', icon, sub }: Props) {
  const a = ACCENT[accent]

  return (
    <div className={`rounded-2xl border border-slate-100 bg-white shadow-sm border-t-[3px] ${a.top} px-5 pt-4 pb-5`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${a.iconBg} ${a.iconText}`}>
          {icon}
        </span>
      </div>

      {loading ? (
        <div className="mt-3 space-y-2">
          <div className="h-8 w-36 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-3.5 w-24 animate-pulse rounded bg-slate-100" />
        </div>
      ) : (
        <div className="mt-2">
          <p className={`text-[1.65rem] font-bold leading-tight tracking-tight ${a.value}`}>{value}</p>
          {sub && <p className="mt-1.5 text-xs text-slate-400">{sub}</p>}
        </div>
      )}
    </div>
  )
}
