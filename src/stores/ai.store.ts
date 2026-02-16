import { create } from 'zustand'
import type { AIMode, AIMessage, IdeaCanvas, ImageAttachment, ThreadSummary } from '@shared/types'
import * as commands from '@/api/commands'
import { getAIClient } from '@/api/ai-client'
import { createStreamParser } from '@/api/stream-parser'
import { getTunerPrompt } from '@/api/prompts/tuner'
import { getBrainstormPrompt } from '@/api/prompts/brainstorm'
import { useDecisionsStore } from './decisions.store'

// Module-level abort controller for stream cancellation
let activeAbortController: AbortController | null = null

interface AIState {
  mode: AIMode
  conversationId: string | null
  messages: AIMessage[]
  canvas: IdeaCanvas | null
  isStreaming: boolean
  streamingContent: string
  error: string | null
  threads: ThreadSummary[]

  // Actions
  setMode: (mode: AIMode) => void
  sendMessage: (decisionId: string, message: string, images?: ImageAttachment[]) => Promise<void>
  stopStream: () => void
  loadConversation: (conversationId: string) => Promise<void>
  loadLatestConversation: (decisionId: string) => Promise<void>
  clearConversation: () => void
  setError: (error: string | null) => void
  loadThreads: (decisionId: string) => Promise<void>
  switchThread: (conversationId: string) => Promise<void>
  createThread: (decisionId: string, label: string) => Promise<string>
}

export const useAIStore = create<AIState>((set, get) => ({
  mode: 'tuner',
  conversationId: null,
  messages: [],
  canvas: null,
  isStreaming: false,
  streamingContent: '',
  error: null,
  threads: [],

  setMode: (mode) => set({ mode }),

  sendMessage: async (decisionId: string, message: string, images?: ImageAttachment[]) => {
    const { mode, conversationId: existingConvId, messages, canvas: existingCanvas } = get()

    // Add user message to local state immediately
    const userMsg: AIMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      ...(images && images.length > 0 ? { images } : {})
    }
    set({
      messages: [...messages, userMsg],
      isStreaming: true,
      streamingContent: '',
      error: null
    })

    try {
      // Get or create conversation
      let conversationId = existingConvId
      const previousMessages = messages // messages before we added userMsg

      if (!conversationId) {
        const conv = await commands.createConversation(decisionId, mode)
        conversationId = conv.id
        set({ conversationId })
      }

      // Get the decision for prompt building
      const decision = await commands.getDecision(decisionId)
      if (!decision) throw new Error('Decision not found')

      // Build system prompt based on mode
      const phase =
        (decision.phase as string) === 'structured'
          ? 'shaping'
          : ((decision.phase ?? 'spark') as 'spark' | 'shaping')
      let systemPrompt: string
      switch (mode) {
        case 'brainstorm':
          systemPrompt = getBrainstormPrompt(decision)
          break
        case 'tuner':
        default:
          systemPrompt = getTunerPrompt(decision, phase, existingCanvas)
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

      // Add current user message
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

      // Set up stream parser
      const parser = createStreamParser({
        onCanvas: (canvas) => {
          set({ canvas })
        },
        onTitle: (title) => {
          // Title was updated — trigger a decision update + refresh
          commands.updateDecision(decisionId, { title } as never).then(() => {
            useDecisionsStore.getState().refreshCurrentDecision()
          })
        }
      })

      // Create AI client and stream
      const client = await getAIClient()
      activeAbortController = new AbortController()

      const stream = client.messages.stream(
        {
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          system: systemPrompt,
          messages: apiMessages as never
        },
        { signal: activeAbortController.signal }
      )

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const delta = event.delta as { type: string; text?: string }
          if (delta.type === 'text_delta' && delta.text) {
            parser.addDelta(delta.text)
            set((state) => ({
              streamingContent: state.streamingContent + delta.text!
            }))
          }
        }
      }

      // Finalize parsing
      parser.finalize()

      // Build assistant message
      const assistantMsg: AIMessage = {
        role: 'assistant',
        content: parser.getFullContent(),
        timestamp: new Date().toISOString()
      }

      const allMessages = [...messages, userMsg, assistantMsg]

      set({
        messages: allMessages,
        isStreaming: false,
        streamingContent: ''
      })

      // Use new canvas if emitted, otherwise keep existing
      const finalCanvas = parser.getCanvas() || existingCanvas

      // Persist to database
      await commands.saveConversationMessages(conversationId, allMessages, finalCanvas)

      // Refresh threads list
      const threads = await commands.listConversations(decisionId)
      set({ threads })
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string }
      if (err.name === 'AbortError') {
        // Stream was cancelled
        const { streamingContent } = get()
        if (streamingContent) {
          const assistantMsg: AIMessage = {
            role: 'assistant',
            content: streamingContent,
            timestamp: new Date().toISOString()
          }
          set((state) => ({
            messages: [...state.messages, assistantMsg],
            isStreaming: false,
            streamingContent: ''
          }))
        } else {
          set({ isStreaming: false })
        }
      } else {
        set({
          error: err.message || 'Failed to send message',
          isStreaming: false,
          streamingContent: ''
        })
      }
    } finally {
      activeAbortController = null
    }
  },

  stopStream: () => {
    if (activeAbortController) {
      activeAbortController.abort()
      activeAbortController = null
    }
    set({ isStreaming: false })
  },

  loadConversation: async (conversationId: string) => {
    const conv = await commands.getConversation(conversationId)
    if (conv) {
      set({
        conversationId,
        messages: conv.messages as AIMessage[],
        mode: conv.mode as AIMode,
        canvas: conv.canvasState as IdeaCanvas | null
      })
    }
  },

  loadLatestConversation: async (decisionId: string) => {
    try {
      const conv = await commands.getLatestConversation(decisionId)
      if (conv && (conv.messages as AIMessage[]).length > 0) {
        set({
          conversationId: conv.id,
          messages: conv.messages as AIMessage[],
          mode: conv.mode as AIMode,
          canvas: conv.canvasState as IdeaCanvas | null,
          streamingContent: '',
          error: null
        })
      } else {
        get().clearConversation()
      }

      // Also load threads
      const threads = await commands.listConversations(decisionId)
      set({ threads })
    } catch {
      get().clearConversation()
    }
  },

  clearConversation: () =>
    set({
      conversationId: null,
      messages: [],
      canvas: null,
      streamingContent: '',
      error: null,
      threads: []
    }),

  setError: (error) => set({ error }),

  loadThreads: async (decisionId: string) => {
    const threads = await commands.listConversations(decisionId)
    set({ threads })
  },

  switchThread: async (conversationId: string) => {
    const conv = await commands.getConversation(conversationId)
    if (conv) {
      set({
        conversationId,
        messages: conv.messages as AIMessage[],
        mode: conv.mode as AIMode,
        canvas: conv.canvasState as IdeaCanvas | null,
        streamingContent: '',
        error: null
      })
    }
  },

  createThread: async (decisionId: string, label: string) => {
    const { canvas, mode } = get()

    const conv = await commands.createThread({
      decisionId,
      label,
      initialCanvas: canvas,
      mode
    })

    // Append to threads and switch
    set((state) => ({
      threads: [
        ...state.threads,
        { id: conv.id, label: conv.label, updatedAt: conv.updatedAt }
      ],
      conversationId: conv.id,
      messages: [],
      canvas: (conv.canvasState as IdeaCanvas | null) || canvas,
      streamingContent: '',
      error: null
    }))

    return conv.id
  }
}))
