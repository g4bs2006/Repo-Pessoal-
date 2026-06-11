'use client'

import { ConversationSidebar } from '@/components/chat/ConversationSidebar'
import { MessageThread } from '@/components/chat/MessageThread'
import { MessageInput } from '@/components/chat/MessageInput'
import { ContactInfoPanel } from '@/components/chat/ContactInfoPanel'
import { ConversationHeader } from '@/components/chat/ConversationHeader'
import { useAppStore } from '@/lib/store/app'
import { MessageSquare } from 'lucide-react'

export default function AtendimentosPage() {
  const { activeConversation } = useAppStore()

  return (
    <div className="flex h-full">
      {/* Sidebar esquerda */}
      <ConversationSidebar />

      {/* Centro: conversa */}
      <div className="flex flex-col flex-1 min-w-0 bg-zinc-950 relative overflow-hidden">
        {activeConversation ? (
          <>
            <ConversationHeader />
            <div
              className="flex-1 overflow-hidden"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)`,
                backgroundSize: '24px 24px',
              }}
            >
              <MessageThread sessionId={activeConversation.id} />
            </div>
            <MessageInput sessionId={activeConversation.id} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-600">
            <div className="p-6 rounded-full bg-zinc-800/50">
              <MessageSquare className="h-12 w-12" />
            </div>
            <div className="text-center">
              <p className="text-base font-medium text-zinc-400">Selecione uma conversa</p>
              <p className="text-sm mt-1">Escolha um atendimento na lista ao lado para iniciar</p>
            </div>
          </div>
        )}
      </div>

      {/* Painel direito: info do contato */}
      <ContactInfoPanel />
    </div>
  )
}
