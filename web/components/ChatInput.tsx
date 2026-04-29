'use client'

import { useRef, useCallback, useState } from 'react'
import { ArrowUpIcon, Loader2Icon, PanelRightIcon, ShieldAlertIcon, PaperclipIcon, XIcon, FileTextIcon, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { processFile, formatFileSize, type ProcessedFile } from '@/lib/files'
import ModelSelector from './ModelSelector'

const DISCLAIMERS: Record<string, string> = {
  'flex-sizing':
    'Sizing estimates and cost projections are AI-generated approximations for informational purposes only. ' +
    'They do not constitute a quotation, offer, or contractual commitment by Upsun. ' +
    'Actual costs and resource requirements may vary. Consult your Upsun account team for binding terms.',
  'usap':
    'Security and compliance responses are AI-generated summaries derived from Upsun documentation. ' +
    'They do not constitute legal, regulatory, or professional advice and are not contractually binding. ' +
    'Verify all claims independently and consult qualified professionals before making compliance decisions.',
}

const DEFAULT_DISCLAIMER =
  'Responses are AI-generated for informational purposes only. ' +
  'They do not constitute professional advice and are not legally or contractually binding in any form.'

type Props = {
  onSend: (text: string, files?: ProcessedFile[]) => void
  disabled: boolean
  placeholder: string
  canvasMode: boolean
  onToggleCanvasMode: () => void
  modelId: string | undefined
  onModelChange: (modelId: string) => void
  skillId: string
}

export default function ChatInput({
  onSend, disabled, placeholder,
  canvasMode, onToggleCanvasMode,
  modelId, onModelChange,
  skillId,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFiles, setPendingFiles] = useState<ProcessedFile[]>([])
  const [fileError, setFileError] = useState<string | null>(null)

  const handleSend = useCallback(() => {
    const text = textareaRef.current?.value.trim()
    if ((!text && pendingFiles.length === 0) || disabled) return
    onSend(text || '', pendingFiles.length > 0 ? pendingFiles : undefined)
    if (textareaRef.current) {
      textareaRef.current.value = ''
      textareaRef.current.style.height = 'auto'
    }
    setPendingFiles([])
    setFileError(null)
  }, [onSend, disabled, pendingFiles])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setFileError(null)

    const results: ProcessedFile[] = []
    for (const file of Array.from(files)) {
      try {
        const processed = await processFile(file)
        results.push(processed)
      } catch (err) {
        setFileError(err instanceof Error ? err.message : 'Failed to process file')
      }
    }

    if (results.length > 0) {
      setPendingFiles((prev) => [...prev, ...results])
    }

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const removeFile = useCallback((id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.attachment.id !== id))
  }, [])

  const disclaimer = DISCLAIMERS[skillId] ?? DEFAULT_DISCLAIMER

  return (
    <div className="flex-shrink-0 px-4 pb-5 pt-2">
      <div className="max-w-3xl mx-auto">
        {/* Capsule */}
        <div className="
          relative rounded-[1.5rem] bg-card
          border border-border/40
          shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_2px_12px_rgba(0,0,0,0.35),0_1px_3px_rgba(0,0,0,0.2)]
          transition-all duration-300 ease-out
          focus-within:border-primary/40
          focus-within:shadow-[0_0_0_1px_rgba(96,70,255,0.1),0_2px_20px_rgba(0,0,0,0.4),0_0_24px_rgba(96,70,255,0.06)]
        ">
          {/* Attached files */}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-5 pt-4 pb-1">
              {pendingFiles.map((f) => (
                <div
                  key={f.attachment.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/80 border border-border/30 text-[12px] max-w-[220px]"
                >
                  {f.attachment.kind === 'image' ? (
                    f.attachment.content ? (
                      <img
                        src={f.attachment.content}
                        alt={f.attachment.name}
                        className="w-8 h-8 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )
                  ) : (
                    <FileTextIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-foreground/80">{f.attachment.name}</p>
                    <p className="text-muted-foreground/50 text-[10px]">{formatFileSize(f.attachment.size)}</p>
                  </div>
                  <button
                    onClick={() => removeFile(f.attachment.id)}
                    className="p-0.5 rounded hover:bg-border/40 text-muted-foreground/50 hover:text-foreground flex-shrink-0"
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {fileError && (
            <p className="px-5 pt-2 text-[12px] text-destructive">{fileError}</p>
          )}

          {/* Textarea area */}
          <div className="flex items-end gap-3 px-5 pt-4 pb-3">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder={pendingFiles.length > 0 ? 'Add a message about the attached files…' : placeholder}
              disabled={disabled}
              onKeyDown={handleKeyDown}
              onChange={handleInput}
              className="
                flex-1 resize-none bg-transparent p-0 border-0 outline-none
                text-[15.5px] leading-[1.7] tracking-[-0.006em]
                text-foreground
                placeholder:text-muted-foreground/40
                min-h-[26px] max-h-[200px]
                disabled:opacity-30
              "
            />
          </div>

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-1">
              {/* Attach button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                title="Attach files"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-display text-[12.5px] font-medium text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/50 transition-all duration-200 disabled:opacity-30"
              >
                <PaperclipIcon className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/gif,image/webp,.txt,.md,.csv,.json,.yaml,.yml,.xml,.toml,.html,.css,.js,.jsx,.ts,.tsx,.py,.rb,.go,.rs,.java,.php,.sh,.sql,.log,.diff,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Model selector + divider (selector returns null when AI_MODEL is fixed) */}
              <ModelSelector
                value={modelId}
                onChange={onModelChange}
                disabled={disabled}
              />

              {/* Canvas toggle */}
              <button
                onClick={onToggleCanvasMode}
                disabled={disabled}
                title={canvasMode ? 'Canvas output on — response will open in canvas' : 'Send to canvas'}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-display text-[12.5px] font-medium transition-all duration-200 disabled:opacity-30',
                  canvasMode
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary/50'
                )}
              >
                <PanelRightIcon className="w-3.5 h-3.5" />
                Canvas
              </button>
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={disabled}
              className="
                flex-shrink-0 w-9 h-9 rounded-full
                flex items-center justify-center
                bg-primary text-primary-foreground
                hover:bg-primary/85
                active:scale-[0.92]
                disabled:opacity-25 disabled:cursor-default
                transition-all duration-200 ease-out
                shadow-sm shadow-primary/25
              "
            >
              {disabled
                ? <Loader2Icon className="w-[18px] h-[18px] animate-spin" />
                : <ArrowUpIcon className="w-[18px] h-[18px]" />
              }
            </button>
          </div>
        </div>

        {/* Legal disclaimer */}
        <div className="flex flex-col items-center mt-3 px-1 gap-1.5">
          <p className="text-[11.5px] leading-[1.6] text-accent/50 text-center">
            {disclaimer}
          </p>
          <ShieldAlertIcon className="w-3.5 h-3.5 text-accent/50" />
        </div>
      </div>
    </div>
  )
}
