'use client'

import { cn } from '@/lib/utils'
import type { Message } from '@/types/helena'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Check, CheckCheck, Reply, FileText, Download } from 'lucide-react'
import { useState } from 'react'

interface Props {
  message: Message
  onReply?: (msg: Message) => void
}

function MessageTime({ dateStr }: { dateStr: string }) {
  try {
    return (
      <span className="text-[10px] opacity-60 ml-1 shrink-0">
        {format(new Date(dateStr), 'HH:mm', { locale: ptBR })}
      </span>
    )
  } catch {
    return null
  }
}

function StatusIcon({ status }: { status?: string }) {
  if (!status) return null
  if (status === 'READ') return <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
  if (status === 'DELIVERED') return <CheckCheck className="h-3.5 w-3.5 opacity-50" />
  return <Check className="h-3.5 w-3.5 opacity-50" />
}

function AudioPlayer({ url }: { url: string }) {
  return (
    <audio controls className="h-10 max-w-[220px]" preload="metadata">
      <source src={url} />
    </audio>
  )
}

function ImagePreview({ url, name }: { url: string; name?: string }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div>
      <img
        src={url}
        alt={name ?? 'imagem'}
        className="rounded-lg max-w-[220px] max-h-[220px] object-cover cursor-pointer"
        onClick={() => setExpanded(true)}
      />
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setExpanded(false)}
        >
          <img src={url} alt={name} className="max-w-[90vw] max-h-[90vh] rounded-lg" />
        </div>
      )}
    </div>
  )
}

function VideoPreview({ url }: { url: string }) {
  return (
    <video controls className="rounded-lg max-w-[220px] max-h-[220px]" preload="metadata">
      <source src={url} />
    </video>
  )
}

function DocumentPreview({ url, name }: { url: string; name?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2 hover:bg-black/30 transition-colors"
    >
      <FileText className="h-8 w-8 text-zinc-300 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-medium truncate max-w-[160px]">{name ?? 'Documento'}</p>
        <p className="text-xs opacity-60">Clique para abrir</p>
      </div>
      <Download className="h-4 w-4 shrink-0 opacity-60" />
    </a>
  )
}

function QuotePreview({ msg }: { msg: Message }) {
  const text = msg.text ?? (msg.type === 'IMAGE' ? '📷 Imagem' : msg.type === 'AUDIO' ? '🎵 Áudio' : '📄 Arquivo')
  return (
    <div className="border-l-2 border-emerald-400 pl-2 mb-1.5 opacity-80">
      <p className="text-[11px] font-semibold text-emerald-400">
        {msg.direction === 'OUTBOUND' ? 'Você' : 'Cliente'}
      </p>
      <p className="text-xs truncate">{text}</p>
    </div>
  )
}

function MessageContent({ message }: { message: Message }) {
  const file = message.file

  if (message.type === 'AUDIO' && file?.publicUrl) {
    return <AudioPlayer url={file.publicUrl} />
  }
  if (message.type === 'IMAGE' && file?.publicUrl) {
    return <ImagePreview url={file.publicUrl} name={file.name} />
  }
  if (message.type === 'VIDEO' && file?.publicUrl) {
    return <VideoPreview url={file.publicUrl} />
  }
  if (message.type === 'DOCUMENT' && file?.publicUrl) {
    return <DocumentPreview url={file.publicUrl} name={file.name} />
  }
  if (message.text) {
    return (
      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>
    )
  }
  return <p className="text-xs opacity-50 italic">Mensagem não suportada</p>
}

export function MessageBubble({ message, onReply }: Props) {
  const isOutbound = message.direction === 'OUTBOUND'
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={cn('flex mb-1', isOutbound ? 'justify-end' : 'justify-start')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={cn('flex items-end gap-1.5 max-w-[75%]', isOutbound && 'flex-row-reverse')}>
        {/* Botão reply (aparece no hover) */}
        {onReply && hovered && (
          <button
            onClick={() => onReply(message)}
            className="p-1.5 rounded-full bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-all mb-1"
            title="Responder"
          >
            <Reply className="h-3.5 w-3.5" />
          </button>
        )}

        <div
          className={cn(
            'px-3 py-2 rounded-2xl shadow-sm',
            isOutbound
              ? 'bg-emerald-700 text-white rounded-br-sm'
              : 'bg-zinc-700 text-zinc-100 rounded-bl-sm'
          )}
        >
          {/* Quote */}
          {message.ref && <QuotePreview msg={message.ref} />}

          <MessageContent message={message} />

          {/* Rodapé da bolha: hora + status */}
          <div className={cn('flex items-center gap-1 mt-0.5', isOutbound ? 'justify-end' : 'justify-start')}>
            <MessageTime dateStr={message.createdAt} />
            {isOutbound && <StatusIcon status={message.status} />}
          </div>
        </div>
      </div>
    </div>
  )
}
