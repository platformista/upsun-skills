'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Conversation, Message } from './types'

const STORAGE_KEY = 'upsun-conversations'
const ACTIVE_KEY = 'upsun-active-conversation'

function loadFromStorage(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveToStorage(conversations: Conversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
  } catch {
    // storage full or unavailable — silently ignore
  }
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveIdState] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage()
    setConversations(stored)
    const storedActive = localStorage.getItem(ACTIVE_KEY)
    if (storedActive && stored.find((c) => c.id === storedActive)) {
      setActiveIdState(storedActive)
    }
    setHydrated(true)
  }, [])

  // Persist whenever conversations change
  useEffect(() => {
    if (hydrated) saveToStorage(conversations)
  }, [conversations, hydrated])

  const setActiveId = useCallback((id: string | null) => {
    setActiveIdState(id)
    if (id) localStorage.setItem(ACTIVE_KEY, id)
    else localStorage.removeItem(ACTIVE_KEY)
  }, [])

  const createConversation = useCallback((skillId: string): Conversation => {
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      skillId,
      title: 'New conversation',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setConversations((prev) => [conversation, ...prev])
    setActiveId(conversation.id)
    return conversation
  }, [setActiveId])

  const updateConversation = useCallback((id: string, patch: Partial<Conversation>) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c))
    )
  }, [])

  const appendMessages = useCallback((id: string, messages: Message[]) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        const updated = { ...c, messages: [...c.messages, ...messages], updatedAt: Date.now() }
        // Auto-title from first assistant message
        if (c.title === 'New conversation') {
          const firstAssistant = updated.messages.find((m) => m.role === 'assistant')
          if (firstAssistant) {
            updated.title = firstAssistant.content.replace(/[#*`\n]/g, ' ').replace(/\s+/g, ' ').slice(0, 45).trim()
          }
        }
        return updated
      })
    )
  }, [])

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id))
    setActiveIdState((prev) => {
      const next = prev === id ? null : prev
      if (next === null) localStorage.removeItem(ACTIVE_KEY)
      return next
    })
  }, [])

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null

  return {
    conversations,
    activeId,
    activeConversation,
    hydrated,
    createConversation,
    updateConversation,
    appendMessages,
    deleteConversation,
    setActiveId,
  }
}
