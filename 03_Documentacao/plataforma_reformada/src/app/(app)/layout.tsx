import type { ReactNode } from 'react'
import { MessageSquare, BarChart2, Users, Settings } from 'lucide-react'
import Link from 'next/link'

const NAV = [
  { href: '/atendimentos', icon: MessageSquare, label: 'Atendimentos' },
  { href: '/crm', icon: Users, label: 'CRM' },
  { href: '/relatorios', icon: BarChart2, label: 'Relatórios' },
  { href: '/configuracoes', icon: Settings, label: 'Config' },
]

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Navbar vertical esquerda */}
      <nav className="flex flex-col items-center gap-1 w-14 shrink-0 bg-zinc-900 border-r border-zinc-800 py-3">
        {/* Logo */}
        <div className="mb-4 flex items-center justify-center">
          <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <span className="text-xs font-black text-white">IBS</span>
          </div>
        </div>

        {NAV.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            title={label}
            className="flex flex-col items-center justify-center w-10 h-10 rounded-xl text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <Icon className="h-5 w-5" />
          </Link>
        ))}
      </nav>

      {/* Conteúdo principal */}
      <main className="flex flex-1 min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
