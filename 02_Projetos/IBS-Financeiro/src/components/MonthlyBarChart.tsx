'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts'
import { formatCurrency } from '@/lib/formatters'

interface MonthEntry {
  month: string
  entrada: number
  saida: number
  resultado: number
}

interface Props {
  data: MonthEntry[]
}

function TooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-xl text-sm min-w-[200px]">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <div className="space-y-2">
        {payload.map((p) => (
          <div key={p.name} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2 text-slate-500">
              <span className="inline-block h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
              {p.name}
            </span>
            <span className="font-bold text-slate-900">{formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MonthlyBarChart({ data }: Props) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Fluxo de Caixa Mensal</h2>
          <p className="mt-0.5 text-xs text-slate-400">Comparativo dos últimos 3 meses</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          barGap={3}
          barCategoryGap="32%"
        >
          <defs>
            <linearGradient id="gradEntrada" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.85} />
            </linearGradient>
            <linearGradient id="gradSaida" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={1} />
              <stop offset="100%" stopColor="#fb7185" stopOpacity={0.85} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="0" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#cbd5e1' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            width={36}
          />
          <Tooltip content={<TooltipContent />} cursor={{ fill: '#f8fafc', rx: 8 }} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 20, color: '#64748b' }}
          />
          <Bar dataKey="entrada" name="Entrada" fill="url(#gradEntrada)" radius={[6, 6, 0, 0]} maxBarSize={40} />
          <Bar dataKey="saida" name="Saída" fill="url(#gradSaida)" radius={[6, 6, 0, 0]} maxBarSize={40} />
          <Bar dataKey="resultado" name="Resultado" radius={[6, 6, 0, 0]} maxBarSize={40}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.resultado >= 0 ? '#10b981' : '#f43f5e'} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
