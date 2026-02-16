import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, StopCircle, Paperclip, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatMessages } from './ChatMessages'
import { useAIStore } from '@/stores/ai.store'
import { useImageAttachments } from '@/hooks/useImageAttachments'

interface TunerChatProps {
  decisionId: string
}

export function TunerChat({ decisionId }: TunerChatProps) {
  const [input, setInput] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    pendingImages,
    imageError,
    addImageFromFile,
    addImageFromClipboard,
    addImagesFromDataTransfer,
    removeImage,
    clearImages
  } = useImageAttachments()

  const {
    messages,
    isStreaming,
    streamingContent,
    error,
    sendMessage,
    stopStream
  } = useAIStore()

  const handleSend = async () => {
    const msg = input.trim()
    if ((!msg && pendingImages.length === 0) || isStreaming) return
    const images = pendingImages.length > 0 ? [...pendingImages] : undefined
    setInput('')
    clearImages()
    await sendMessage(decisionId, msg, images)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    if (addImageFromClipboard(e.clipboardData)) {
      e.preventDefault()
    }
  }

  const dragCounterRef = useRef(0)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current++
    if (dragCounterRef.current === 1) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = () => {
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragOver(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current = 0
    setIsDragOver(false)
    addImagesFromDataTransfer(e.dataTransfer)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    for (const file of Array.from(files)) {
      addImageFromFile(file)
    }
    e.target.value = ''
  }

  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }, [])

  useEffect(() => {
    autoResize()
  }, [input, autoResize])

  return (
    <div
      className={`flex flex-col h-full relative ${isDragOver ? 'ring-2 ring-primary/30 ring-inset' : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/5 pointer-events-none">
          <div className="text-sm font-medium text-primary/70">Drop image here</div>
        </div>
      )}
      <ChatMessages
        messages={messages}
        isStreaming={isStreaming}
        streamingContent={streamingContent}
        error={error}
        emptyStateMessage="What are you thinking about? Start typing to explore your idea."
      />

      {/* Input */}
      <div className="p-3 border-t shrink-0">
        <div className="max-w-3xl mx-auto space-y-2">
          {pendingImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pendingImages.map((img, idx) => (
                <div key={idx} className="relative group/img">
                  <img
                    src={`data:${img.mediaType};base64,${img.data}`}
                    alt={img.name}
                    className="h-16 w-16 rounded object-cover border"
                  />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {imageError && (
            <p className="text-xs text-destructive">{imageError}</p>
          )}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-9 w-9"
              onClick={() => fileInputRef.current?.click()}
              title="Attach image"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="What's on your mind?"
              className="flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              rows={1}
              style={{ height: 'auto', maxHeight: 140 }}
            />
            {isStreaming ? (
              <Button variant="outline" size="icon" onClick={stopStream} className="shrink-0">
                <StopCircle className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() && pendingImages.length === 0}
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
