import { useState, useEffect, useCallback } from 'react'
import { Doughnut, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { loadAllData } from './api'
import { STEPS } from './config'

ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

// ── Paleta de dados (intuitiva) ───────────────────────────────
const GREEN   = '#059669'   // fechou / sucesso
const TEAL    = '#0891B2'   // compareceu s/ fechar
const BLUE    = '#3B82F6'   // agendados / neutro positivo
const RED     = '#EF4444'   // faltou / negativo
const ORANGE  = '#F97316'   // cancelado
const AMBER   = '#D97706'   // reagendado
const SLATE   = '#64748b'   // neutro

// ── Helpers de tempo ──────────────────────────────────────────
function buildBuckets(days) {
  const step = days <= 30 ? 1 : 7
  const buckets = []
  for (let i = days; i >= 0; i -= step) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    buckets.push(d)
  }
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  buckets[buckets.length - 1] = end
  return buckets
}

function groupByBucket(cards, buckets) {
  const counts = new Array(buckets.length - 1).fill(0)
  cards.forEach(card => {
    const ts = new Date(card.updatedAt ?? card.createdAt ?? 0)
    for (let i = 0; i < buckets.length - 1; i++) {
      if (ts >= buckets[i] && ts < buckets[i + 1]) { counts[i]++; break }
    }
  })
  return counts
}

function fmtBucket(date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function fmtBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtPct(num, den) {
  if (!den) return '—'
  return `${((num / den) * 100).toFixed(1)}%`
}

// ── KpiCard ───────────────────────────────────────────────────
function KpiCard({ label, value, color, sub }) {
  return (
    <div className="kpi-card">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value" style={{ color: color ?? '#1a150a' }}>{value ?? '—'}</span>
      {sub && <span className="kpi-sub">{sub}</span>}
    </div>
  )
}

// ── DonutChart ────────────────────────────────────────────────
function DonutChart({ title, subtitle, labels, data, colors }) {
  const total = data.reduce((a, b) => a + b, 0)

  const chartData = {
    labels,
    datasets: [{
      data,
      backgroundColor: colors,
      borderColor: '#f8f6fb',
      borderWidth: 3,
      hoverOffset: 8,
    }],
  }

  const options = {
    cutout: '76%',
    responsive: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => {
            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0
            return `  ${ctx.label}: ${ctx.parsed.toLocaleString('pt-BR')} (${pct}%)`
          },
        },
        backgroundColor: '#fff',
        borderColor: '#e4e8ee',
        borderWidth: 1,
        titleColor: '#0f172a',
        bodyColor: '#64748b',
        padding: 12,
        cornerRadius: 8,
      },
    },
  }

  return (
    <div className="chart-card">
      <div className="chart-head">
        <p className="chart-title">{title}</p>
        <p className="chart-subtitle">{subtitle}</p>
      </div>

      <div className="donut-layout">
        <div className="donut-wrap">
          <Doughnut data={chartData} options={options} width={176} height={176} />
          <div className="donut-center">
            <span className="donut-total">{total.toLocaleString('pt-BR')}</span>
            <span className="donut-label">total</span>
          </div>
        </div>

        <div className="donut-legend">
          {labels.map((label, i) => {
            const pct = total > 0 ? ((data[i] / total) * 100).toFixed(1) : '0.0'
            return (
              <div key={label} className="legend-row">
                <div className="legend-left">
                  <span className="legend-dot" style={{ background: colors[i] }} />
                  <span className="legend-name">{label}</span>
                </div>
                <div className="legend-right">
                  <span className="legend-count">{data[i].toLocaleString('pt-BR')}</span>
                  <span className="legend-pct">{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── LineChart ─────────────────────────────────────────────────
function AgendamentosChart({ lineCards }) {
  const [period, setPeriod] = useState(30)

  const buckets = buildBuckets(period)
  const labels  = buckets.slice(0, -1).map(fmtBucket)

  const dAgendado  = groupByBucket(lineCards.agendadoCards,  buckets)
  const dFechou    = groupByBucket(lineCards.fechouCards,    buckets)
  const dNaoFechou = groupByBucket(lineCards.naoFechouCards, buckets)

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Agendados',
        data: dAgendado,
        borderColor: BLUE,
        backgroundColor: 'rgba(59,130,246,0.06)',
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: true,
        tension: 0.35,
        order: 0,
      },
      {
        label: 'Compareceu e Fechou',
        data: dFechou,
        borderColor: GREEN,
        backgroundColor: 'rgba(5,150,105,0.07)',
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: true,
        tension: 0.35,
        order: 1,
      },
      {
        label: 'Compareceu s/ fechar',
        data: dNaoFechou,
        borderColor: TEAL,
        backgroundColor: 'rgba(8,145,178,0.06)',
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: true,
        tension: 0.35,
        order: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: SLATE,
          boxWidth: 24,
          boxHeight: 2,
          font: { size: 12, family: 'Inter' },
          padding: 20,
          usePointStyle: false,
        },
      },
      tooltip: {
        backgroundColor: '#fff',
        borderColor: '#e4e8ee',
        borderWidth: 1,
        titleColor: '#0f172a',
        bodyColor: '#64748b',
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid:   { color: '#f1f5f9', drawBorder: false },
        ticks:  { color: '#94a3b8', font: { size: 11, family: 'Inter' }, maxRotation: 0 },
        border: { display: false },
      },
      y: {
        grid:   { color: '#f1f5f9', drawBorder: false },
        ticks:  { color: '#94a3b8', font: { size: 11, family: 'Inter' }, precision: 0 },
        border: { display: false },
        beginAtZero: true,
      },
    },
  }

  return (
    <div className="chart-card">
      <div className="chart-head line-head">
        <div>
          <p className="chart-title">Evolução dos Atendimentos</p>
          <p className="chart-subtitle">Agendados · Compareceu e Fechou · Compareceu s/ fechar</p>
        </div>
        <div className="period-tabs">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              className={`period-tab ${period === d ? 'active' : ''}`}
              onClick={() => setPeriod(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>
      <div className="line-wrap">
        <Line data={chartData} options={options} />
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────
function Skeleton({ w, h }) {
  return <span className="skeleton" style={{ width: w, height: h, display: 'inline-block', borderRadius: 6 }} />
}

// ── App ───────────────────────────────────────────────────────
export default function App() {
  const [data, setData]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await loadAllData(STEPS)
      setData(result)
      setLastUpdated(new Date())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const c            = data?.counts ?? {}
  const receita      = data?.receita ?? 0
  const compareceu   = (c.cFechouComp ?? 0) + (c.cNaoFechouComp ?? 0)
  const ausencias    = (c.cFaltou ?? 0) + (c.cCancelado ?? 0) + (c.cReagendado ?? 0)
  const totalPipeline = (c.cAgendado ?? 0) + compareceu + ausencias
  const ticketMedio  = c.cFechouComp > 0 ? (receita / c.cFechouComp) : 0

  return (
    <div className="page">

      {/* Header */}
      <header className="header">
        <div className="brand">
          <div className="brand-mark">
            <span className="brand-initials">PD</span>
          </div>
          <div className="brand-text">
            <h1 className="brand-name">Prime Dente</h1>
            <p className="brand-sub">Painel de Performance · Gestão de Atendimentos</p>
          </div>
        </div>

        <div className="header-actions">
          {lastUpdated && (
            <span className="update-time">
              Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button className="btn-refresh" onClick={load} disabled={loading}>
            {loading ? 'Atualizando...' : '↻ Atualizar'}
          </button>
        </div>
      </header>

      <main className="main">

        {/* Erro */}
        {error && (
          <div className="error-banner">
            Erro ao carregar dados: <strong>{error}</strong>
          </div>
        )}

        {/* Seção KPIs */}
        <section>
          <h2 className="section-label">Visão Geral</h2>
          <div className="kpi-row">
            <KpiCard
              label="Total no Pipeline"
              value={loading ? <Skeleton w={72} h={28} /> : totalPipeline.toLocaleString('pt-BR')}
              color={BLUE}
            />
            <KpiCard
              label="Taxa de Comparecimento"
              value={loading ? <Skeleton w={56} h={28} /> : fmtPct(compareceu, totalPipeline)}
            />
            <KpiCard
              label="Taxa de Fechamento"
              value={loading ? <Skeleton w={56} h={28} /> : fmtPct(c.cFechouComp, compareceu)}
              color={GREEN}
            />
            <KpiCard
              label="Faturamento"
              value={loading ? <Skeleton w={80} h={28} /> : fmtBRL(receita)}
              color={GREEN}
            />
            <KpiCard
              label="Ticket Médio"
              value={loading ? <Skeleton w={80} h={28} /> : fmtBRL(ticketMedio)}
              color={BLUE}
            />
          </div>
        </section>

        {/* Seção Donuts */}
        <section>
          <h2 className="section-label">Distribuição</h2>
          {loading ? (
            <div className="donuts-row">
              {[0, 1, 2].map(i => <div key={i} className="chart-card chart-skeleton"><Skeleton w="100%" h={260} /></div>)}
            </div>
          ) : data ? (
            <div className="donuts-row">
              <DonutChart
                title="Desfecho dos Atendimentos"
                subtitle="Todos os status do pipeline"
                labels={['Agendado', 'Fechou', 'Compareceu s/ fechar', 'Faltou', 'Cancelado', 'Reagendado']}
                data={[
                  c.cAgendado ?? 0,
                  c.cFechouComp ?? 0,
                  c.cNaoFechouComp ?? 0,
                  c.cFaltou ?? 0,
                  c.cCancelado ?? 0,
                  c.cReagendado ?? 0,
                ]}
                colors={[BLUE, GREEN, TEAL, RED, ORANGE, AMBER]}
              />
              <DonutChart
                title="Conversão na Consulta"
                subtitle="Compareceu e Fechou vs Não Fechou"
                labels={['Compareceu e Fechou', 'Compareceu s/ fechar']}
                data={[c.cFechouComp ?? 0, c.cNaoFechouComp ?? 0]}
                colors={[GREEN, TEAL]}
              />
              <DonutChart
                title="Ausências e Cancelamentos"
                subtitle="Motivos de não comparecimento"
                labels={['Faltou', 'Cancelado', 'Reagendado']}
                data={[c.cFaltou ?? 0, c.cCancelado ?? 0, c.cReagendado ?? 0]}
                colors={[RED, ORANGE, AMBER]}
              />
            </div>
          ) : null}
        </section>

        {/* Seção Linha */}
        <section>
          <h2 className="section-label">Evolução</h2>
          {loading ? (
            <div className="chart-card chart-skeleton"><Skeleton w="100%" h={320} /></div>
          ) : data ? (
            <AgendamentosChart lineCards={data.lineCards} />
          ) : null}
        </section>

      </main>
    </div>
  )
}
