import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home,
  Lightbulb,
  Settings,
  Plus,
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useDecisionsStore } from '@/stores/decisions.store'
import { IDEA_PHASE_LABELS, IDEA_PHASE_COLORS } from '@shared/constants'
import type { IdeaPhase } from '@shared/types'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { decisions, searchQuery, setSearchQuery, searchDecisions, createDecision } =
    useDecisionsStore()

  const handleNewIdea = async () => {
    const idea = await createDecision({ phase: 'spark' } as Record<string, unknown>)
    navigate(`/ideas/${idea.id}`)
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    searchDecisions(value)
  }

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/ideas', icon: Lightbulb, label: 'Ideas' },
    { path: '/settings', icon: Settings, label: 'Settings' }
  ]

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      {/* Navigation */}
      <div className="p-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
              location.pathname === item.path
                ? 'bg-sidebar-accent text-foreground font-medium'
                : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>

      <Separator />

      {/* Quick create + search */}
      <div className="p-3 space-y-2">
        <Button onClick={handleNewIdea} className="w-full" size="sm">
          <Plus className="h-4 w-4" />
          New Idea
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      <Separator />

      {/* Recent ideas */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Recent Ideas
          </p>
          {decisions.length === 0 ? (
            <p className="px-2 py-4 text-xs text-muted-foreground text-center">
              No ideas yet
            </p>
          ) : (
            <div className="space-y-0.5 mt-1">
              {decisions.slice(0, 20).map((decision) => {
                const rawPhase = (decision.phase as string) || 'spark'
                const phase = (rawPhase === 'structured' ? 'shaping' : rawPhase) as IdeaPhase
                return (
                  <button
                    key={decision.id}
                    onClick={() => navigate(`/ideas/${decision.id}`)}
                    className={cn(
                      'w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors',
                      location.pathname === `/ideas/${decision.id}`
                        ? 'bg-sidebar-accent font-medium'
                        : 'hover:bg-sidebar-accent'
                    )}
                  >
                    <div className="truncate text-sm">{decision.title}</div>
                    <Badge
                      variant="secondary"
                      className={cn('mt-0.5 text-[10px] h-4', IDEA_PHASE_COLORS[phase])}
                    >
                      {IDEA_PHASE_LABELS[phase]}
                    </Badge>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
