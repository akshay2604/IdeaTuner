import { contextBridge, ipcRenderer } from 'electron'
import type { IpcEvents } from '@shared/types'

const api = {
  // Decisions
  listDecisions: () => ipcRenderer.invoke('decisions:list'),
  getDecision: (id: string) => ipcRenderer.invoke('decisions:get', id),
  createDecision: (data: Record<string, unknown>) =>
    ipcRenderer.invoke('decisions:create', data),
  updateDecision: (id: string, data: Record<string, unknown>) =>
    ipcRenderer.invoke('decisions:update', id, data),
  deleteDecision: (id: string) => ipcRenderer.invoke('decisions:delete', id),
  searchDecisions: (query: string) => ipcRenderer.invoke('decisions:search', query),

  // Options
  createOption: (data: Record<string, unknown>) => ipcRenderer.invoke('options:create', data),
  updateOption: (id: string, data: Record<string, unknown>) =>
    ipcRenderer.invoke('options:update', id, data),
  deleteOption: (id: string) => ipcRenderer.invoke('options:delete', id),

  // Evidence
  createEvidence: (data: Record<string, unknown>) =>
    ipcRenderer.invoke('evidence:create', data),
  updateEvidence: (id: string, data: Record<string, unknown>) =>
    ipcRenderer.invoke('evidence:update', id, data),
  deleteEvidence: (id: string) => ipcRenderer.invoke('evidence:delete', id),

  // Assumptions
  createAssumption: (data: Record<string, unknown>) =>
    ipcRenderer.invoke('assumptions:create', data),
  updateAssumption: (id: string, data: Record<string, unknown>) =>
    ipcRenderer.invoke('assumptions:update', id, data),
  deleteAssumption: (id: string) => ipcRenderer.invoke('assumptions:delete', id),

  // Stakeholders
  createStakeholder: (data: Record<string, unknown>) =>
    ipcRenderer.invoke('stakeholders:create', data),
  updateStakeholder: (id: string, data: Record<string, unknown>) =>
    ipcRenderer.invoke('stakeholders:update', id, data),
  deleteStakeholder: (id: string) => ipcRenderer.invoke('stakeholders:delete', id),

  // AI
  sendAIMessage: (params: {
    decisionId: string
    message: string
    mode: string
    conversationId?: string
    images?: { data: string; mediaType: string; name: string }[]
  }) => ipcRenderer.invoke('ai:sendMessage', params),
  stopAIStream: () => ipcRenderer.invoke('ai:stopStream'),
  getAIConversation: (id: string) => ipcRenderer.invoke('ai:getConversation', id),
  getLatestConversation: (decisionId: string) =>
    ipcRenderer.invoke('ai:getLatestConversation', decisionId),
  listConversations: (decisionId: string) =>
    ipcRenderer.invoke('ai:listConversations', decisionId),
  createThread: (params: { decisionId: string; label: string; initialCanvas: unknown; mode: string }) =>
    ipcRenderer.invoke('ai:createThread', params),

  // Settings
  getApiKey: () => ipcRenderer.invoke('settings:getApiKey'),
  setApiKey: (key: string) => ipcRenderer.invoke('settings:setApiKey', key),
  removeApiKey: () => ipcRenderer.invoke('settings:removeApiKey'),
  validateApiKey: (key: string) => ipcRenderer.invoke('settings:validateApiKey', key),

  // Export
  exportMarkdown: (decisionId: string) => ipcRenderer.invoke('export:markdown', decisionId),

  // AI Stream events (main → renderer)
  onAIStreamStart: (callback: (data: IpcEvents['ai:stream:start']) => void) => {
    const listener = (_event: unknown, data: IpcEvents['ai:stream:start']) => callback(data)
    ipcRenderer.on('ai:stream:start', listener)
    return () => ipcRenderer.removeListener('ai:stream:start', listener)
  },
  onAIStreamDelta: (callback: (data: IpcEvents['ai:stream:delta']) => void) => {
    const listener = (_event: unknown, data: IpcEvents['ai:stream:delta']) => callback(data)
    ipcRenderer.on('ai:stream:delta', listener)
    return () => ipcRenderer.removeListener('ai:stream:delta', listener)
  },
  onAIStreamCanvas: (callback: (data: IpcEvents['ai:stream:canvas']) => void) => {
    const listener = (_event: unknown, data: IpcEvents['ai:stream:canvas']) => callback(data)
    ipcRenderer.on('ai:stream:canvas', listener)
    return () => ipcRenderer.removeListener('ai:stream:canvas', listener)
  },
  onAIStreamTitle: (callback: (data: IpcEvents['ai:stream:title']) => void) => {
    const listener = (_event: unknown, data: IpcEvents['ai:stream:title']) => callback(data)
    ipcRenderer.on('ai:stream:title', listener)
    return () => ipcRenderer.removeListener('ai:stream:title', listener)
  },
  onAIStreamEnd: (callback: (data: IpcEvents['ai:stream:end']) => void) => {
    const listener = (_event: unknown, data: IpcEvents['ai:stream:end']) => callback(data)
    ipcRenderer.on('ai:stream:end', listener)
    return () => ipcRenderer.removeListener('ai:stream:end', listener)
  },
  onAIStreamError: (callback: (data: IpcEvents['ai:stream:error']) => void) => {
    const listener = (_event: unknown, data: IpcEvents['ai:stream:error']) => callback(data)
    ipcRenderer.on('ai:stream:error', listener)
    return () => ipcRenderer.removeListener('ai:stream:error', listener)
  }
}

export type ElectronAPI = typeof api

contextBridge.exposeInMainWorld('api', api)
