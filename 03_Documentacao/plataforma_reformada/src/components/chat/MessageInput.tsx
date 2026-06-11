'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sendMessage } from '@/lib/helena/conversations'
import { useAppStore } from '@/lib/store/app'
import { cn } from '@/lib/utils'
import { Send, Paperclip, X, Reply } from 'lucide-react'
import type { Message } from '@/types/helena'

interface Props {
  sessionId: string
}

function ReplyPreview({ message, onCancel }: { message: Message; onCancel: () => void }) {
  const text =
    message.text ??
    (message.type === 'IMAGE' ? '📷 Imagem' : message.type === 'AUDIO' ? '🎵 Áudio' : '📄 Arquivo')

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border-t border-zinc-700">
      <Reply className="h-4 w-4 text-emerald-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-emerald-400">
          {message.direction === 'OUTBOUND' ? 'Você' : 'Cliente'}
        </p>
        <p className="text-xs text-zinc-400 truncate">{text}</p>
      </div>
      <button
        onClick={onCancel}
        className="p-1 hover:bg-zinc-700 rounded-full text-zinc-400 shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function MessageInput({ sessionId }: Props) {
  const [text, setText] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [showFileInput, setShowFileInput] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { replyMessage, clearReply } = useAppStore()
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: { text?: string; fileUrl?: string; refId?: string }) =>
      sendMessage(sessionId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', sessionId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  function handleSend() {
    const trimmed = text.trim()
    const url = fileUrl.trim()
    if (!trimmed && !url) return

    mutate({
      text: trimmed || undefined,
      fileUrl: url || undefined,
      refId: replyMessage?.id,
    })

    setText('')
    setFileUrl('')
    setShowFileInput(false)
    clearReply()
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }

  return (
    <div className="border-t border-zinc-800 bg-zinc-900">
      {replyMessage && (
        <ReplyPreview message={replyMessage} onCancel={clearReply} />
      )}

      {showFileInput && (
        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border-t border-zinc-700">
          <input
            type="text"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            placeholder="Cole a URL do arquivo..."
            className="flex-1 text-sm bg-transparent text-white placeholder:text-zinc-500 outline-none"
          />
          <button
            onClick={() => { setShowFileInput(false); setFileUrl('') }}
            className="text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2 px-3 py-3">
        {/* Botão de anexo */}
        <button
          onClick={() => setShowFileInput((v) => !v)}
          className={cn(
            'p-2 rounded-full transition-colors shrink-0 mb-0.5',
            showFileInput
              ? 'bg-emerald-700 text-white'
              : 'text-zinc-400 hover:bg-zinc-700 hover:text-white'
          )}
          title="Enviar arquivo (URL)"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => { setText(e.target.value); autoResize() }}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem..."
          rows={1}
          className="flex-1 resize-none bg-zinc-800 rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none border border-zinc-700 focus:border-emerald-600 transition-colors leading-relaxed"
          style={{ minHeight: '42px', maxHeight: '140px' }}
        />

        {/* Botão enviar */}
        <button
          onClick={handleSend}
          disabled={isPending || (!text.trim() && !fileUrl.trim())}
          className={cn(
            'p-2.5 rounded-full transition-all shrink-0 mb-0.5',
            text.trim() || fileUrl.trim()
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
              : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
          )}
          title="Enviar (Enter)"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      <p className="text-center text-[10px] text-zinc-600 pb-2">
        Enter para enviar · Shift+Enter para nova linha
      </p>
    </div>
  )
}
