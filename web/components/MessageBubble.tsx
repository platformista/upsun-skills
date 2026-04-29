'use client'

import { useMemo, useState, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import CodeBlock from './CodeBlock'
import TypingIndicator from './TypingIndicator'
import { CopyIcon, CheckIcon, FileTextIcon, ImageIcon } from 'lucide-react'
import { formatFileSize } from '@/lib/files'
import type { Message, Artefact, Attachment } from '@/lib/types'
import type { Components } from 'react-markdown'

type Props = {
  message: Message
  isStreaming?: boolean
  onOpenCanvas?: (artefact: Artefact) => void
}

function formatMessageTime(ts?: number): string | null {
  if (!ts) return null
  const d = new Date(ts)
  const now = new Date()
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())

  if (msgDay.getTime() === today.getTime()) return time
  if (msgDay.getTime() === today.getTime() - 86400000) return `Yesterday, ${time}`
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${time}`
}

function CopyMessageButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setCopied(false), 2000)
  }, [content])

  return (
    <button
      onClick={handleCopy}
      className="
        opacity-0 group-hover:opacity-100 focus:opacity-100
        transition-opacity duration-150
        p-1.5 rounded-lg
        text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/60
      "
      title="Copy message"
      aria-label="Copy message"
    >
      {copied
        ? <CheckIcon className="w-3.5 h-3.5 text-green-400" />
        : <CopyIcon className="w-3.5 h-3.5" />
      }
    </button>
  )
}

function UpsunAvatar() {
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm shadow-primary/20">
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" opacity="0.95" />
        <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
        <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
      </svg>
    </div>
  )
}

function UserAvatar() {
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary border border-border/60 flex items-center justify-center">
      <span className="text-[13px] font-semibold text-foreground/70">V</span>
    </div>
  )
}

function AttachmentChips({ attachments }: { attachments: Attachment[] }) {
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {attachments.map((att) => (
        <div
          key={att.id}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/60 border border-border/30 text-[12px] max-w-[240px]"
        >
          {att.kind === 'image' ? (
            att.content ? (
              <img
                src={att.content}
                alt={att.name}
                className="w-10 h-10 rounded object-cover flex-shrink-0"
              />
            ) : (
              <ImageIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )
          ) : (
            <FileTextIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
          <div className="min-w-0">
            <p className="truncate text-foreground/80 font-medium">{att.name}</p>
            <p className="text-muted-foreground/40 text-[10px]">{formatFileSize(att.size)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function MessageBubble({ message, isStreaming, onOpenCanvas }: Props) {
  const isUser = message.role === 'user'
  const timeStr = formatMessageTime(message.timestamp)

  const attachments = message.attachments

  const markdownComponents: Components = useMemo(() => ({
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '')
      const codeStr = String(children).replace(/\n$/, '')

      // Inline code — styled by .inline-code in globals.css
      if (!match) {
        return (
          <code className="inline-code" {...props}>
            {children}
          </code>
        )
      }

      // Fenced code block
      return (
        <CodeBlock
          code={codeStr}
          language={match[1]}
          onOpenCanvas={onOpenCanvas}
        />
      )
    },
  }), [onOpenCanvas])

  if (isUser) {
    return (
      <div className="message-appear flex gap-4 group">
        <UserAvatar />
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2 mb-2">
            <p className="font-display text-[13px] font-medium text-muted-foreground/70">You</p>
            {timeStr && <span className="text-[11px] text-muted-foreground/30">{timeStr}</span>}
            <CopyMessageButton content={message.content} />
          </div>
          {attachments && attachments.length > 0 && (
            <AttachmentChips attachments={attachments} />
          )}
          {message.content && (
            <div className="text-[15.5px] leading-[1.8] tracking-[-0.006em] whitespace-pre-wrap">
              {message.content}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Assistant message
  return (
    <div className="message-appear flex gap-4 group">
      <UpsunAvatar />
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2 mb-2">
          <p className="font-display text-[13px] font-medium text-muted-foreground/70">Upsun</p>
          {timeStr && <span className="text-[11px] text-muted-foreground/30">{timeStr}</span>}
          {!isStreaming && <CopyMessageButton content={message.content} />}
        </div>
        {isStreaming && message.content === '' ? (
          <TypingIndicator />
        ) : isStreaming ? (
          <div className="prose-chat">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
            <TypingIndicator />
          </div>
        ) : (
          <div className="prose-chat">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
