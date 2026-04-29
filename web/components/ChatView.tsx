'use client'

import { useState, useCallback, useRef } from 'react'
import { SKILLS_META as SKILLS } from '@/lib/skills-meta'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import type { Conversation, Artefact, Attachment } from '@/lib/types'
import type { useConversations } from '@/lib/useConversations'
import type { ProcessedFile } from '@/lib/files'

type Props = {
  conversation: Conversation
  store: ReturnType<typeof useConversations>
  onOpenCanvas: (artefact: Artefact) => void
}

const SKILL_ICONS: Record<string, string> = {
  'flex-sizing': '⚖️',
  'usap': '🔒',
}

export default function ChatView({ conversation, store, onOpenCanvas }: Props) {
  const [streamingContent, setStreamingContent] = useState<string | null>(null)
  const [canvasMode, setCanvasMode] = useState(false)
  const canvasModeRef = useRef(canvasMode)
  canvasModeRef.current = canvasMode

  const skill = SKILLS[conversation.skillId]

  const handleModelChange = useCallback((modelId: string) => {
    store.updateConversation(conversation.id, { modelId })
  }, [store, conversation.id])

  const handleSend = useCallback(async (text: string, files?: ProcessedFile[]) => {
    if (streamingContent !== null) return

    // Build attachments for persistence (thumbnails for images, content for text)
    const attachments: Attachment[] | undefined = files?.map((f) => f.attachment)

    // Ensure non-empty content — APIs reject empty user messages
    let content = text
    if (!content && attachments?.length) {
      content = attachments.map((a) => `[Attached: ${a.name}]`).join(' ')
    }

    const userMessage = {
      role: 'user' as const,
      content,
      timestamp: Date.now(),
      ...(attachments?.length ? { attachments } : {}),
    }
    const updatedMessages = [...conversation.messages, userMessage]

    store.appendMessages(conversation.id, [userMessage])
    setStreamingContent('')

    // Build the payload — include full image data URLs for the API (not persisted)
    const apiAttachments = files?.map((f) => ({
      name: f.attachment.name,
      kind: f.attachment.kind,
      mimeType: f.attachment.mimeType,
      content: f.attachment.kind === 'image'
        ? (f.fullDataUrl ?? f.attachment.content ?? '')
        : (f.attachment.content ?? ''),
    }))

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill: conversation.skillId,
          messages: updatedMessages,
          model: conversation.modelId,
          attachments: apiAttachments,
        }),
      })

      if (!response.ok || !response.body) {
        throw new Error(`Request failed (${response.status})`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setStreamingContent(accumulated)
      }

      store.appendMessages(conversation.id, [{ role: 'assistant', content: accumulated, timestamp: Date.now() }])

      // Generate a proper title + summary via LLM after the first exchange
      const isFirstExchange = conversation.messages.length === 0
      if (isFirstExchange && accumulated.length > 0) {
        const allMessages = [...updatedMessages, { role: 'assistant' as const, content: accumulated }]
        // Fire and forget — don't block the UI
        fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: allMessages }),
        })
          .then((r) => r.json())
          .then((data: { title: string | null; summary: string | null }) => {
            const patch: Record<string, string> = {}
            if (data.title) patch.title = data.title
            if (data.summary) patch.summary = data.summary
            if (Object.keys(patch).length > 0) {
              store.updateConversation(conversation.id, patch)
            }
          })
          .catch(() => { /* fallback title from appendMessages is fine */ })
      }

      // If canvas mode was on when the user sent, open the full response in canvas
      if (canvasModeRef.current && accumulated.length > 0) {
        onOpenCanvas({
          id: `response-${Date.now()}`,
          title: 'Response',
          language: 'markdown',
          content: accumulated,
        })
      }
    } catch (err) {
      console.error('Chat error:', err)
      store.appendMessages(conversation.id, [{
        role: 'assistant',
        content: '⚠️ Something went wrong. Please check your AI provider configuration and try again.',
        timestamp: Date.now(),
      }])
    } finally {
      setStreamingContent(null)
    }
  }, [conversation, store, streamingContent, onOpenCanvas])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Desktop header */}
      <div className="hidden lg:flex items-center gap-3 px-6 h-12 border-b border-border/40 bg-background flex-shrink-0">
        <span className="text-base">{SKILL_ICONS[conversation.skillId] ?? '🤖'}</span>
        <div className="min-w-0 flex items-baseline gap-2">
          <p className="font-display text-sm font-medium truncate">{conversation.title}</p>
          <span className="text-xs text-muted-foreground/50">·</span>
          <p className="text-xs text-muted-foreground/50 flex-shrink-0">{skill?.name}</p>
          {conversation.modelId && (
            <>
              <span className="text-xs text-muted-foreground/50">·</span>
              <p className="text-[11px] text-muted-foreground/40 font-mono flex-shrink-0">{conversation.modelId}</p>
            </>
          )}
        </div>
      </div>

      {/* Empty conversation state */}
      {conversation.messages.length === 0 && streamingContent === null ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center px-6 gap-4">
          <span className="text-5xl">{SKILL_ICONS[conversation.skillId] ?? '🤖'}</span>
          <div>
            <h2 className="font-display text-lg font-semibold">{skill?.name}</h2>
            <p className="text-muted-foreground text-sm max-w-sm mt-1">{skill?.description}</p>
          </div>
        </div>
      ) : (
        <MessageList
          messages={conversation.messages}
          streamingContent={streamingContent}
          onOpenCanvas={onOpenCanvas}
        />
      )}

      <ChatInput
        onSend={handleSend}
        disabled={streamingContent !== null}
        placeholder={skill?.placeholder ?? 'Type your message…'}
        canvasMode={canvasMode}
        onToggleCanvasMode={() => setCanvasMode((v) => !v)}
        modelId={conversation.modelId}
        onModelChange={handleModelChange}
        skillId={conversation.skillId}
      />
    </div>
  )
}
