import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useDecisionsStore } from '@/stores/decisions.store'
import { IDEA_PHASE_LABELS, IDEA_PHASE_COLORS } from '@shared/constants'
import type { IdeaPhase } from '@shared/types'
import { cn } from '@/lib/utils'

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  exploring: 'bg-blue-100 text-blue-700',
  deciding: 'bg-amber-100 text-amber-700',
  decided: 'bg-emerald-100 text-emerald-700',
  revisiting: 'bg-purple-100 text-purple-700',
  superseded: 'bg-gray-200 text-gray-500'
}

export function DecisionList() {
  const navigate = useNavigate()
  const {
    decisions,
    isLoading,
    searchQuery,
    setSearchQuery,
    searchDecisions,
    fetchDecisions,
    createDecision,
    deleteDecision
  } = useDecisionsStore()

  useEffect(() => {
    fetchDecisions()
  }, [])

  const handleNewIdea = async () => {
    const idea = await createDecision({ phase: 'spark' } as Record<string, unknown>)
    navigate(`/ideas/${idea.id}`)
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    searchDecisions(value)
  }

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return iso
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h1 className="text-xl font-bold">Ideas</h1>
          <p className="text-sm text-muted-foreground">
            {decisions.length} idea{decisions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={handleNewIdea}>
          <Plus className="h-4 w-4" />
          New Idea
        </Button>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search ideas..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="flex-1">
        {decisions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            {isLoading ? (
              <p>Loading...</p>
            ) : (
              <>
                <p className="text-lg font-medium mb-1">No ideas yet</p>
                <p className="text-sm mb-4">Create your first idea to get started.</p>
                <Button onClick={handleNewIdea}>
                  <Plus className="h-4 w-4" />
                  New Idea
                </Button>
              </>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/50 sticky top-0">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-6 py-2 font-medium">Title</th>
                <th className="px-4 py-2 font-medium">Phase</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Quality</th>
                <th className="px-4 py-2 font-medium">Updated</th>
                <th className="px-4 py-2 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {decisions.map((d) => {
                const rawPhase = (d.phase as string) || 'spark'
                const phase = (rawPhase === 'structured' ? 'shaping' : rawPhase) as IdeaPhase
                return (
                  <tr
                    key={d.id}
                    onClick={() => navigate(`/ideas/${d.id}`)}
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-3">
                      <span className="font-medium text-sm">{d.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={cn('text-xs', IDEA_PHASE_COLORS[phase])}
                      >
                        {IDEA_PHASE_LABELS[phase]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={cn('text-xs', statusColors[d.status])}
                      >
                        {d.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {d.qualityScore != null ? (
                        <span
                          className={cn(
                            'text-xs font-medium',
                            d.qualityScore >= 0.7
                              ? 'text-emerald-600'
                              : d.qualityScore >= 0.4
                                ? 'text-amber-600'
                                : 'text-red-600'
                          )}
                        >
                          {Math.round(d.qualityScore * 100)}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(d.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('Delete this idea? This cannot be undone.')) {
                            deleteDecision(d.id)
                          }
                        }}
                        title="Delete idea"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </ScrollArea>
    </div>
  )
}
