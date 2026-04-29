'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDownIcon, SparklesIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ModelInfo } from '@/lib/types'

type Props = {
  value: string | undefined
  onChange: (modelId: string) => void
  disabled?: boolean
}

// Group models by provider prefix for a cleaner list
function providerLabel(model: ModelInfo): string {
  const id = model.id.toLowerCase()
  if (id.startsWith('claude') || model.owned_by === 'anthropic') return 'Anthropic'
  if (id.startsWith('gpt') || id.startsWith('o1') || id.startsWith('o3') || id.startsWith('o4') || model.owned_by === 'openai') return 'OpenAI'
  if (id.startsWith('gemini') || model.owned_by === 'google') return 'Google'
  return 'Other'
}

function shortName(id: string): string {
  return id.replace(/^models\//, '')
}

type ModelsResponse = {
  models: ModelInfo[]
  fixedModel: string | null
}

export default function ModelSelector({ value, onChange, disabled }: Props) {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [fixedModel, setFixedModel] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch models on mount
  useEffect(() => {
    fetch('/api/models')
      .then((r) => r.json())
      .then((data: ModelsResponse) => {
        setModels(data.models ?? [])
        setFixedModel(data.fixedModel ?? null)
      })
      .catch(() => {
        setModels([])
        setFixedModel(null)
      })
      .finally(() => setLoading(false))
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSelect = useCallback((id: string) => {
    onChange(id)
    setOpen(false)
  }, [onChange])

  // If still loading, show a subtle placeholder
  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12.5px] text-muted-foreground/40">
        <SparklesIcon className="w-3.5 h-3.5 animate-pulse" />
        <span>Loading…</span>
      </div>
    )
  }

  // Fixed model: don't render the selector at all
  if (fixedModel) return null

  // No models available and no fixed model: nothing to show
  if (models.length === 0) return null

  // Group models
  const grouped = models.reduce<Record<string, ModelInfo[]>>((acc, m) => {
    const group = providerLabel(m)
    if (!acc[group]) acc[group] = []
    acc[group].push(m)
    return acc
  }, {})

  const groupOrder = ['Anthropic', 'OpenAI', 'Google', 'Other']
  const displayValue = value ? shortName(value) : 'Select model'

  return (
    <div ref={containerRef} className="relative flex items-center gap-1">
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-display text-[12.5px] font-medium transition-all duration-200 max-w-[200px] disabled:opacity-30',
          open
            ? 'bg-secondary text-foreground'
            : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-secondary/50'
        )}
      >
        <SparklesIcon className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate">{displayValue}</span>
        <ChevronDownIcon className={cn('w-3 h-3 flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-72 max-h-80 overflow-y-auto rounded-xl border border-border/50 bg-card shadow-xl shadow-black/30 z-50">
          <div className="py-1.5">
            {groupOrder.map((group) => {
              const items = grouped[group]
              if (!items?.length) return null
              return (
                <div key={group}>
                  <p className="px-3 pt-2.5 pb-1 text-[11px] font-medium text-muted-foreground/40 uppercase tracking-wider">
                    {group}
                  </p>
                  {items.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleSelect(m.id)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-[13px] transition-colors',
                        m.id === value
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground/80 hover:bg-secondary/60'
                      )}
                    >
                      <span className="font-mono">{shortName(m.id)}</span>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Divider — only renders when the selector is visible */}
      <div className="w-px h-4 bg-border/30 mx-1" />
    </div>
  )
}
