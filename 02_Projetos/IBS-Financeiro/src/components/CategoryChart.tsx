'use client'

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import { formatCurrency } from '@/lib/formatters'

interface Category {
  name: string
  value: number
}

interface Props {
  data: Category[]
  total: number
}

const COLORS = ['#3b82f6', '#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4', '#94a3b8']

function TooltipContent({
  active,
  payload,
}: {
  active?: boolean
  payload?: { name: string; value: number; payload: { percent?: number } }[]
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg text-sm">
      <p className="font-medium text-gray-700">{item.name}</p>
      <p className="text-gray-600">{formatCurrency(item.value)}</p>
    </div>
  )
}

export default function CategoryChart({ data, total }: Props) {
  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-400">Sem despesas no período</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Despesas por Categoria</h2>
        <span className="text-xs text-gray-400">Total: {formatCurrency(total)}</span>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={95}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<TooltipContent />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value) =>
              value.length > 28 ? value.slice(0, 26) + '…' : value
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
