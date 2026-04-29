'use client'

import { useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import MessageBubble from './MessageBubble'
import type { Message, Artefact } from '@/lib/types'

type Props = {
  messages: Message[]
  streamingContent: string | null
  onOpenCanvas?: (artefact: Artefact) => void
}

export default function MessageList({ messages, streamingContent, onOpenCanvas }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-8">
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              message={msg}
              onOpenCanvas={onOpenCanvas}
            />
          ))}
          {streamingContent !== null && (
            <MessageBubble
              message={{ role: 'assistant', content: streamingContent }}
              isStreaming
              onOpenCanvas={onOpenCanvas}
            />
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </ScrollArea>
  )
}
