import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import QueryProvider from '@/providers/QueryProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'Dashboard Financeiro — IBS Odonto',
  description: 'Painel financeiro conectado ao Clinicorp',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.className}>
      <body className="bg-slate-50 antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
