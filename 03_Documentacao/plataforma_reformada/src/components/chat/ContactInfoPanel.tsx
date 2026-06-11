'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { concludeConversation, saveInternalNote } from '@/lib/helena/conversations'
import { useAppStore } from '@/lib/store/app'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Phone, Mail, Tag, CheckCircle2, StickyNote,
  Send, ChevronDown, ChevronUp, User
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function initials(name?: string) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

function Section({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-zinc-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full px-4 py-3 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-zinc-300">
          {icon}
          <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-zinc-500" /> : <ChevronDown className="h-4 w-4 text-zinc-500" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

export function ContactInfoPanel() {
  const { activeConversation } = useAppStore()
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')

  const concludeMutation = useMutation({
    mutationFn: () => concludeConversation(activeConversation!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  const noteMutation = useMutation({
    mutationFn: () => saveInternalNote(activeConversation!.id, note),
    onSuccess: () => setNote(''),
  })

  if (!activeConversation) {
    return (
      <div className="w-[280px] shrink-0 bg-zinc-900 border-l border-zinc-800 flex items-center justify-center">
        <p className="text-zinc-600 text-sm text-center px-4">
          Selecione uma conversa para ver os detalhes
        </p>
      </div>
    )
  }

  const contact = activeConversation.contact
  const name = contact?.name ?? contact?.phonenumber ?? 'Desconhecido'
  const channel = activeConversation.channel

  return (
    <div className="w-[280px] shrink-0 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full">
      <ScrollArea className="flex-1">
        {/* Cabeçalho do contato */}
        <div className="flex flex-col items-center py-6 px-4 border-b border-zinc-800">
          <Avatar className="h-16 w-16 mb-3">
            <AvatarFallback className="bg-emerald-700 text-white text-xl font-bold">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-white font-semibold text-base text-center">{name}</h2>
          {channel && (
            <span className="text-xs text-zinc-500 mt-0.5">
              {channel.platform} · {channel.displayName}
            </span>
          )}
          <div className="mt-2">
            <Badge
              className={cn(
                'text-[11px]',
                activeConversation.status === 'PENDING' && 'bg-yellow-600',
                activeConversation.status === 'IN_PROGRESS' && 'bg-emerald-700',
                activeConversation.status === 'RESOLVED' && 'bg-blue-600',
                activeConversation.status === 'CLOSED' && 'bg-zinc-600'
              )}
            >
              {activeConversation.status === 'PENDING' && 'Pendente'}
              {activeConversation.status === 'IN_PROGRESS' && 'Em Atendimento'}
              {activeConversation.status === 'RESOLVED' && 'Resolvido'}
              {activeConversation.status === 'CLOSED' && 'Encerrado'}
            </Badge>
          </div>
        </div>

        {/* Dados do contato */}
        <Section title="Contato" icon={<User className="h-3.5 w-3.5" />}>
          <div className="space-y-2.5">
            {contact?.phonenumber && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                <span className="text-zinc-300">{contact.phonenumber}</span>
              </div>
            )}
            {contact?.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                <span className="text-zinc-300 truncate">{contact.email}</span>
              </div>
            )}
            {activeConversation.createdAt && (
              <div className="text-xs text-zinc-500 mt-1">
                Início: {format(new Date(activeConversation.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            )}
          </div>
        </Section>

        {/* Etiquetas */}
        {activeConversation.tags && activeConversation.tags.length > 0 && (
          <Section title="Etiquetas" icon={<Tag className="h-3.5 w-3.5" />}>
            <div className="flex flex-wrap gap-1.5">
              {activeConversation.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="text-xs bg-zinc-700 text-zinc-300">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </Section>
        )}

        {/* Nota interna */}
        <Section title="Nota Interna" icon={<StickyNote className="h-3.5 w-3.5" />} defaultOpen={false}>
          <div className="flex flex-col gap-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Adicionar nota interna (visível só para a equipe)..."
              rows={3}
              className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 placeholder:text-zinc-600 outline-none resize-none focus:border-emerald-600"
            />
            <button
              onClick={() => noteMutation.mutate()}
              disabled={!note.trim() || noteMutation.isPending}
              className="flex items-center justify-center gap-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white rounded-lg py-1.5 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              Salvar nota
            </button>
          </div>
        </Section>

        <Separator className="bg-zinc-800" />

        {/* Ações da conversa */}
        <div className="px-4 py-4 space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500 font-semibold mb-3">Ações</p>
          <button
            onClick={() => concludeMutation.mutate()}
            disabled={concludeMutation.isPending || activeConversation.status === 'RESOLVED'}
            className="flex items-center justify-center gap-2 w-full text-sm bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-lg py-2 transition-colors font-medium"
          >
            <CheckCircle2 className="h-4 w-4" />
            {concludeMutation.isPending ? 'Concluindo...' : 'Concluir Atendimento'}
          </button>
        </div>
      </ScrollArea>
    </div>
  )
}
