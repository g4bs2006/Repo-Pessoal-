'use client'

import { useAppStore } from '@/lib/store/app'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Phone, MoreVertical, UserCheck } from 'lucide-react'

function initials(name?: string) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

export function ConversationHeader() {
  const { activeConversation } = useAppStore()
  if (!activeConversation) return null

  const contact = activeConversation.contact
  const name = contact?.name ?? contact?.phonenumber ?? 'Desconhecido'
  const channel = activeConversation.channel
  const agent = activeConversation.user

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 border-b border-zinc-700 shrink-0">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-emerald-700 text-white text-sm font-semibold">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-semibold text-white">{name}</p>
          <p className="text-[11px] text-zinc-400">
            {channel?.platform ?? 'WhatsApp'} · {channel?.displayName ?? ''}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {agent && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <UserCheck className="h-4 w-4 text-emerald-400" />
            <span>{agent.name}</span>
          </div>
        )}
        {contact?.phonenumber && (
          <a
            href={`tel:${contact.phonenumber}`}
            className="p-2 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            title="Ligar"
          >
            <Phone className="h-4 w-4" />
          </a>
        )}
        <button className="p-2 rounded-full hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
