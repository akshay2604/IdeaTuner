import { useRef, useEffect, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BrainCircuit, Copy, Check } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { AIMessage } from '@shared/types'

interface ChatMessagesProps {
  messages: AIMessage[]
  isStreaming: boolean
  streamingContent: string
  error: string | null
  emptyStateMessage: string
}

export function ChatMessages({
  messages,
  isStreaming,
  streamingContent,
  error,
  emptyStateMessage
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  return (
    <ScrollArea className="flex-1">
      <div className="px-6 py-3 space-y-3">
        {messages.length === 0 && !isStreaming && (
          <div className="text-center py-6 text-muted-foreground space-y-4">
            <BrainCircuit className="h-8 w-8 mx-auto opacity-50" />
            <p className="text-sm">{emptyStateMessage}</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'group/msg relative rounded-lg px-3 py-2 text-sm leading-relaxed',
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground ml-8'
                : 'bg-background border mr-4'
            )}
          >
            <CopyButton
              text={cleanTags(msg.content)}
              variant={msg.role === 'user' ? 'light' : 'default'}
            />
            {msg.role === 'user' ? (
              <div>
                {msg.images && msg.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {msg.images.map((img, imgIdx) => (
                      <img
                        key={imgIdx}
                        src={`data:${img.mediaType};base64,${img.data}`}
                        alt={img.name}
                        className="max-h-40 max-w-[200px] rounded object-contain"
                      />
                    ))}
                  </div>
                )}
                {msg.content && (
                  <div className="whitespace-pre-wrap">{cleanTags(msg.content)}</div>
                )}
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-headings:text-foreground prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {cleanTags(msg.content)}
                </ReactMarkdown>
              </div>
            )}
          </div>
        ))}

        {isStreaming && streamingContent && (
          <div className="bg-background border rounded-lg px-3 py-2 text-sm leading-relaxed mr-4">
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-headings:text-foreground prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {cleanTags(streamingContent)}
              </ReactMarkdown>
            </div>
            <span className="inline-block w-1.5 h-4 bg-ai-accent animate-pulse ml-0.5" />
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  )
}

function CopyButton({ text, variant = 'default' }: { text: string; variant?: 'default' | 'light' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [text])

  const Icon = copied ? Check : Copy

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'absolute top-1.5 right-1.5 p-1 rounded opacity-0 group-hover/msg:opacity-100 transition-opacity cursor-pointer',
        variant === 'light'
          ? 'hover:bg-white/20 text-primary-foreground'
          : 'hover:bg-muted text-muted-foreground'
      )}
      title="Copy message"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  )
}

function cleanTags(content: string): string {
  return content
    .replace(/\[CANVAS\][\s\S]*?\[\/CANVAS\]/g, '')
    .replace(/\[TITLE\][\s\S]*?\[\/TITLE\]/g, '')
    .trim()
}
