import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useDecisionsStore } from '@/stores/decisions.store'
import { IDEA_PHASE_LABELS, IDEA_PHASE_COLORS } from '@shared/constants'
import type { IdeaPhase } from '@shared/types'
import { cn } from '@/lib/utils'

export function Dashboard() {
  const navigate = useNavigate()
  const { decisions, fetchDecisions, createDecision } = useDecisionsStore()
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchDecisions()
  }, [])

  const handleCreateIdea = async () => {
    const msg = input.trim()
    if (!msg) return
    setInput('')
    const idea = await createDecision({
      title: msg.length > 60 ? msg.slice(0, 60) + '...' : msg,
      rawIdea: msg,
      phase: 'spark'
    } as Record<string, unknown>)
    navigate(`/ideas/${idea.id}`, { state: { firstMessage: msg } })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleCreateIdea()
    }
  }

  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [])

  useEffect(() => {
    autoResize()
  }, [input, autoResize])

  const recentIdeas = [...decisions]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8)

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto px-6 pt-24 pb-12 space-y-12">
        {/* Hero input */}
        <div className="space-y-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-ai-accent" />
            <h1 className="text-2xl font-bold">IdeaTuner</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            What are you thinking about?
          </p>
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your idea, question, or challenge..."
              className="w-full resize-none rounded-lg border-2 border-border bg-transparent px-4 py-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent"
              rows={3}
              style={{ maxHeight: 120 }}
            />
            <Button
              size="icon"
              className="absolute right-2 bottom-2"
              onClick={handleCreateIdea}
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Press Enter to start a conversation with your Tuner
          </p>
        </div>

        {/* Recent ideas */}
        {recentIdeas.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Recent Ideas</h2>
            <div className="grid grid-cols-2 gap-2">
              {recentIdeas.map((d) => {
                const rawPhase = (d.phase as string) || 'spark'
                const phase = (rawPhase === 'structured' ? 'shaping' : rawPhase) as IdeaPhase
                return (
                  <button
                    key={d.id}
                    onClick={() => navigate(`/ideas/${d.id}`)}
                    className="text-left border rounded-lg px-4 py-3 hover:bg-muted/30 transition-colors space-y-1.5"
                  >
                    <p className="font-medium text-sm truncate">{d.title}</p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn('text-[10px] h-4', IDEA_PHASE_COLORS[phase])}
                      >
                        {IDEA_PHASE_LABELS[phase]}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelative(d.updatedAt)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Stats summary (small, demoted) */}
        {decisions.length > 0 && (
          <div className="text-center text-xs text-muted-foreground">
            {decisions.length} idea{decisions.length !== 1 ? 's' : ''} total
          </div>
        )}
      </div>
    </div>
  )
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
