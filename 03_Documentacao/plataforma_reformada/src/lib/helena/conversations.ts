import { api } from './client'
import type { Conversation, Message, PaginatedResponse } from '@/types/helena'

export async function listConversations(params: {
  Status?: string[]
  PageNumber?: number
  PageSize?: number
  UserId?: string
  DepartmentId?: string
  IncludeDetails?: string[]
}): Promise<PaginatedResponse<Conversation>> {
  return api.get('chat/v2/session', {
    ...params,
    IncludeDetails: params.IncludeDetails ?? ['contact', 'channel', 'lastMessage', 'tags'],
  })
}

export async function getConversation(id: string): Promise<Conversation> {
  return api.get(`chat/v2/session/${id}`, {
    includeDetails: ['contact', 'channel', 'tags', 'user', 'department'],
  })
}

export async function listMessages(
  sessionId: string,
  params?: { PageNumber?: number; PageSize?: number }
): Promise<PaginatedResponse<Message>> {
  return api.get(`chat/v1/session/${sessionId}/message`, {
    PageSize: 50,
    OrderBy: 'createdAt',
    OrderDirection: 'DESCENDING',
    ...params,
  })
}

export async function sendMessage(
  sessionId: string,
  body: { text?: string; fileUrl?: string; fileId?: string; refId?: string }
): Promise<{ id: string }> {
  return api.post(`chat/v1/session/${sessionId}/message`, body)
}

export async function concludeConversation(sessionId: string): Promise<void> {
  return api.post(`chat/v1/session/${sessionId}/conclude`, {})
}

export async function transferConversation(
  sessionId: string,
  departmentId: string,
  userId?: string
): Promise<void> {
  return api.post(`chat/v1/session/${sessionId}/transfer`, { departmentId, userId })
}

export async function assignUser(sessionId: string, userId: string): Promise<void> {
  return api.post(`chat/v1/session/${sessionId}/user`, { userId })
}

export async function saveInternalNote(sessionId: string, text: string): Promise<void> {
  return api.post(`chat/v1/session/${sessionId}/note`, { text })
}
