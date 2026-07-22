'use client'

import { useQuery } from '@tanstack/react-query'
import { listMessages } from '@/lib/helena/conversations'
import { useAppStore } from '@/lib/store/app'
import { MessageBubble } from './MessageBubble'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { format, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Message } from '@/types/helena'

function DateDivider({ date }: { date: Date }) {
  let label: string
  if (isToday(date)) label = 'Hoje'
  else if (isYesterday(date)) label = 'Ontem'
  else label = format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })

  return (
    <div className="flex items-center gap-3 my-3 px-4">
      <div className="flex-1 h-px bg-zinc-700" />
      <span className="text-[11px] text-zinc-500 bg-zinc-900 px-2 rounded-full">{label}</span>
      <div className="flex-1 h-px bg-zinc-700" />
    </div>
  )
}

function groupByDate(messages: Message[]): { date: string; messages: Message[] }[] {
  const groups: Record<string, Message[]> = {}
  for (const msg of messages) {
    const day = msg.createdAt.slice(0, 10)
    if (!groups[day]) groups[day] = []
    groups[day].push(msg)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, messages]) => ({ date, messages }))
}

interface Props {
  sessionId: string
}

export function MessageThread({ sessionId }: Props) {
  const { setReplyMessage } = useAppStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['messages', sessionId],
    queryFn: () => listMessages(sessionId),
    refetchInterval: 2000,
    staleTime: 1500,
    enabled: !!sessionId,
  })

  const messages = [...(data?.data ?? [])].reverse()
  const groups = groupByDate(messages)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.data?.length])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
        Nenhuma mensagem ainda
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1 px-4 py-2">
      {groups.map(({ date, messages: dayMsgs }) => (
        <div key={date}>
          <DateDivider date={new Date(date + 'T12:00:00')} />
          {dayMsgs.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onReply={setReplyMessage}
            />
          ))}
        </div>
      ))}
      <div ref={bottomRef} />
    </ScrollArea>
  )
}
