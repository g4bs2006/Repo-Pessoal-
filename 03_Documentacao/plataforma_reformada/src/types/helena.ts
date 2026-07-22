export type ConversationStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type MessageType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'TEMPLATE' | 'STICKER'
export type MessageDirection = 'INBOUND' | 'OUTBOUND'

export interface Contact {
  id: string
  name: string
  phonenumber: string
  email?: string | null
  instagram?: string | null
  tags?: string[]
  metadata?: Record<string, unknown>
  createdAt?: string
}

export interface Channel {
  id: string
  key: string
  platform: string
  displayName: string
}

export interface Department {
  id: string
  name: string
}

export interface Agent {
  id: string
  name: string
  email?: string
  avatarUrl?: string | null
}

export interface MessageFile {
  publicUrl: string
  extension: string
  mimeType: string
  name: string
  size: number
}

export interface Message {
  id: string
  sessionId: string
  createdAt: string
  updatedAt?: string
  type: MessageType
  direction: MessageDirection
  text?: string | null
  fileId?: string | null
  file?: MessageFile | null
  refId?: string | null
  ref?: Message | null
  senderId?: string | null
  status?: string
}

export interface Conversation {
  id: string
  number?: string
  createdAt: string
  updatedAt?: string
  lastInteractionAt?: string
  activeAt?: string
  endAt?: string | null
  status: ConversationStatus
  contact?: Contact
  channel?: Channel
  department?: Department
  user?: Agent | null
  tags?: { id: string; name: string; color?: string }[]
  unreadCount?: number
  lastMessage?: Message | null
  metadata?: Record<string, unknown>
}

export interface PaginatedResponse<T> {
  data: T[]
  totalCount: number
  pageNumber: number
  pageSize: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface SendTextPayload {
  sessionId: string
  text: string
  refId?: string
}

export interface SendFilePayload {
  sessionId: string
  fileUrl?: string
  fileId?: string
  text?: string
  refId?: string
}

export type ConversationTab = 'PENDING' | 'IN_PROGRESS' | 'ALL'
