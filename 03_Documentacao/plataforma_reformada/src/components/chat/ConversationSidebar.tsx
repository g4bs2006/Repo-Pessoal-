'use client'

import { useQuery } from '@tanstack/react-query'
import { listConversations } from '@/lib/helena/conversations'
import { useAppStore } from '@/lib/store/app'
import { ConversationItem } from './ConversationItem'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, MessageSquare, RefreshCw } from 'lucide-react'
import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { ConversationTab } from '@/types/helena'

const TABS: { label: string; value: ConversationTab; statusFilter: string[] }[] = [
  { label: 'Novos', value: 'PENDING', statusFilter: ['PENDING'] },
  { label: 'Em Atendimento', value: 'IN_PROGRESS', statusFilter: ['IN_PROGRESS'] },
  { label: 'Todos', value: 'ALL', statusFilter: [] },
]

export function ConversationSidebar() {
  const [tab, setTab] = useState<ConversationTab>('PENDING')
  const [search, setSearch] = useState('')
  const { activeConversationId, setActiveConversation } = useAppStore()

  const currentTab = TABS.find((t) => t.value === tab)!

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['conversations', tab],
    queryFn: () =>
      listConversations({
        Status: currentTab.statusFilter.length ? currentTab.statusFilter : undefined,
        PageSize: 50,
      }),
    refetchInterval: 5000,
    staleTime: 4000,
  })

  const conversations = useMemo(() => {
    const all = data?.data ?? []
    if (!search.trim()) return all
    const q = search.toLowerCase()
    return all.filter((c) => {
      const name = c.contact?.name ?? c.contact?.phonenumber ?? ''
      const lastText = c.lastMessage?.text ?? ''
      return name.toLowerCase().includes(q) || lastText.toLowerCase().includes(q)
    })
  }, [data, search])

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800 w-[340px] shrink-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-emerald-400" />
            <h1 className="text-base font-bold text-white">Atendimentos</h1>
          </div>
          <button
            onClick={() => refetch()}
            className={cn(
              'p-1.5 rounded-full hover:bg-zinc-700 text-zinc-400 transition-all',
              isFetching && 'animate-spin text-emerald-400'
            )}
            title="Atualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversa..."
            className="pl-9 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 text-sm h-9"
          />
        </div>
      </div>

      {/* Abas */}
      <div className="flex border-b border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'flex-1 text-xs font-medium py-2.5 transition-colors',
              tab === t.value
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            {t.label}
            {t.value === 'PENDING' && (data?.data?.filter(c => c.status === 'PENDING').length ?? 0) > 0 && (
              <span className="ml-1.5 text-[10px] bg-emerald-500 text-white rounded-full px-1.5 py-0.5">
                {data?.data?.filter(c => c.status === 'PENDING').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex flex-col gap-1 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3 animate-pulse">
                <div className="h-11 w-11 rounded-full bg-zinc-700 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-zinc-700 rounded w-2/3" />
                  <div className="h-2.5 bg-zinc-700 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-zinc-500 text-sm">
            <MessageSquare className="h-8 w-8 mb-2 opacity-30" />
            <p>Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={activeConversationId === conv.id}
                onClick={() => setActiveConversation(conv)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
