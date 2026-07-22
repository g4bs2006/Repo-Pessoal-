'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/types/helena'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
}

function initials(name?: string) {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function lastMessagePreview(conv: Conversation): string {
  const msg = conv.lastMessage
  if (!msg) return ''
  if (msg.text) return msg.text
  if (msg.type === 'IMAGE') return '📷 Imagem'
  if (msg.type === 'AUDIO') return '🎵 Áudio'
  if (msg.type === 'VIDEO') return '🎬 Vídeo'
  if (msg.type === 'DOCUMENT') return '📄 Documento'
  return ''
}

function timeLabel(dateStr?: string | null): string {
  if (!dateStr) return ''
  try {
    return formatDistanceToNow(new Date(dateStr), { locale: ptBR, addSuffix: false })
  } catch {
    return ''
  }
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-400',
  IN_PROGRESS: 'bg-green-500',
  RESOLVED: 'bg-blue-400',
  CLOSED: 'bg-gray-400',
}

export function ConversationItem({ conversation, isActive, onClick }: Props) {
  const contact = conversation.contact
  const name = contact?.name ?? contact?.phonenumber ?? 'Desconhecido'
  const preview = lastMessagePreview(conversation)
  const time = timeLabel(conversation.lastInteractionAt ?? conversation.updatedAt)
  const unread = conversation.unreadCount ?? 0
  const statusColor = statusColors[conversation.status] ?? 'bg-gray-400'

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors text-left',
        isActive && 'bg-zinc-700'
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-11 w-11">
          <AvatarFallback className="bg-emerald-700 text-white text-sm font-semibold">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn('absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-zinc-900', statusColor)}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-sm font-semibold text-white truncate">{name}</span>
          <span className="text-[11px] text-zinc-400 shrink-0">{time}</span>
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <span className="text-xs text-zinc-400 truncate">{preview}</span>
          {unread > 0 && (
            <Badge className="shrink-0 h-5 min-w-5 px-1.5 text-[10px] bg-emerald-500 text-white rounded-full">
              {unread > 99 ? '99+' : unread}
            </Badge>
          )}
        </div>
        {conversation.tags && conversation.tags.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {conversation.tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-600 text-zinc-300"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}
