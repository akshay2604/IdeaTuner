import { useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IdeaCanvas } from '@/components/ai/IdeaCanvas'
import { TunerChat } from '@/components/ai/TunerChat'
import { ThreadBar } from '@/components/ai/ThreadBar'
import { useDecisionsStore } from '@/stores/decisions.store'
import { useAIStore } from '@/stores/ai.store'
import type { IdeaPhase } from '@shared/types'

export function IdeaWorkspace() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { currentDecision, fetchDecision, updateDecision } =
    useDecisionsStore()
  const { loadLatestConversation, setMode, sendMessage, canvas } = useAIStore()

  const firstMessageSent = useRef(false)

  // Treat 'structured' as 'shaping' for legacy data
  const rawPhase = currentDecision?.phase as string
  const phase: IdeaPhase = rawPhase === 'structured' ? 'shaping' : (rawPhase as IdeaPhase || 'spark')

  useEffect(() => {
    if (id) {
      fetchDecision(id)
      loadLatestConversation(id)
      setMode('tuner')
      firstMessageSent.current = false
    }
  }, [id])

  // Auto-send the first message if coming from the Home page
  useEffect(() => {
    const state = location.state as { firstMessage?: string } | null
    if (state?.firstMessage && id && currentDecision && !firstMessageSent.current) {
      firstMessageSent.current = true
      sendMessage(id, state.firstMessage)
      // Clear the location state so it doesn't resend on re-render
      window.history.replaceState({}, '')
    }
  }, [currentDecision?.id, id])

  // Auto-transition: spark → shaping when canvas first has content
  useEffect(() => {
    if (phase === 'spark' && canvas && id) {
      const hasContent = !!(
        canvas.problem ||
        canvas.context ||
        canvas.options?.length > 0 ||
        canvas.assumptions?.length > 0 ||
        canvas.evidence?.length > 0 ||
        canvas.risks?.length > 0 ||
        canvas.stakeholders?.length > 0 ||
        canvas.tradeoffs?.length > 0
      )
      if (hasContent) {
        updateDecision(id, { phase: 'shaping' } as Record<string, unknown>)
      }
    }
  }, [canvas, phase, id])

  const handleDelete = async () => {
    if (!id) return
    if (confirm('Delete this idea? This cannot be undone.')) {
      await useDecisionsStore.getState().deleteDecision(id)
      navigate('/ideas')
    }
  }

  if (!currentDecision) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    )
  }

  const showCanvas = !!canvas && (
    !!(canvas.problem) ||
    !!(canvas.context) ||
    canvas.options?.length > 0 ||
    canvas.assumptions?.length > 0 ||
    canvas.evidence?.length > 0 ||
    canvas.risks?.length > 0 ||
    canvas.stakeholders?.length > 0 ||
    canvas.tradeoffs?.length > 0
  )

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate('/ideas')}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <span className="text-sm font-medium truncate">{currentDecision.title}</span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={handleDelete}
          title="Delete idea"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Thread tabs */}
      <ThreadBar decisionId={currentDecision.id} />

      {/* Content */}
      <div className="flex-1 flex min-h-0">
        <div className={showCanvas ? 'w-[60%] shrink-0' : 'w-full'}>
          <TunerChat decisionId={currentDecision.id} />
        </div>
        {showCanvas && (
          <div className="flex-1 border-l">
            <IdeaCanvas decisionId={currentDecision.id} />
          </div>
        )}
      </div>
    </div>
  )
}
