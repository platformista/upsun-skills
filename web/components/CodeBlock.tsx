'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { highlightCode } from '@/lib/shiki'
import { CheckIcon, CopyIcon, PanelRightOpenIcon } from 'lucide-react'
import type { Artefact } from '@/lib/types'

type Props = {
  code: string
  language: string
  onOpenCanvas?: (artefact: Artefact) => void
}

export default function CodeBlock({ code, language, onOpenCanvas }: Props) {
  const [html, setHtml] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    let cancelled = false
    highlightCode(code, language).then((result) => {
      if (!cancelled) setHtml(result)
    })
    return () => { cancelled = true }
  }, [code, language])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setCopied(false), 2000)
  }, [code])

  const handleCanvas = useCallback(() => {
    onOpenCanvas?.({
      id: `code-${Date.now()}`,
      title: language ? `${language} snippet` : 'Code snippet',
      language,
      content: code,
    })
  }, [code, language, onOpenCanvas])

  return (
    <div className="code-block-wrapper group/code relative my-4 rounded-xl overflow-hidden border border-border/60 bg-[#0d1117]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-white/[0.04]">
        <span className="text-[11.5px] text-muted-foreground/60 font-mono uppercase tracking-wider">
          {language || 'code'}
        </span>
        <div className="flex items-center gap-0.5">
          {onOpenCanvas && (
            <button
              onClick={handleCanvas}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-mono text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.06] transition-colors"
              title="Open in canvas"
            >
              <PanelRightOpenIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Canvas</span>
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-mono text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.06] transition-colors"
            title="Copy code"
          >
            {copied ? (
              <>
                <CheckIcon className="w-3.5 h-3.5 text-green-400" />
                <span className="hidden sm:inline text-green-400">Copied</span>
              </>
            ) : (
              <>
                <CopyIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code body */}
      <div className="overflow-x-auto px-5 py-4">
        {html ? (
          <div
            className="shiki-output font-mono [&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:!m-0 [&_code]:!text-[13px] [&_code]:!leading-[1.75] [&_code]:!font-[inherit]"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre className="!bg-transparent !p-0 !m-0">
            <code className="text-[13px] leading-[1.75] text-foreground/80 font-mono">
              {code}
            </code>
          </pre>
        )}
      </div>
    </div>
  )
}
