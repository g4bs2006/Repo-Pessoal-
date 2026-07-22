import { create } from 'zustand'
import type { Conversation, Message } from '@/types/helena'

interface AppStore {
  activeConversationId: string | null
  activeConversation: Conversation | null
  replyMessage: Message | null

  setActiveConversation: (conv: Conversation | null) => void
  setReplyMessage: (msg: Message | null) => void
  clearReply: () => void
}

export const useAppStore = create<AppStore>((set) => ({
  activeConversationId: null,
  activeConversation: null,
  replyMessage: null,

  setActiveConversation: (conv) =>
    set({ activeConversation: conv, activeConversationId: conv?.id ?? null }),

  setReplyMessage: (msg) => set({ replyMessage: msg }),

  clearReply: () => set({ replyMessage: null }),
}))
