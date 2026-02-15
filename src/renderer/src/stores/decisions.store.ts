import { create } from 'zustand'
import type { Decision, DecisionWithRelations } from '@shared/types'

interface DecisionsState {
  decisions: Decision[]
  currentDecision: DecisionWithRelations | null
  isLoading: boolean
  searchQuery: string

  // Actions
  fetchDecisions: () => Promise<void>
  fetchDecision: (id: string) => Promise<void>
  createDecision: (data?: Partial<Decision>) => Promise<Decision>
  updateDecision: (id: string, data: Partial<Decision>) => Promise<void>
  deleteDecision: (id: string) => Promise<void>
  setSearchQuery: (query: string) => void
  searchDecisions: (query: string) => Promise<void>
  refreshCurrentDecision: () => Promise<void>
}

export const useDecisionsStore = create<DecisionsState>((set, get) => ({
  decisions: [],
  currentDecision: null,
  isLoading: false,
  searchQuery: '',

  fetchDecisions: async () => {
    set({ isLoading: true })
    try {
      const decisions = await window.api.listDecisions()
      set({ decisions, isLoading: false })
    } catch (error) {
      console.error('Failed to fetch decisions:', error)
      set({ isLoading: false })
    }
  },

  fetchDecision: async (id: string) => {
    set({ isLoading: true })
    try {
      const decision = await window.api.getDecision(id)
      set({ currentDecision: decision, isLoading: false })
    } catch (error) {
      console.error('Failed to fetch decision:', error)
      set({ isLoading: false })
    }
  },

  createDecision: async (data?: Partial<Decision>) => {
    const decision = await window.api.createDecision(data || {})
    const { decisions } = get()
    set({ decisions: [decision, ...decisions] })
    return decision
  },

  updateDecision: async (id: string, data: Partial<Decision>) => {
    await window.api.updateDecision(id, data)
    // Refresh current decision if it's the one being edited
    const { currentDecision } = get()
    if (currentDecision?.id === id) {
      const updated = await window.api.getDecision(id)
      set({ currentDecision: updated })
    }
    // Also refresh the list
    const decisions = await window.api.listDecisions()
    set({ decisions })
  },

  deleteDecision: async (id: string) => {
    await window.api.deleteDecision(id)
    const { decisions, currentDecision } = get()
    set({
      decisions: decisions.filter((d) => d.id !== id),
      currentDecision: currentDecision?.id === id ? null : currentDecision
    })
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  searchDecisions: async (query: string) => {
    set({ isLoading: true, searchQuery: query })
    try {
      const decisions = query
        ? await window.api.searchDecisions(query)
        : await window.api.listDecisions()
      set({ decisions, isLoading: false })
    } catch (error) {
      console.error('Search failed:', error)
      set({ isLoading: false })
    }
  },

  refreshCurrentDecision: async () => {
    const { currentDecision } = get()
    if (currentDecision) {
      const updated = await window.api.getDecision(currentDecision.id)
      const decisions = await window.api.listDecisions()
      set({ currentDecision: updated, decisions })
    }
  }
}))
