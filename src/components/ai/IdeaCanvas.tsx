import {
  Target,
  FileText,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Search,
  Users,
  AlertTriangle,
  ArrowLeftRight,
  RefreshCw
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAIStore } from '@/stores/ai.store'
import { cn } from '@/lib/utils'
import { CANVAS_REGENERATE_PROMPT } from '@shared/constants'
import type { IdeaCanvas as IdeaCanvasType } from '@shared/types'

const STATUS_COLORS: Record<string, string> = {
  untested: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  validated: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400',
  invalidated: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400'
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-400',
  medium: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400'
}

function hasCanvasContent(canvas: IdeaCanvasType): boolean {
  return !!(
    canvas.problem ||
    canvas.context ||
    canvas.options?.length > 0 ||
    canvas.assumptions?.length > 0 ||
    canvas.evidence?.length > 0 ||
    canvas.risks?.length > 0 ||
    canvas.stakeholders?.length > 0 ||
    canvas.tradeoffs?.length > 0
  )
}

export function IdeaCanvas({ decisionId }: { decisionId: string }) {
  const canvas = useAIStore((s) => s.canvas)
  const isStreaming = useAIStore((s) => s.isStreaming)

  const handleRegenerate = () => {
    useAIStore.getState().sendMessage(decisionId, CANVAS_REGENERATE_PROMPT)
  }

  if (!canvas || !hasCanvasContent(canvas)) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6">
        <Lightbulb className="h-8 w-8 opacity-30 mb-3" />
        <p className="text-sm text-center">
          Structure will emerge as you explore your idea.
        </p>
        <p className="text-xs text-center mt-1 opacity-60">
          The AI builds a canvas from your conversation in real-time.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2.5 border-b border-border/50 shrink-0 flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Canvas</span>
        <button
          onClick={handleRegenerate}
          disabled={isStreaming}
          title="Regenerate canvas"
          className={cn(
            'p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
            isStreaming && 'opacity-40 cursor-not-allowed'
          )}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isStreaming && 'animate-spin')} />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Problem */}
          {canvas.problem && (
            <Section icon={Target} label="Problem" color="text-red-400">
              <Card>{canvas.problem}</Card>
            </Section>
          )}

          {/* Context */}
          {canvas.context && (
            <Section icon={FileText} label="Context" color="text-blue-400">
              <Card>{canvas.context}</Card>
            </Section>
          )}

          {/* Options */}
          {canvas.options?.length > 0 && (
            <Section icon={Lightbulb} label="Options" color="text-yellow-400">
              <div className="space-y-2">
                {canvas.options.map((opt) => (
                  <div
                    key={opt.id}
                    className="border border-dashed border-border/60 rounded-md p-2.5"
                  >
                    <p className="text-sm font-medium">{opt.content}</p>
                    {opt.pros.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {opt.pros.map((pro, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs text-green-400/80">
                            <ThumbsUp className="h-3 w-3 mt-0.5 shrink-0" />
                            <span>{pro}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {opt.cons.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {opt.cons.map((con, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs text-orange-400/80">
                            <ThumbsDown className="h-3 w-3 mt-0.5 shrink-0" />
                            <span>{con}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Assumptions */}
          {canvas.assumptions?.length > 0 && (
            <Section icon={HelpCircle} label="Assumptions" color="text-purple-400">
              <div className="space-y-1">
                {canvas.assumptions.map((a) => (
                  <div
                    key={a.id}
                    className="border border-dashed border-border/60 rounded-md px-2.5 py-1.5"
                  >
                    <div className="flex items-start gap-2">
                      <p className="text-sm flex-1">{a.content}</p>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full shrink-0', STATUS_COLORS[a.status])}>
                        {a.status}
                      </span>
                    </div>
                    {a.riskIfWrong && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Risk if wrong: {a.riskIfWrong}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Evidence */}
          {canvas.evidence?.length > 0 && (
            <Section icon={Search} label="Evidence" color="text-cyan-400">
              <div className="space-y-1">
                {canvas.evidence.map((e) => (
                  <div
                    key={e.id}
                    className="border border-dashed border-border/60 rounded-md px-2.5 py-1.5"
                  >
                    <p className="text-sm">{e.content}</p>
                    <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                      {e.type && <span>{e.type}</span>}
                      {e.confidence && <span>({e.confidence})</span>}
                      {e.direction && (
                        <span className={cn(
                          e.direction === 'supports' && 'text-green-400',
                          e.direction === 'contradicts' && 'text-red-400',
                          e.direction === 'neutral' && 'text-gray-400'
                        )}>
                          {e.direction}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Risks */}
          {canvas.risks?.length > 0 && (
            <Section icon={AlertTriangle} label="Risks" color="text-red-300">
              <div className="space-y-1">
                {canvas.risks.map((r) => (
                  <div
                    key={r.id}
                    className="border border-dashed border-border/60 rounded-md px-2.5 py-1.5"
                  >
                    <div className="flex items-start gap-2">
                      <p className="text-sm flex-1">{r.content}</p>
                      {r.severity && (
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full shrink-0', SEVERITY_COLORS[r.severity])}>
                          {r.severity}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Stakeholders */}
          {canvas.stakeholders?.length > 0 && (
            <Section icon={Users} label="Stakeholders" color="text-indigo-400">
              <div className="space-y-1">
                {canvas.stakeholders.map((s) => (
                  <Card key={s.id}>{s.content}</Card>
                ))}
              </div>
            </Section>
          )}

          {/* Tradeoffs */}
          {canvas.tradeoffs?.length > 0 && (
            <Section icon={ArrowLeftRight} label="Tradeoffs" color="text-amber-400">
              <div className="space-y-1">
                {canvas.tradeoffs.map((t) => (
                  <Card key={t.id}>{t.content}</Card>
                ))}
              </div>
            </Section>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function Section({
  icon: Icon,
  label,
  color,
  children
}: {
  icon: typeof Target
  label: string
  color: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Icon className={cn('h-3.5 w-3.5', color)} />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-border/60 rounded-md px-2.5 py-1.5">
      <p className="text-sm">{children}</p>
    </div>
  )
}
