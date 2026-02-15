import { BrowserWindow } from 'electron'
import type { IdeaCanvas } from '@shared/types'
import { updateDecision } from '../services/decision.service'

const CANVAS_REGEX = /\[CANVAS\]([\s\S]*?)\[\/CANVAS\]/g
const TITLE_REGEX = /\[TITLE\]([\s\S]*?)\[\/TITLE\]/g

export interface StreamHandlerOptions {
  conversationId: string
  window: BrowserWindow
  decisionId?: string
}

export function createStreamHandler({ conversationId, window, decisionId }: StreamHandlerOptions) {
  let fullContent = ''
  let lastCanvasParsedIndex = 0
  let lastTitleParsedIndex = 0
  let currentCanvas: IdeaCanvas | null = null

  function onDelta(text: string): void {
    fullContent += text
    window.webContents.send('ai:stream:delta', { conversationId, content: text })

    parseCanvas()
    parseTitles()
  }

  function onStart(): void {
    window.webContents.send('ai:stream:start', { conversationId })
  }

  function onEnd(): void {
    parseCanvas()
    window.webContents.send('ai:stream:end', { conversationId })
  }

  function onError(error: string): void {
    window.webContents.send('ai:stream:error', { conversationId, error })
  }

  function parseCanvas(): void {
    const searchContent = fullContent.slice(lastCanvasParsedIndex)
    let match: RegExpExecArray | null

    const regex = new RegExp(CANVAS_REGEX.source, 'g')
    while ((match = regex.exec(searchContent)) !== null) {
      try {
        const parsed = JSON.parse(match[1].trim()) as IdeaCanvas
        currentCanvas = parsed
        window.webContents.send('ai:stream:canvas', { conversationId, canvas: parsed })
      } catch {
        // JSON parse failed — keep previous canvas state
      }
      lastCanvasParsedIndex += match.index + match[0].length
    }
  }

  function parseTitles(): void {
    if (!decisionId) return

    const searchContent = fullContent.slice(lastTitleParsedIndex)
    let match: RegExpExecArray | null

    const regex = new RegExp(TITLE_REGEX.source, 'g')
    while ((match = regex.exec(searchContent)) !== null) {
      const title = match[1].trim()
      if (title) {
        updateDecision(decisionId, { title } as never)
        window.webContents.send('ai:stream:title', { conversationId, title })
      }
      lastTitleParsedIndex += match.index + match[0].length
    }
  }

  function getFullContent(): string {
    return fullContent
  }

  function getCanvas(): IdeaCanvas | null {
    return currentCanvas
  }

  return { onDelta, onStart, onEnd, onError, getFullContent, getCanvas }
}
