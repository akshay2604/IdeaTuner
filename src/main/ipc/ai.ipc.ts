import { ipcMain } from 'electron'
import { eq, desc, asc } from 'drizzle-orm'
import { getAIClient, validateApiKey } from '../ai/client'
import { createStreamHandler } from '../ai/stream-handler'
import { getBrainstormPrompt } from '../ai/prompts/brainstorm'
import { getTunerPrompt } from '../ai/prompts/tuner'
import { getDecision } from '../services/decision.service'
import { getDb } from '../database/connection'
import { randomId } from '../services/utils'
import * as schema from '@shared/schema'
import type {
  AIMode,
  AIMessage,
  ImageAttachment,
  IdeaCanvas
} from '@shared/types'

let activeAbortController: AbortController | null = null

export function registerAIHandlers(): void {
  ipcMain.handle(
    'ai:sendMessage',
    async (
      _event,
      params: {
        decisionId: string
        message: string
        mode: AIMode
        conversationId?: string
        images?: ImageAttachment[]
      }
    ) => {
      const { decisionId, message, mode, conversationId: existingConvId, images } = params
      const decision = getDecision(decisionId)
      if (!decision) throw new Error('Decision not found')

      const window = global.mainWindow
      if (!window) throw new Error('No window available')

      // Get or create conversation
      const db = getDb()
      let conversationId = existingConvId
      let previousMessages: AIMessage[] = []
      let existingCanvas: IdeaCanvas | null = null

      if (conversationId) {
        const conv = db
          .select()
          .from(schema.aiConversations)
          .where(eq(schema.aiConversations.id, conversationId))
          .get()
        if (conv) {
          previousMessages = JSON.parse(conv.messages as string) || []
          if (conv.canvasState) {
            try {
              existingCanvas = JSON.parse(conv.canvasState as string)
            } catch {
              // ignore parse errors
            }
          }
        }
      } else {
        conversationId = randomId()
        db.insert(schema.aiConversations)
          .values({
            id: conversationId,
            decisionId,
            mode,
            messages: '[]',
            extractedInsights: '[]'
          })
          .run()
      }

      // Build system prompt based on mode
      const phase = (decision.phase as string) === 'structured' ? 'shaping' : (decision.phase ?? 'spark')
      let systemPrompt: string
      switch (mode) {
        case 'brainstorm':
          systemPrompt = getBrainstormPrompt(decision)
          break
        case 'tuner':
        default:
          systemPrompt = getTunerPrompt(decision, phase as 'spark' | 'shaping', existingCanvas)
      }

      // Build message history with image content blocks
      const apiMessages = previousMessages.map((m) => {
        if (m.images && m.images.length > 0) {
          return {
            role: m.role as 'user' | 'assistant',
            content: [
              ...m.images.map((img) => ({
                type: 'image' as const,
                source: {
                  type: 'base64' as const,
                  media_type: img.mediaType,
                  data: img.data
                }
              })),
              { type: 'text' as const, text: m.content || 'What do you see in this image?' }
            ]
          }
        }
        return {
          role: m.role as 'user' | 'assistant',
          content: m.content || ''
        }
      })

      // Build current user message
      if (images && images.length > 0) {
        apiMessages.push({
          role: 'user',
          content: [
            ...images.map((img) => ({
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: img.mediaType,
                data: img.data
              }
            })),
            { type: 'text' as const, text: message || 'What do you see in this image?' }
          ]
        })
      } else {
        apiMessages.push({ role: 'user', content: message || '' })
      }

      // Set up streaming
      const handler = createStreamHandler({ conversationId, window, decisionId })
      handler.onStart()

      try {
        const client = getAIClient()
        activeAbortController = new AbortController()

        const stream = client.messages.stream(
          {
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 4096,
            system: systemPrompt,
            messages: apiMessages
          },
          { signal: activeAbortController.signal }
        )

        for await (const event of stream) {
          if (event.type === 'content_block_delta') {
            const delta = event.delta as { type: string; text?: string }
            if (delta.type === 'text_delta' && delta.text) {
              handler.onDelta(delta.text)
            }
          }
        }

        handler.onEnd()

        // Save messages and canvas
        const userMsg: AIMessage = {
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
          ...(images && images.length > 0 ? { images } : {})
        }
        const assistantMsg: AIMessage = {
          role: 'assistant',
          content: handler.getFullContent(),
          timestamp: new Date().toISOString()
        }

        const allMessages = [...previousMessages, userMsg, assistantMsg]

        // Use new canvas if emitted, otherwise keep existing
        const finalCanvas = handler.getCanvas() || existingCanvas

        db.update(schema.aiConversations)
          .set({
            messages: JSON.stringify(allMessages),
            canvasState: finalCanvas ? JSON.stringify(finalCanvas) : null,
            updatedAt: new Date().toISOString()
          })
          .where(eq(schema.aiConversations.id, conversationId))
          .run()
      } catch (error: unknown) {
        const err = error as { name?: string; message?: string }
        if (err.name === 'AbortError') {
          handler.onEnd()
        } else {
          handler.onError(err.message || 'Unknown error')
        }
      } finally {
        activeAbortController = null
      }

      return { conversationId }
    }
  )

  ipcMain.handle('ai:stopStream', async () => {
    if (activeAbortController) {
      activeAbortController.abort()
      activeAbortController = null
    }
  })

  ipcMain.handle('ai:getConversation', (_event, id: string) => {
    const db = getDb()
    const conv = db
      .select()
      .from(schema.aiConversations)
      .where(eq(schema.aiConversations.id, id))
      .get()
    if (!conv) return null
    return {
      ...conv,
      messages: JSON.parse(conv.messages as string),
      canvasState: conv.canvasState ? JSON.parse(conv.canvasState as string) : null,
      label: conv.label ?? null,
      parentConversationId: conv.parentConversationId ?? null
    }
  })

  ipcMain.handle('ai:getLatestConversation', (_event, decisionId: string) => {
    const db = getDb()
    const conv = db
      .select()
      .from(schema.aiConversations)
      .where(eq(schema.aiConversations.decisionId, decisionId))
      .orderBy(desc(schema.aiConversations.updatedAt))
      .limit(1)
      .get()
    if (!conv) return null
    return {
      ...conv,
      messages: JSON.parse(conv.messages as string),
      canvasState: conv.canvasState ? JSON.parse(conv.canvasState as string) : null,
      label: conv.label ?? null,
      parentConversationId: conv.parentConversationId ?? null
    }
  })

  // ---- Thread handlers ----

  ipcMain.handle('ai:listConversations', (_event, decisionId: string) => {
    const db = getDb()
    const rows = db
      .select({
        id: schema.aiConversations.id,
        label: schema.aiConversations.label,
        updatedAt: schema.aiConversations.updatedAt
      })
      .from(schema.aiConversations)
      .where(eq(schema.aiConversations.decisionId, decisionId))
      .orderBy(asc(schema.aiConversations.createdAt))
      .all()
    return rows.map((r) => ({
      id: r.id,
      label: r.label ?? null,
      updatedAt: r.updatedAt
    }))
  })

  ipcMain.handle(
    'ai:createThread',
    (
      _event,
      params: {
        decisionId: string
        label: string
        initialCanvas: IdeaCanvas | null
        mode: AIMode
      }
    ) => {
      const db = getDb()
      const id = randomId()
      const now = new Date().toISOString()

      // Find the main (first) conversation to use as parent
      const mainConv = db
        .select({ id: schema.aiConversations.id })
        .from(schema.aiConversations)
        .where(eq(schema.aiConversations.decisionId, params.decisionId))
        .orderBy(asc(schema.aiConversations.createdAt))
        .limit(1)
        .get()

      const row = {
        id,
        decisionId: params.decisionId,
        mode: params.mode,
        messages: '[]',
        extractedInsights: '[]',
        canvasState: params.initialCanvas ? JSON.stringify(params.initialCanvas) : null,
        createdAt: now,
        updatedAt: now,
        label: params.label,
        parentConversationId: mainConv?.id ?? null
      }

      db.insert(schema.aiConversations).values(row).run()

      return {
        id,
        decisionId: params.decisionId,
        mode: params.mode,
        messages: [],
        canvasState: params.initialCanvas,
        createdAt: now,
        updatedAt: now,
        label: params.label,
        parentConversationId: mainConv?.id ?? null
      }
    }
  )

  ipcMain.handle('settings:validateApiKey', async (_event, key: string) => {
    return validateApiKey(key)
  })
}
