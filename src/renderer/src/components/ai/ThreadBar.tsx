import { useState, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useAIStore } from '@/stores/ai.store'

interface ThreadBarProps {
  decisionId: string
}

export function ThreadBar({ decisionId }: ThreadBarProps) {
  const { threads, conversationId, isStreaming, switchThread, createThread, sendMessage } =
    useAIStore()
  const [isCreating, setIsCreating] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isCreating])

  if (threads.length === 0) return null

  const handleCreate = async () => {
    const label = newLabel.trim()
    if (!label) return

    setIsCreating(false)
    setNewLabel('')

    const convId = await createThread(decisionId, label)
    // Send the label as the first message in the new thread
    await sendMessage(decisionId, label)
    // convId is already set as active by createThread
    void convId
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCreate()
    } else if (e.key === 'Escape') {
      setIsCreating(false)
      setNewLabel('')
    }
  }

  return (
    <div className="flex items-center gap-1 px-4 py-1.5 border-b bg-muted/30 overflow-x-auto">
      {threads.map((thread) => {
        const isActive = thread.id === conversationId
        const label = thread.label || 'Main'

        return (
          <button
            key={thread.id}
            onClick={() => !isActive && !isStreaming && switchThread(thread.id)}
            disabled={isStreaming}
            className={`shrink-0 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            } ${isStreaming ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {label}
          </button>
        )
      })}

      {isCreating ? (
        <input
          ref={inputRef}
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (!newLabel.trim()) {
              setIsCreating(false)
              setNewLabel('')
            }
          }}
          placeholder="What if..."
          className="shrink-0 w-48 px-2 py-1 text-xs rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          disabled={isStreaming}
          className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${
            isStreaming ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          <Plus className="h-3 w-3" />
          What if...
        </button>
      )}
    </div>
  )
}
