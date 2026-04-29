'use client'

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { SKILLS_META as SKILLS } from '@/lib/skills-meta'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PlusIcon, MoreHorizontalIcon, Trash2Icon, XIcon, SearchIcon, PencilIcon, SparklesIcon, Loader2Icon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { useConversations } from '@/lib/useConversations'
import type { Conversation } from '@/lib/types'

type Store = ReturnType<typeof useConversations>

const SKILL_ICONS: Record<string, string> = {
  'flex-sizing': '⚖️',
  'usap': '🔒',
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function timeGroup(ts: number): string {
  const now = new Date()
  const date = new Date(ts)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)

  if (date >= today) return 'Today'
  if (date >= yesterday) return 'Yesterday'
  if (date >= weekAgo) return 'Previous 7 days'
  return 'Older'
}

function conversationSummary(conversation: Conversation): string | null {
  // Prefer LLM-generated summary, fall back to the first user message
  if (conversation.summary) return conversation.summary
  const firstUser = conversation.messages.find((m) => m.role === 'user')
  if (!firstUser) return null
  return firstUser.content.replace(/\s+/g, ' ').trim()
}

function ConversationItem({
  conversation,
  isActive,
  onClick,
  onDelete,
  onUpdate,
}: {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
  onDelete: () => void
  onUpdate: (patch: Partial<Conversation>) => void
}) {
  const summary = conversationSummary(conversation)
  const [editing, setEditing] = useState<'title' | 'summary' | null>(null)
  const [editValue, setEditValue] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus the input when editing starts
  useEffect(() => {
    if (editing === 'title') inputRef.current?.focus()
    if (editing === 'summary') textareaRef.current?.focus()
  }, [editing])

  const startEdit = useCallback((field: 'title' | 'summary') => {
    setEditing(field)
    setEditValue(field === 'title' ? conversation.title : (conversation.summary ?? summary ?? ''))
  }, [conversation.title, conversation.summary, summary])

  const commitEdit = useCallback(() => {
    if (!editing) return
    const trimmed = editValue.trim()
    if (trimmed) {
      onUpdate({ [editing]: trimmed })
    }
    setEditing(null)
  }, [editing, editValue, onUpdate])

  const cancelEdit = useCallback(() => {
    setEditing(null)
  }, [])

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') cancelEdit()
  }, [commitEdit, cancelEdit])

  const regenerate = useCallback(async () => {
    if (conversation.messages.length === 0) return
    setRegenerating(true)
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversation.messages.slice(0, 4) }),
      })
      const data = await res.json() as { title: string | null; summary: string | null }
      const patch: Partial<Conversation> = {}
      if (data.title) patch.title = data.title
      if (data.summary) patch.summary = data.summary
      if (Object.keys(patch).length > 0) onUpdate(patch)
    } catch { /* ignore */ }
    finally { setRegenerating(false) }
  }, [conversation.messages, onUpdate])

  return (
    <div
      className={cn(
        'group relative px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150',
        isActive
          ? 'bg-primary/10 text-foreground'
          : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
      )}
      onClick={editing ? undefined : onClick}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        {editing === 'title' ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={commitEdit}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 font-display text-[13px] font-semibold leading-snug bg-secondary/80 rounded px-1.5 py-0.5 outline-none border border-primary/40 text-foreground"
          />
        ) : (
          <p className={cn(
            'font-display text-[13px] font-semibold leading-snug truncate',
            isActive ? 'text-foreground' : 'text-foreground/90'
          )}>
            {conversation.title}
          </p>
        )}

        {!editing && (
          <DropdownMenu>
            <DropdownMenuTrigger
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded-md hover:bg-border/40 flex-shrink-0 -mt-0.5 -mr-1"
              aria-label="Conversation options"
            >
              <MoreHorizontalIcon className="w-3.5 h-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  startEdit('title')
                }}
              >
                <PencilIcon className="w-3.5 h-3.5 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  startEdit('summary')
                }}
              >
                <PencilIcon className="w-3.5 h-3.5 mr-2" />
                Edit summary
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  regenerate()
                }}
                disabled={regenerating || conversation.messages.length === 0}
              >
                {regenerating
                  ? <Loader2Icon className="w-3.5 h-3.5 mr-2 animate-spin" />
                  : <SparklesIcon className="w-3.5 h-3.5 mr-2" />
                }
                Regenerate with AI
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  onDelete()
                }}
              >
                <Trash2Icon className="w-3.5 h-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Summary */}
      {editing === 'summary' ? (
        <textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleEditKeyDown}
          onBlur={commitEdit}
          onClick={(e) => e.stopPropagation()}
          rows={2}
          className="w-full mt-1 text-[12px] leading-[1.5] bg-secondary/80 rounded px-1.5 py-1 outline-none border border-primary/40 text-foreground resize-none"
        />
      ) : summary ? (
        <p className={cn(
          'text-[12px] leading-[1.5] mt-0.5 line-clamp-2',
          isActive ? 'text-muted-foreground' : 'text-muted-foreground/50'
        )}>
          {summary}
        </p>
      ) : null}

      {/* Time + regenerating indicator */}
      <div className="flex items-center gap-1.5 mt-1">
        <p className="text-[11px] text-muted-foreground/40">
          {relativeTime(conversation.updatedAt)}
        </p>
        {regenerating && (
          <Loader2Icon className="w-2.5 h-2.5 text-primary/60 animate-spin" />
        )}
      </div>
    </div>
  )
}

export default function Sidebar({ store, onClose }: { store: Store; onClose: () => void }) {
  const [search, setSearch] = useState('')

  const filteredConversations = useMemo(() => {
    const q = search.toLowerCase().trim()
    const all = store.conversations.sort((a, b) => b.updatedAt - a.updatedAt)
    if (!q) return all
    return all.filter((c) =>
      c.title.toLowerCase().includes(q) ||
      SKILLS[c.skillId]?.name.toLowerCase().includes(q)
    )
  }, [store.conversations, search])

  const grouped = useMemo(() => {
    const groups: Record<string, Conversation[]> = {}
    for (const c of filteredConversations) {
      const group = timeGroup(c.updatedAt)
      if (!groups[group]) groups[group] = []
      groups[group].push(c)
    }
    return groups
  }, [filteredConversations])

  const groupOrder = ['Today', 'Yesterday', 'Previous 7 days', 'Older']
  const skills = Object.values(SKILLS)

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <Image src="/upsun-logo.svg" alt="Upsun" width={88} height={22} priority />
        <Button
          variant="ghost"
          size="icon-xs"
          className="lg:hidden text-muted-foreground"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <XIcon className="w-4 h-4" />
        </Button>
      </div>

      {/* New conversation buttons */}
      <div className="px-3 pb-2 space-y-1">
        {skills.map((skill) => (
          <button
            key={skill.id}
            onClick={() => store.createConversation(skill.id)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-display text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
          >
            <PlusIcon className="w-4 h-4 text-primary" />
            <span className="truncate">{skill.name}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Search conversations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-secondary/60 border-0 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:bg-secondary transition-colors"
          />
        </div>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        <div className="px-2 pb-3">
          {Object.keys(grouped).length === 0 ? (
            <p className="px-3 py-8 text-xs text-muted-foreground/40 text-center">
              {search ? 'No matches' : 'No conversations yet'}
            </p>
          ) : (
            groupOrder.map((group) => {
              const convos = grouped[group]
              if (!convos?.length) return null
              return (
                <div key={group} className="mt-3 first:mt-0">
                  <p className="px-3 py-1 font-display text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                    {group}
                  </p>
                  <div className="space-y-0.5">
                    {convos.map((conv) => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isActive={conv.id === store.activeId}
                        onClick={() => {
                          store.setActiveId(conv.id)
                          onClose()
                        }}
                        onDelete={() => store.deleteConversation(conv.id)}
                        onUpdate={(patch) => store.updateConversation(conv.id, patch)}
                      />
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
