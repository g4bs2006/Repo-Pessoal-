export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

export function getPeriodDates(period: string): { from: string; to: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  if (period === 'this-month') {
    const lastDay = new Date(y, m + 1, 0).getDate()
    return {
      from: `${y}-${pad(m + 1)}-01`,
      to: `${y}-${pad(m + 1)}-${pad(lastDay)}`,
    }
  }

  if (period === 'last-month') {
    const d = new Date(y, m, 0)
    const lastDay = d.getDate()
    const lm = d.getMonth() + 1
    const ly = d.getFullYear()
    return {
      from: `${ly}-${pad(lm)}-01`,
      to: `${ly}-${pad(lm)}-${pad(lastDay)}`,
    }
  }

  if (period === 'last-30') {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 30)
    return { from: isoDate(from), to: isoDate(to) }
  }

  if (period === 'last-90') {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 90)
    return { from: isoDate(from), to: isoDate(to) }
  }

  return { from: '', to: '' }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
