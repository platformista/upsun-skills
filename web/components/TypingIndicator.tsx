export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground/60" style={{ animationDelay: '0ms' }} />
      <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground/60" style={{ animationDelay: '160ms' }} />
      <span className="typing-dot w-2 h-2 rounded-full bg-muted-foreground/60" style={{ animationDelay: '320ms' }} />
    </div>
  )
}
