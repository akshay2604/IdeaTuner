import { create } from 'zustand'
import type { AIMode, AIMessage, IdeaCanvas, ImageAttachment, ThreadSummary } from '@shared/types'
import { useDecisionsStore } from './decisions.store'

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
  stopStream: () => Promise<void>
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
    const { mode, conversationId, messages } = get()

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
      const result = await window.api.sendAIMessage({
        decisionId,
        message,
        mode,
        conversationId: conversationId || undefined,
        ...(images && images.length > 0 ? { images } : {})
      })
      set({ conversationId: result.conversationId })

      // Refresh threads list (updates updatedAt ordering)
      const threads = await window.api.listConversations(decisionId)
      set({ threads })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to send message',
        isStreaming: false
      })
    }
  },

  stopStream: async () => {
    await window.api.stopAIStream()
    set({ isStreaming: false })
  },

  loadConversation: async (conversationId: string) => {
    const conv = await window.api.getAIConversation(conversationId)
    if (conv) {
      set({
        conversationId,
        messages: conv.messages,
        mode: conv.mode as AIMode,
        canvas: conv.canvasState || null
      })
    }
  },

  loadLatestConversation: async (decisionId: string) => {
    try {
      const conv = await window.api.getLatestConversation(decisionId)
      if (conv && conv.messages.length > 0) {
        set({
          conversationId: conv.id,
          messages: conv.messages,
          mode: conv.mode as AIMode,
          canvas: conv.canvasState || null,
          streamingContent: '',
          error: null
        })
      } else {
        get().clearConversation()
      }

      // Also load threads
      const threads = await window.api.listConversations(decisionId)
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
    const threads = await window.api.listConversations(decisionId)
    set({ threads })
  },

  switchThread: async (conversationId: string) => {
    const conv = await window.api.getAIConversation(conversationId)
    if (conv) {
      set({
        conversationId,
        messages: conv.messages,
        mode: conv.mode as AIMode,
        canvas: conv.canvasState || null,
        streamingContent: '',
        error: null
      })
    }
  },

  createThread: async (decisionId: string, label: string) => {
    const { canvas, mode } = get()

    const conv = await window.api.createThread({
      decisionId,
      label,
      initialCanvas: canvas,
      mode
    })

    // Append to threads and switch
    set((state) => ({
      threads: [...state.threads, { id: conv.id, label: conv.label, updatedAt: conv.updatedAt }],
      conversationId: conv.id,
      messages: [],
      canvas: conv.canvasState || canvas,
      streamingContent: '',
      error: null
    }))

    return conv.id
  }
}))

// Set up IPC event listeners for streaming
export function initAIStreamListeners(): () => void {
  const unsubStart = window.api.onAIStreamStart(() => {
    useAIStore.setState({ isStreaming: true, streamingContent: '' })
  })

  const unsubDelta = window.api.onAIStreamDelta(({ content }) => {
    useAIStore.setState((state) => ({
      streamingContent: state.streamingContent + content
    }))
  })

  const unsubCanvas = window.api.onAIStreamCanvas(({ canvas }) => {
    useAIStore.setState({ canvas })
  })

  const unsubTitle = window.api.onAIStreamTitle(() => {
    // Title was updated in DB by the main process; trigger a decision refresh
    useDecisionsStore.getState().refreshCurrentDecision()
  })

  const unsubEnd = window.api.onAIStreamEnd(() => {
    const state = useAIStore.getState()
    if (state.streamingContent) {
      const assistantMsg: AIMessage = {
        role: 'assistant',
        content: state.streamingContent,
        timestamp: new Date().toISOString()
      }
      useAIStore.setState((s) => ({
        messages: [...s.messages, assistantMsg],
        isStreaming: false,
        streamingContent: ''
      }))
    } else {
      useAIStore.setState({ isStreaming: false })
    }
  })

  const unsubError = window.api.onAIStreamError(({ error }) => {
    useAIStore.setState({ error, isStreaming: false, streamingContent: '' })
  })

  return () => {
    unsubStart()
    unsubDelta()
    unsubCanvas()
    unsubTitle()
    unsubEnd()
    unsubError()
  }
}
