import { invoke } from '@tauri-apps/api/core'
import type {
  Decision,
  DecisionWithRelations,
  Option,
  Evidence,
  Assumption,
  Stakeholder,
  AIConversation,
  ThreadSummary,
  AIMode,
  IdeaCanvas,
  AIMessage
} from '@shared/types'

// ---- Decisions ----

export const listDecisions = () => invoke<Decision[]>('list_decisions')

export const getDecision = (id: string) =>
  invoke<DecisionWithRelations | null>('get_decision', { id })

export const createDecision = (data: Partial<Decision> = {}) =>
  invoke<Decision>('create_decision', { data })

export const updateDecision = (id: string, data: Partial<Decision>) =>
  invoke<Decision>('update_decision', { id, data })

export const deleteDecision = (id: string) => invoke<void>('delete_decision', { id })

export const searchDecisions = (query: string) =>
  invoke<Decision[]>('search_decisions', { query })

// ---- Options ----

export const createOption = (data: Partial<Option>) =>
  invoke<Option>('create_option', { data })

export const updateOption = (id: string, data: Partial<Option>) =>
  invoke<Option>('update_option', { id, data })

export const deleteOption = (id: string) => invoke<void>('delete_option', { id })

// ---- Evidence ----

export const createEvidence = (data: Partial<Evidence>) =>
  invoke<Evidence>('create_evidence', { data })

export const updateEvidence = (id: string, data: Partial<Evidence>) =>
  invoke<Evidence>('update_evidence', { id, data })

export const deleteEvidence = (id: string) => invoke<void>('delete_evidence', { id })

// ---- Assumptions ----

export const createAssumption = (data: Partial<Assumption>) =>
  invoke<Assumption>('create_assumption', { data })

export const updateAssumption = (id: string, data: Partial<Assumption>) =>
  invoke<Assumption>('update_assumption', { id, data })

export const deleteAssumption = (id: string) => invoke<void>('delete_assumption', { id })

// ---- Stakeholders ----

export const createStakeholder = (data: Partial<Stakeholder>) =>
  invoke<Stakeholder>('create_stakeholder', { data })

export const updateStakeholder = (id: string, data: Partial<Stakeholder>) =>
  invoke<Stakeholder>('update_stakeholder', { id, data })

export const deleteStakeholder = (id: string) => invoke<void>('delete_stakeholder', { id })

// ---- AI Conversations ----

export const getConversation = (id: string) =>
  invoke<AIConversation | null>('get_conversation', { id })

export const getLatestConversation = (decisionId: string) =>
  invoke<AIConversation | null>('get_latest_conversation', { decisionId })

export const listConversations = (decisionId: string) =>
  invoke<ThreadSummary[]>('list_conversations', { decisionId })

export const createConversation = (decisionId: string, mode: string) =>
  invoke<AIConversation>('create_conversation', { decisionId, mode })

export const createThread = (params: {
  decisionId: string
  label: string
  initialCanvas: IdeaCanvas | null
  mode: AIMode
}) => invoke<AIConversation>('create_thread', { input: params })

export const saveConversationMessages = (
  conversationId: string,
  messages: AIMessage[],
  canvasState: IdeaCanvas | null
) =>
  invoke<void>('save_conversation_messages', {
    input: { conversationId, messages, canvasState }
  })

// ---- Settings ----

export const getApiKey = () => invoke<string | null>('get_api_key')

export const getApiKeyRaw = () => invoke<string | null>('get_api_key_raw')

export const setApiKey = (key: string) => invoke<void>('set_api_key', { key })

export const removeApiKey = () => invoke<void>('remove_api_key')

// ---- Export ----

export const exportMarkdown = (decisionId: string) =>
  invoke<string>('export_markdown', { decisionId })
