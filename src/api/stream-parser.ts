import type { IdeaCanvas } from '@shared/types'

const CANVAS_REGEX = /\[CANVAS\]([\s\S]*?)\[\/CANVAS\]/g
const TITLE_REGEX = /\[TITLE\]([\s\S]*?)\[\/TITLE\]/g

export interface StreamParserCallbacks {
  onCanvas?: (canvas: IdeaCanvas) => void
  onTitle?: (title: string) => void
}

export function createStreamParser(callbacks: StreamParserCallbacks) {
  let fullContent = ''
  let lastCanvasParsedIndex = 0
  let lastTitleParsedIndex = 0
  let currentCanvas: IdeaCanvas | null = null

  function addDelta(text: string): void {
    fullContent += text
    parseCanvas()
    parseTitles()
  }

  function parseCanvas(): void {
    const searchContent = fullContent.slice(lastCanvasParsedIndex)
    const regex = new RegExp(CANVAS_REGEX.source, 'g')
    let match: RegExpExecArray | null

    while ((match = regex.exec(searchContent)) !== null) {
      try {
        const parsed = JSON.parse(match[1].trim()) as IdeaCanvas
        currentCanvas = parsed
        callbacks.onCanvas?.(parsed)
      } catch {
        // JSON parse failed — keep previous canvas state
      }
      lastCanvasParsedIndex += match.index + match[0].length
    }
  }

  function parseTitles(): void {
    const searchContent = fullContent.slice(lastTitleParsedIndex)
    const regex = new RegExp(TITLE_REGEX.source, 'g')
    let match: RegExpExecArray | null

    while ((match = regex.exec(searchContent)) !== null) {
      const title = match[1].trim()
      if (title) {
        callbacks.onTitle?.(title)
      }
      lastTitleParsedIndex += match.index + match[0].length
    }
  }

  function finalize(): void {
    parseCanvas()
    parseTitles()
  }

  function getFullContent(): string {
    return fullContent
  }

  function getCanvas(): IdeaCanvas | null {
    return currentCanvas
  }

  return { addDelta, finalize, getFullContent, getCanvas }
}
