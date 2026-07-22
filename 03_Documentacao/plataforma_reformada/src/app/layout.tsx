import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'IBS Implantes — Plataforma de Atendimento',
  description: 'Plataforma de atendimento odontológico',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full`}>
      <body className="h-full bg-zinc-950 antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
