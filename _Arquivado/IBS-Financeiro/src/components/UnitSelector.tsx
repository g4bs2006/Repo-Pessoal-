'use client'

import { UNIT_LIST, type UnitKey } from '@/lib/units'

interface Props {
  value: UnitKey
  onChange: (unit: UnitKey) => void
}

export default function UnitSelector({ value, onChange }: Props) {
  if (UNIT_LIST.length === 1) {
    return (
      <span className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-600">
        {UNIT_LIST[0].name}
      </span>
    )
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as UnitKey)}
      className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
    >
      {UNIT_LIST.map((u) => (
        <option key={u.key} value={u.key}>{u.name}</option>
      ))}
    </select>
  )
}
