'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { highlightCode } from '@/lib/shiki'
import { XIcon, CopyIcon, CheckIcon, MaximizeIcon, MinimizeIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Artefact } from '@/lib/types'

type Props = {
  artefact: Artefact
  onClose: () => void
}

function CodeCanvas({ artefact }: { artefact: Artefact }) {
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setHtml(null)
    highlightCode(artefact.content, artefact.language).then((result) => {
      if (!cancelled) setHtml(result)
    })
    return () => { cancelled = true }
  }, [artefact.content, artefact.language])

  const lines = artefact.content.split('\n')

  return (
    <div className="flex min-h-full">
      {/* Line numbers */}
      <div className="flex-shrink-0 py-4 pl-4 pr-2 select-none text-right">
        {lines.map((_, i) => (
          <div key={i} className="text-[13px] leading-[1.75] text-muted-foreground/30 font-mono">
            {i + 1}
          </div>
        ))}
      </div>

      {/* Code */}
      <div className="flex-1 py-4 pr-4 overflow-x-auto">
        {html ? (
          <div
            className="shiki-output font-mono [&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:!m-0 [&_code]:!text-[13px] [&_code]:!leading-[1.75] [&_code]:!font-[inherit]"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre className="!bg-transparent !p-0 !m-0">
            <code className="text-[13px] leading-[1.75] text-foreground/80 font-mono whitespace-pre">
              {artefact.content}
            </code>
          </pre>
        )}
      </div>
    </div>
  )
}

function MarkdownCanvas({ artefact }: { artefact: Artefact }) {
  return (
    <div className="px-6 py-6">
      <div className="prose-chat max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {artefact.content}
        </ReactMarkdown>
      </div>
    </div>
  )
}

export default function Canvas({ artefact, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const isMarkdown = artefact.language === 'markdown' || artefact.language === 'md'
  const lines = artefact.content.split('\n')

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(artefact.content)
    setCopied(true)
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setCopied(false), 2000)
  }, [artefact.content])

  return (
    <div className={`
      flex flex-col h-full border-l border-border/40
      ${isMarkdown ? 'bg-background' : 'bg-[#0d1117]'}
      ${expanded ? 'fixed inset-0 z-50 border-l-0' : ''}
    `}>
      {/* Header */}
      <div className={`
        flex items-center justify-between px-4 py-3 border-b border-border/40 flex-shrink-0
        ${isMarkdown ? 'bg-card' : 'bg-[#161b22]'}
      `}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-primary/80 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{artefact.title}</p>
            <p className="text-[11px] text-muted-foreground/50">
              {isMarkdown ? `${lines.length} lines` : `${artefact.language} · ${lines.length} lines`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleCopy}
            className="text-muted-foreground/60 hover:text-foreground"
            title="Copy contents"
          >
            {copied
              ? <CheckIcon className="w-3.5 h-3.5 text-green-400" />
              : <CopyIcon className="w-3.5 h-3.5" />
            }
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground/60 hover:text-foreground"
            title={expanded ? 'Exit full screen' : 'Full screen'}
          >
            {expanded
              ? <MinimizeIcon className="w-3.5 h-3.5" />
              : <MaximizeIcon className="w-3.5 h-3.5" />
            }
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            className="text-muted-foreground/60 hover:text-foreground"
            title="Close canvas"
          >
            <XIcon className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {isMarkdown
          ? <MarkdownCanvas artefact={artefact} />
          : <CodeCanvas artefact={artefact} />
        }
      </div>
    </div>
  )
}
