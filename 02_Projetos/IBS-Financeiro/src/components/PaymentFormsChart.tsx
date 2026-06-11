'use client'

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/formatters'

interface Item {
  name: string
  value: number
}

interface Props {
  data: Item[]
  total: number
}

const COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#10b981', '#94a3b8']

function TooltipContent({
  active,
  payload,
}: {
  active?: boolean
  payload?: { name: string; value: number }[]
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-2.5 shadow-lg text-sm">
      <p className="font-semibold text-slate-700">{payload[0].name}</p>
      <p className="text-slate-500">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

function CenterLabel({ total }: { total: number }) {
  const formatted = new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 0,
  }).format(total)

  return (
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
      <tspan x="50%" dy="-8" fontSize="11" fill="#94a3b8" fontWeight="600" letterSpacing="1">
        TOTAL
      </tspan>
      <tspan x="50%" dy="22" fontSize="18" fill="#0f172a" fontWeight="700">
        {`R$ ${formatted}`}
      </tspan>
    </text>
  )
}

export default function PaymentFormsChart({ data, total }: Props) {
  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-400">Sem pagamentos no período</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-bold text-slate-800">Formas de Pagamento</h2>
      <p className="mt-0.5 mb-4 text-xs text-slate-400">Distribuição do período</p>

      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={64}
            outerRadius={88}
            paddingAngle={3}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={0} />
            ))}
            <CenterLabel total={total} />
          </Pie>
          <Tooltip content={<TooltipContent />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Custom legend */}
      <div className="mt-4 space-y-2.5">
        {data.map((item, i) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
          return (
            <div key={item.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="truncate text-xs text-slate-600">{item.name}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs font-semibold text-slate-900">{formatCurrency(item.value)}</span>
                <span className="w-10 text-right text-xs text-slate-400">{pct}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
